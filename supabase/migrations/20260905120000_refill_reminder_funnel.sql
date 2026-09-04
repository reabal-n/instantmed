-- Aggregate-only refill-reminder measurement plus atomic Resend event receipts.
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

drop function if exists public.record_resend_outbox_event(text, text, text, text);

create or replace function public.record_resend_outbox_event(
  p_provider_message_id text,
  p_event_type text,
  p_bounce_type text,
  p_error_message text
)
returns table (
  matched boolean,
  duplicate boolean,
  outbox_id uuid,
  email_type text,
  email_is_test boolean
)
language plpgsql
volatile
security invoker
set search_path = ''
as $function$
declare
  v_outbox_id uuid;
  v_patient_id uuid;
  v_certificate_id uuid;
  v_email_type text;
  v_status text;
  v_delivery_status text;
  v_metadata jsonb;
  v_processed_events jsonb;
  v_event_key text;
  v_incoming_delivery_status text;
  v_incoming_rank integer;
  v_current_rank integer;
  v_email_is_test boolean;
  v_delivery_state_applied boolean := false;
  v_event_recorded_at timestamptz;
begin
  if p_provider_message_id is null
    or length(p_provider_message_id) < 1
    or length(p_provider_message_id) > 255
  then
    raise exception 'invalid Resend provider message id';
  end if;

  if p_event_type not in (
    'email.sent',
    'email.delivered',
    'email.delivery_delayed',
    'email.bounced',
    'email.complained',
    'email.opened',
    'email.clicked'
  ) then
    raise exception 'unsupported Resend event type';
  end if;

  if p_bounce_type is not null and p_bounce_type not in ('hard', 'soft') then
    raise exception 'invalid Resend bounce type';
  end if;

  select
    outbox.id,
    outbox.patient_id,
    outbox.certificate_id,
    outbox.email_type,
    outbox.status,
    outbox.delivery_status,
    case
      when jsonb_typeof(outbox.metadata) = 'object' then outbox.metadata
      else '{}'::jsonb
    end
  into
    v_outbox_id,
    v_patient_id,
    v_certificate_id,
    v_email_type,
    v_status,
    v_delivery_status,
    v_metadata
  from public.email_outbox as outbox
  where outbox.provider_message_id = p_provider_message_id
  order by outbox.created_at desc, outbox.id desc
  limit 1
  for update;

  if not found then
    return query
      select false, false, null::uuid, null::text, false;
    return;
  end if;

  v_event_key := p_provider_message_id || ':' || p_event_type;
  v_processed_events := case
    when jsonb_typeof(v_metadata -> 'processed_events') = 'array'
      then v_metadata -> 'processed_events'
    else '[]'::jsonb
  end;
  v_email_is_test :=
    v_metadata @> '{"test": true}'::jsonb
    or v_metadata @> '{"e2e_mode": true}'::jsonb
    or v_metadata @> '{"dev_mode": true}'::jsonb;

  if v_processed_events ? v_event_key then
    return query
      select true, true, v_outbox_id, v_email_type, v_email_is_test;
    return;
  end if;

  v_event_recorded_at := pg_catalog.clock_timestamp();

  v_incoming_delivery_status := case p_event_type
    when 'email.delivered' then 'delivered'
    when 'email.delivery_delayed' then 'delayed'
    when 'email.bounced' then 'bounced'
    when 'email.complained' then 'complained'
    when 'email.opened' then 'opened'
    when 'email.clicked' then 'clicked'
    else null
  end;
  v_incoming_rank := case v_incoming_delivery_status
    when 'complained' then 6
    when 'bounced' then 5
    when 'clicked' then 4
    when 'opened' then 3
    when 'delivered' then 2
    when 'delayed' then 1
    else 0
  end;
  v_current_rank := case v_delivery_status
    when 'complained' then 6
    when 'bounced' then 5
    when 'clicked' then 4
    when 'opened' then 3
    when 'delivered' then 2
    when 'delayed' then 1
    else 0
  end;
  v_delivery_state_applied :=
    v_incoming_rank > 0 and v_incoming_rank >= v_current_rank;

  v_metadata := jsonb_set(
    v_metadata,
    '{processed_events}',
    v_processed_events || pg_catalog.jsonb_build_array(v_event_key),
    true
  );
  if p_event_type = 'email.bounced' then
    v_metadata := v_metadata || pg_catalog.jsonb_build_object(
      'bounce', pg_catalog.jsonb_build_object(
        'message', left(coalesce(p_error_message, ''), 2000),
        'type', p_bounce_type
      ),
      'bounce_type', coalesce(p_bounce_type, 'soft')
    );
  end if;

  update public.email_outbox as outbox
  set
    metadata = v_metadata,
    status = case
      when p_event_type in ('email.bounced', 'email.complained') then 'failed'
      when p_event_type in ('email.sent', 'email.delivered') and v_status <> 'failed' then 'sent'
      else v_status
    end,
    delivery_status = case
      when v_delivery_state_applied
        then v_incoming_delivery_status
      else v_delivery_status
    end,
    delivery_status_updated_at = case
      when v_delivery_state_applied
        then v_event_recorded_at
      else outbox.delivery_status_updated_at
    end,
    error_message = case
      when p_event_type = 'email.bounced' and p_error_message is not null
        then left(p_error_message, 2000)
      else outbox.error_message
    end
  where outbox.id = v_outbox_id;

  -- The outbox row is the authoritative owner for every patient and
  -- certificate mirror below. Keeping the mirrors in this row-locked
  -- transaction means a failed mirror rolls the receipt back so Resend can
  -- retry it, while a duplicate receipt cannot repeat any mirror.
  if v_patient_id is not null
    and p_event_type in ('email.bounced', 'email.complained')
    and v_delivery_state_applied
  then
    update public.profiles as profile
    set
      email_bounced = true,
      email_bounce_reason = case
        when p_event_type = 'email.complained' then 'complaint: Spam complaint'
        else coalesce(p_bounce_type, 'soft') || ': ' || coalesce(p_error_message, '')
      end,
      email_bounced_at = case
        when v_delivery_status in ('bounced', 'complained')
          then profile.email_bounced_at
        else v_event_recorded_at
      end,
      email_delivery_failures = coalesce(profile.email_delivery_failures, 0) + case
        when v_delivery_status in ('bounced', 'complained') then 0
        else 1
      end
    where profile.id = v_patient_id
      and profile.role = 'patient';
  end if;

  if v_patient_id is not null
    and p_event_type = 'email.complained'
    and v_delivery_state_applied
  then
    insert into public.email_preferences as preferences (
      profile_id,
      marketing_emails,
      abandoned_checkout_emails,
      unsubscribed_at,
      unsubscribe_reason,
      updated_at
    )
    select
      v_patient_id,
      false,
      false,
      v_event_recorded_at,
      'spam_complaint',
      v_event_recorded_at
    where exists (
      select 1
      from public.profiles as profile
      where profile.id = v_patient_id
        and profile.role = 'patient'
    )
    on conflict (profile_id) do update
    set
      marketing_emails = false,
      abandoned_checkout_emails = false,
      unsubscribed_at = excluded.unsubscribed_at,
      unsubscribe_reason = excluded.unsubscribe_reason,
      updated_at = excluded.updated_at;
  end if;

  -- Opens and clicks can arrive before delivery. A later delivery therefore
  -- clears suppression inherited from an older message even though its lower
  -- display rank does not replace the richer open/click state. A terminal
  -- event for this same message always wins.
  if v_patient_id is not null
    and p_event_type = 'email.delivered'
    and v_delivery_status not in ('bounced', 'complained')
  then
    update public.profiles as profile
    set
      email_bounced = false,
      email_bounce_reason = null,
      email_delivery_failures = 0
    where profile.id = v_patient_id
      and profile.role = 'patient'
      and profile.email_bounced is true;
  end if;

  if v_certificate_id is not null and p_event_type = 'email.opened' then
    update public.issued_certificates as certificate
    set email_opened_at = v_event_recorded_at
    where certificate.id = v_certificate_id
      and certificate.email_opened_at is null;
  end if;

  -- delivery_tracking has a smaller status vocabulary than the outbox. Keep
  -- its terminal state monotonic while retaining independent timestamps for
  -- valid out-of-order provider evidence.
  if p_event_type in (
    'email.delivered',
    'email.bounced',
    'email.complained',
    'email.opened'
  ) then
    update public.delivery_tracking as tracking
    set
      status = case
        when p_event_type = 'email.complained' then 'failed'
        when p_event_type = 'email.bounced'
          and coalesce(tracking.status, 'sent') <> 'failed'
          then 'bounced'
        when p_event_type = 'email.opened'
          and coalesce(tracking.status, 'sent') not in ('failed', 'bounced')
          then 'opened'
        when p_event_type = 'email.delivered'
          and coalesce(tracking.status, 'sent') not in ('failed', 'bounced', 'opened')
          then 'delivered'
        else tracking.status
      end,
      delivered_at = case
        when p_event_type = 'email.delivered'
          then coalesce(tracking.delivered_at, v_event_recorded_at)
        else tracking.delivered_at
      end,
      bounced_at = case
        when p_event_type = 'email.bounced'
          then coalesce(tracking.bounced_at, v_event_recorded_at)
        else tracking.bounced_at
      end,
      opened_at = case
        when p_event_type = 'email.opened'
          then coalesce(tracking.opened_at, v_event_recorded_at)
        else tracking.opened_at
      end,
      bounce_type = case
        when p_event_type = 'email.bounced'
          then coalesce(p_bounce_type, 'soft')
        else tracking.bounce_type
      end,
      bounce_reason = case
        when p_event_type = 'email.bounced'
          then left(coalesce(p_error_message, ''), 2000)
        else tracking.bounce_reason
      end,
      error_message = case
        when p_event_type = 'email.complained' then 'Complaint received'
        else tracking.error_message
      end
    where tracking.provider_id = p_provider_message_id;
  end if;

  return query
    select true, false, v_outbox_id, v_email_type, v_email_is_test;
end;
$function$;

comment on function public.record_resend_outbox_event(text, text, text, text) is
  'Atomically records one deduplicated Resend lifecycle receipt and its critical profile, preference, certificate, and delivery-tracking database mirrors.';

revoke all on function public.record_resend_outbox_event(text, text, text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.record_resend_outbox_event(text, text, text, text)
  to service_role;

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
