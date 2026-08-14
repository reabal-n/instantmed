-- Make the review-request funnel reconstructable at one bounded point in time.
--
-- Every eligible intake lands in exactly one primary lifecycle bucket. Delivery
-- and traversal remain sent-only submetrics. The function returns counts only:
-- no patient, request, recipient, or click-capability data leaves Postgres.

create index if not exists idx_email_outbox_review_request_patient_active
  on public.email_outbox (patient_id, created_at, id)
  where email_type = 'review_request'
    and status in ('pending', 'sending', 'sent')
    and patient_id is not null;

create index if not exists idx_intakes_review_request_patient_sent
  on public.intakes (patient_id, review_email_sent_at)
  where review_email_sent_at is not null;

drop function if exists public.get_review_request_funnel(
  timestamptz,
  timestamptz,
  uuid[]
);

create or replace function public.get_review_request_funnel(
  p_window_start timestamptz,
  p_as_of timestamptz,
  p_excluded_patient_ids uuid[]
)
returns table (
  eligible bigint,
  sent bigint,
  delivered bigint,
  trackable_sent bigint,
  unique_redirect_traversals bigint,
  awaiting_next_run bigint,
  cooldown_deferred bigint,
  policy_suppressed bigint,
  legacy_handled_unverifiable bigint,
  actionable_backlog bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  with requested_bounds as (
    select
      p_as_of as as_of,
      p_as_of at time zone 'Australia/Sydney' as local_as_of
    where p_window_start is not null
      and p_as_of is not null
      and p_window_start <= p_as_of
      and p_window_start >= p_as_of - interval '90 days'
      and p_excluded_patient_ids is not null
  ),
  bounds as (
    select
      requested_bounds.as_of,
      -- 20260719090000 introduced the split sent/suppressed lifecycle. A sent
      -- marker after that cutover without durable sent outbox proof is an
      -- invariant breach, not historical evidence we are allowed to excuse.
      timestamptz '2026-07-19 09:00:00+00' as lifecycle_cutover_at,
      (
        case
          when requested_bounds.local_as_of::time >= time '10:00'
            then date_trunc('day', requested_bounds.local_as_of)
              + interval '10 hours'
          else date_trunc('day', requested_bounds.local_as_of)
              - interval '1 day'
              + interval '10 hours'
        end
      ) at time zone 'Australia/Sydney' as latest_scheduled_run_at
    from requested_bounds
  ),
  eligibility as (
    select
      intake.id as intake_id,
      intake.patient_id,
      intake.review_email_sent_at,
      intake.review_email_suppressed_at,
      case
        when intake.category = 'medical_certificate'
          then intake.document_sent_at + interval '48 hours'
        when intake.category in ('prescription', 'consult')
          then intake.script_sent_at + interval '48 hours'
        else null
      end as eligibility_at
    from public.intakes as intake
    where intake.status in ('approved', 'completed')
      and intake.payment_status = 'paid'
      and intake.exclude_from_reporting is distinct from true
      and intake.patient_id <> all(p_excluded_patient_ids)
  ),
  eligible_cohort as (
    select eligibility.*
    from eligibility
    cross join bounds
    where eligibility.eligibility_at >= p_window_start
      and eligibility.eligibility_at <= bounds.as_of
  ),
  outbox_evidence as (
    select
      cohort.intake_id,
      coalesce(bool_or(
        outbox.status = 'sent'
        and outbox.sent_at is not null
        and outbox.sent_at <= bounds.as_of
      ), false) as was_sent,
      coalesce(bool_or(
        outbox.status = 'sent'
        and outbox.sent_at is not null
        and outbox.sent_at <= bounds.as_of
        and outbox.delivery_status in ('delivered', 'opened', 'clicked')
        and outbox.delivery_status_updated_at is not null
        and outbox.delivery_status_updated_at <= bounds.as_of
      ), false) as was_delivered,
      coalesce(bool_or(
        outbox.status = 'sent'
        and outbox.sent_at is not null
        and outbox.sent_at <= bounds.as_of
        and outbox.metadata ->> 'review_click_key_hash' ~ '^[0-9a-f]{64}$'
      ), false) as was_trackable,
      coalesce(bool_or(
        outbox.status = 'sent'
        and outbox.sent_at is not null
        and outbox.sent_at <= bounds.as_of
        and outbox.metadata ->> 'review_click_key_hash' ~ '^[0-9a-f]{64}$'
        and outbox.review_first_clicked_at is not null
        and outbox.review_first_clicked_at <= bounds.as_of
      ), false) as was_traversed,
      coalesce(bool_or(outbox.id is not null), false) as has_outbox_owner
    from eligible_cohort as cohort
    cross join bounds
    left join public.email_outbox as outbox
      on outbox.intake_id = cohort.intake_id
      and outbox.email_type = 'review_request'
      and outbox.status <> 'skipped_e2e'
      and outbox.created_at <= bounds.as_of
    group by cohort.intake_id
  ),
  cooldown_evidence as (
    select
      cohort.intake_id,
      (
        exists (
          select 1
          from public.intakes as other_intake
          where other_intake.patient_id = cohort.patient_id
            and other_intake.id <> cohort.intake_id
            and other_intake.review_email_sent_at is not null
            and other_intake.review_email_sent_at <= bounds.as_of
            and other_intake.review_email_sent_at >
              bounds.as_of - interval '30 days'
        )
        or (
          reservation.owner_id is not null
          and reservation.intake_id is distinct from cohort.intake_id
        )
      ) as is_deferred
    from eligible_cohort as cohort
    cross join bounds
    left join lateral (
      select
        owner.id as owner_id,
        owner.intake_id
      from public.email_outbox as owner
      where owner.patient_id = cohort.patient_id
        and owner.email_type = 'review_request'
        and owner.status in ('pending', 'sending', 'sent')
        and owner.created_at <= bounds.as_of
        and owner.created_at > bounds.as_of - interval '30 days'
      order by owner.created_at asc, owner.id asc
      limit 1
    ) as reservation on true
  ),
  classified as (
    select
      cohort.intake_id,
      evidence.was_delivered,
      evidence.was_trackable,
      evidence.was_traversed,
      case
        when evidence.was_sent then 'sent'
        when cohort.review_email_suppressed_at is not null
          and cohort.review_email_suppressed_at <= bounds.as_of
          then 'policy_suppressed'
        when cohort.review_email_sent_at is not null
          and cohort.review_email_sent_at <= bounds.as_of
          and cohort.review_email_sent_at < bounds.lifecycle_cutover_at
          then 'legacy_handled_unverifiable'
        when cohort.review_email_sent_at is not null
          and cohort.review_email_sent_at <= bounds.as_of
          then 'actionable_backlog'
        when cooldown.is_deferred then 'cooldown_deferred'
        when not evidence.has_outbox_owner
          and cohort.eligibility_at > bounds.latest_scheduled_run_at
          then 'awaiting_next_run'
        else 'actionable_backlog'
      end as lifecycle
    from eligible_cohort as cohort
    cross join bounds
    join outbox_evidence as evidence
      on evidence.intake_id = cohort.intake_id
    join cooldown_evidence as cooldown
      on cooldown.intake_id = cohort.intake_id
  )
  select
    count(classified.intake_id) as eligible,
    count(*) filter (where classified.lifecycle = 'sent') as sent,
    count(*) filter (
      where classified.lifecycle = 'sent'
        and classified.was_delivered
    ) as delivered,
    count(*) filter (
      where classified.lifecycle = 'sent'
        and classified.was_trackable
    ) as trackable_sent,
    count(*) filter (
      where classified.lifecycle = 'sent'
        and classified.was_traversed
    ) as unique_redirect_traversals,
    count(*) filter (
      where classified.lifecycle = 'awaiting_next_run'
    ) as awaiting_next_run,
    count(*) filter (
      where classified.lifecycle = 'cooldown_deferred'
    ) as cooldown_deferred,
    count(*) filter (
      where classified.lifecycle = 'policy_suppressed'
    ) as policy_suppressed,
    count(*) filter (
      where classified.lifecycle = 'legacy_handled_unverifiable'
    ) as legacy_handled_unverifiable,
    count(*) filter (
      where classified.lifecycle = 'actionable_backlog'
    ) as actionable_backlog
  from bounds
  left join classified on true
  group by bounds.as_of;
$$;

comment on function public.get_review_request_funnel(
  timestamptz,
  timestamptz,
  uuid[]
) is
  'Returns aggregate-only, point-in-time review-request lifecycle counts. Primary buckets reconcile exactly to eligible; delivery and traversal are sent-only submetrics.';

revoke execute on function public.get_review_request_funnel(timestamptz, timestamptz, uuid[])
  from public, anon, authenticated;

grant execute on function public.get_review_request_funnel(timestamptz, timestamptz, uuid[])
  to service_role;
