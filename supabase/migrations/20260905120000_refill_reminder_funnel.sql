-- Aggregate-only refill-reminder measurement.
--
-- Reminder conversion is grouped by Sydney send week. Raw patient, request,
-- prescription, outbox, recipient, and provider identifiers never leave the
-- aggregate function. Net-retained cash is intentionally not inferred here;
-- the Business surface keeps it unavailable until the canonical refund and
-- dispute ledgers can be joined with their completeness gate.

create index if not exists idx_email_outbox_refill_funnel_sent
  on public.email_outbox (sent_at, patient_id, id)
  where email_type = 'refill_reminder'
    and sent_at is not null
    and patient_id is not null;

create index if not exists idx_email_outbox_refill_prescription_owner
  on public.email_outbox ((metadata ->> 'prescription_id'))
  where email_type = 'refill_reminder'
    and metadata ? 'prescription_id';

create index if not exists idx_intakes_paid_repeat_patient_time
  on public.intakes (patient_id, paid_at, id)
  where category = 'prescription'
    and subtype = 'repeat'
    and paid_at is not null
    and payment_status in ('paid', 'partially_refunded', 'refunded', 'disputed');

drop function if exists public.get_refill_reminder_funnel(
  timestamptz,
  timestamptz,
  timestamptz,
  uuid[]
);

create or replace function public.get_refill_reminder_funnel(
  p_from timestamptz,
  p_to timestamptz,
  p_as_of timestamptz,
  p_excluded_patient_ids uuid[]
)
returns table (
  week_start timestamptz,
  week_end_exclusive timestamptz,
  maturity_at timestamptz,
  sent bigint,
  delivered bigint,
  observed_provider_clicks bigint,
  utm_attributed_paid_renewals_within_21d bigint,
  same_patient_paid_reorders_within_21d bigint,
  utm_converted_sends_within_21d bigint,
  same_patient_converted_sends_within_21d bigint
)
language sql
stable
security invoker
set search_path = ''
as $function$
  with requested_bounds as (
    select
      p_from as from_at,
      p_to as to_at,
      p_as_of as as_of
    where p_from is not null
      and p_to is not null
      and p_as_of is not null
      and p_from < p_to
      and p_to <= p_as_of
      and p_from >= p_as_of - interval '180 days'
      and p_excluded_patient_ids is not null
  ),
  bounds as (
    select requested_bounds.*
    from requested_bounds
  ),
  real_sends as (
    select
      outbox.id as outbox_id,
      outbox.patient_id,
      outbox.provider_message_id,
      outbox.sent_at,
      case
        when jsonb_typeof(outbox.metadata -> 'processed_events') = 'array'
          then outbox.metadata -> 'processed_events'
        else '[]'::jsonb
      end as processed_events,
      (
        pg_catalog.date_trunc(
          'week',
          outbox.sent_at at time zone 'Australia/Sydney'
        ) at time zone 'Australia/Sydney'
      ) as week_start,
      (
        pg_catalog.date_trunc(
          'week',
          outbox.sent_at at time zone 'Australia/Sydney'
        ) + interval '7 days'
      ) at time zone 'Australia/Sydney' as week_end_exclusive
    from public.email_outbox as outbox
    join public.prescriptions as prescription
      on prescription.id::text = outbox.metadata ->> 'prescription_id'
      and prescription.patient_id = outbox.patient_id
      and prescription.intake_id is not null
    join public.intakes as source_intake
      on source_intake.id = prescription.intake_id
      and source_intake.patient_id = outbox.patient_id
      and source_intake.exclude_from_reporting is distinct from true
    cross join bounds
    where outbox.email_type = 'refill_reminder'
      and outbox.provider = 'resend'
      and outbox.sent_at is not null
      and outbox.provider_message_id is not null
      and outbox.provider_message_id <> ''
      and outbox.patient_id is not null
      and outbox.status <> 'skipped_e2e'
      and not (outbox.metadata @> '{"test": true}'::jsonb)
      and not (outbox.metadata @> '{"e2e_mode": true}'::jsonb)
      and not (outbox.metadata @> '{"dev_mode": true}'::jsonb)
      and outbox.patient_id <> all(p_excluded_patient_ids)
      and outbox.sent_at >= bounds.from_at
      and outbox.sent_at < bounds.to_at
      and outbox.sent_at <= bounds.as_of
  ),
  send_evidence as (
    select
      send.*,
      send.processed_events ? (
        send.provider_message_id || ':email.delivered'
      ) as was_delivered,
      send.processed_events ? (
        send.provider_message_id || ':email.clicked'
      ) as had_observed_provider_click
    from real_sends as send
  ),
  ranked_reorder_matches as (
    select
      reorder_intake.id as reorder_intake_id,
      send.outbox_id,
      reorder_intake.utm_source,
      row_number() over (
        partition by reorder_intake.id
        order by send.sent_at desc, send.outbox_id desc
      ) as reminder_rank
    from send_evidence as send
    join public.intakes as reorder_intake
      on reorder_intake.patient_id = send.patient_id
      and reorder_intake.category = 'prescription'
      and reorder_intake.subtype = 'repeat'
      and reorder_intake.payment_status in (
        'paid',
        'partially_refunded',
        'refunded',
        'disputed'
      )
      and reorder_intake.paid_at is not null
      and reorder_intake.paid_at > send.sent_at
      and reorder_intake.paid_at <= send.sent_at + interval '21 days'
      and reorder_intake.paid_at <= p_as_of
      and reorder_intake.exclude_from_reporting is distinct from true
      and reorder_intake.patient_id <> all(p_excluded_patient_ids)
  ),
  assigned_reorders as (
    select
      ranked.reorder_intake_id,
      ranked.outbox_id,
      ranked.utm_source
    from ranked_reorder_matches as ranked
    where ranked.reminder_rank = 1
  )
  select
    send.week_start,
    send.week_end_exclusive,
    max(send.sent_at) + interval '21 days' as maturity_at,
    count(distinct send.outbox_id) as sent,
    count(distinct send.outbox_id) filter (
      where send.was_delivered
    ) as delivered,
    count(distinct send.outbox_id) filter (
      where send.had_observed_provider_click
    ) as observed_provider_clicks,
    count(distinct reorder.reorder_intake_id) filter (
      where reorder.utm_source = 'refill_reminder'
    ) as utm_attributed_paid_renewals_within_21d,
    count(distinct reorder.reorder_intake_id) as same_patient_paid_reorders_within_21d,
    count(distinct reorder.outbox_id) filter (
      where reorder.utm_source = 'refill_reminder'
    ) as utm_converted_sends_within_21d,
    count(distinct reorder.outbox_id) as same_patient_converted_sends_within_21d
  from send_evidence as send
  left join assigned_reorders as reorder
    on reorder.outbox_id = send.outbox_id
  group by send.week_start, send.week_end_exclusive
  order by send.week_start;
$function$;

comment on function public.get_refill_reminder_funnel(
  timestamptz,
  timestamptz,
  timestamptz,
  uuid[]
) is
  'Returns aggregate-only Sydney refill-reminder send waves and matched gross paid repeat-script reorder evidence. No identifiers leave the function.';

revoke all on function public.get_refill_reminder_funnel(
  timestamptz,
  timestamptz,
  timestamptz,
  uuid[]
) from public, anon, authenticated, service_role;
grant execute on function public.get_refill_reminder_funnel(
  timestamptz,
  timestamptz,
  timestamptz,
  uuid[]
) to service_role;
