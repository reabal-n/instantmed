-- Privacy-safe review-request measurement.
--
-- The raw 32-byte capability exists only inside the encrypted/frozen email
-- provider payload. The outbox stores its SHA-256 hash, which can be consumed
-- once to record a directional redirect traversal. This is not proof that a
-- human read the email or posted a review; email security scanners may follow
-- the link.

alter table public.email_outbox
  add column if not exists review_first_clicked_at timestamptz;

alter table public.email_outbox
  drop constraint if exists email_outbox_review_click_key_hash_check;

alter table public.email_outbox
  add constraint email_outbox_review_click_key_hash_check
  check (
    not coalesce(metadata ? 'review_click_key_hash', false)
    or (
      email_type = 'review_request'
      and jsonb_typeof(metadata -> 'review_click_key_hash') = 'string'
      and metadata ->> 'review_click_key_hash' ~ '^[0-9a-f]{64}$'
    )
  ) not valid;

alter table public.email_outbox
  validate constraint email_outbox_review_click_key_hash_check;

create unique index if not exists idx_email_outbox_review_click_key_hash
  on public.email_outbox ((metadata ->> 'review_click_key_hash'))
  where email_type = 'review_request'
    and metadata ? 'review_click_key_hash';

comment on column public.email_outbox.review_first_clicked_at is
  'First atomic traversal of a keyed review-request redirect; directional only because email scanners may follow links.';

create or replace function public.consume_review_request_click(
  p_click_key_hash text
)
returns boolean
language sql
volatile
security invoker
set search_path = ''
as $$
  with consumed as (
    update public.email_outbox
    set review_first_clicked_at = now()
    where p_click_key_hash ~ '^[0-9a-f]{64}$'
      and email_type = 'review_request'
      and metadata ->> 'review_click_key_hash' = p_click_key_hash
      and sent_at is not null
      and review_first_clicked_at is null
    returning true
  )
  select exists(select 1 from consumed);
$$;

comment on function public.consume_review_request_click(text) is
  'Atomically records the first traversal of one hashed review-request capability. Returns false for malformed, unknown, or repeated hashes.';

revoke execute on function public.consume_review_request_click(text)
  from public, anon, authenticated;

grant execute on function public.consume_review_request_click(text)
  to service_role;

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
  unique_redirect_traversals bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  with eligibility as (
    select
      intake.id as intake_id,
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
      and p_excluded_patient_ids is not null
      and intake.patient_id <> all(p_excluded_patient_ids)
  ),
  eligible_cohort as (
    select eligibility.intake_id
    from eligibility
    where p_window_start is not null
      and p_as_of is not null
      and p_window_start <= p_as_of
      and p_window_start >= p_as_of - interval '90 days'
      and eligibility.eligibility_at >= p_window_start
      and eligibility.eligibility_at <= p_as_of
  ),
  outbox_by_intake as (
    select
      outbox.intake_id,
      bool_or(outbox.sent_at is not null) as was_sent,
      bool_or(
        outbox.sent_at is not null
        and outbox.delivery_status in ('delivered', 'opened', 'clicked')
      ) as was_delivered,
      bool_or(
        outbox.sent_at is not null
        and outbox.metadata ->> 'review_click_key_hash' ~ '^[0-9a-f]{64}$'
      ) as was_trackable,
      bool_or(
        outbox.sent_at is not null
        and outbox.metadata ->> 'review_click_key_hash' ~ '^[0-9a-f]{64}$'
        and outbox.review_first_clicked_at is not null
      ) as was_traversed
    from public.email_outbox as outbox
    join eligible_cohort as cohort
      on cohort.intake_id = outbox.intake_id
    where outbox.email_type = 'review_request'
      and outbox.status <> 'skipped_e2e'
    group by outbox.intake_id
  )
  select
    count(distinct cohort.intake_id) as eligible,
    count(distinct cohort.intake_id) filter (where outbox.was_sent) as sent,
    count(distinct cohort.intake_id) filter (where outbox.was_delivered) as delivered,
    count(distinct cohort.intake_id) filter (where outbox.was_trackable) as trackable_sent,
    count(distinct cohort.intake_id) filter (where outbox.was_traversed) as unique_redirect_traversals
  from eligible_cohort as cohort
  left join outbox_by_intake as outbox
    on outbox.intake_id = cohort.intake_id;
$$;

comment on function public.get_review_request_funnel(
  timestamptz,
  timestamptz,
  uuid[]
) is
  'Returns aggregate-only review-request funnel counts for a bounded eligibility cohort. Traversals are directional because email scanners may follow links.';

revoke execute on function public.get_review_request_funnel(timestamptz, timestamptz, uuid[])
  from public, anon, authenticated;

grant execute on function public.get_review_request_funnel(timestamptz, timestamptz, uuid[])
  to service_role;
