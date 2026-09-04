-- Shared Resend delivery receipts and exact-attempt mirrors.
-- Preference ordering is owned by 20260905110000_email_preference_ordering.
-- No identity trigger replacement or historical profile repair is included.

create index if not exists idx_auth_email_events_provider_message_id
  on public.auth_email_events (provider_message_id)
  where provider_message_id is not null;

comment on column public.profiles.email_delivery_failures is
  'Consecutive soft or undetermined bounce outcomes for the current normalized email address after the latest successful delivery/open/click; hard/provider suppression and consent are tracked separately.';

drop function if exists public.record_resend_outbox_event(text, text, text, text);
drop function if exists public.record_resend_outbox_event(text, text, text, text, timestamptz);
drop function if exists public.record_resend_outbox_event(
  text,
  text,
  text,
  text,
  timestamptz,
  text
);

create or replace function public.record_resend_outbox_event(
  p_provider_message_id text,
  p_event_type text,
  p_bounce_type text,
  p_error_message text,
  p_event_created_at timestamptz default pg_catalog.clock_timestamp(),
  p_provider_detail_type text default null
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
  v_intake_id uuid;
  v_patient_id uuid;
  v_certificate_id uuid;
  v_email_type text;
  v_to_email text;
  v_status text;
  v_delivery_status text;
  v_delivery_status_updated_at timestamptz;
  v_outbox_created_at timestamptz;
  v_sent_at timestamptz;
  v_retry_count integer;
  v_metadata jsonb;
  v_processed_events jsonb;
  v_event_key text;
  v_incoming_delivery_status text;
  v_incoming_rank integer;
  v_current_rank integer;
  v_effective_delivery_status text;
  v_effective_delivery_status_updated_at timestamptz;
  v_duplicate boolean;
  v_email_is_test boolean;
  v_delivery_state_applied boolean := false;
  v_event_recorded_at timestamptz;
  v_masked_recipient text;
  v_normalized_recipient text;
  v_address_profile_ids uuid[];
  v_latest_delivery_status text;
  v_latest_suppression_status text;
  v_latest_suppression_error_message text;
  v_latest_suppression_metadata jsonb;
  v_latest_suppression_updated_at timestamptz;
  v_consecutive_delivery_failures integer := 0;
  v_certificate_delivery_id text;
  v_certificate_status text;
  v_certificate_storage_path text;
  v_current_certificate_version text;
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
    'email.failed',
    'email.suppressed',
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

  if p_provider_detail_type is not null
    and length(p_provider_detail_type) > 100
  then
    raise exception 'invalid Resend provider detail type';
  end if;

  if p_event_created_at is null then
    raise exception 'invalid Resend event timestamp';
  end if;

  select
    outbox.id,
    outbox.intake_id,
    outbox.patient_id,
    outbox.certificate_id,
    outbox.email_type,
    outbox.to_email,
    outbox.status,
    outbox.delivery_status,
    outbox.delivery_status_updated_at,
    outbox.created_at,
    outbox.sent_at,
    outbox.retry_count,
    case
      when jsonb_typeof(outbox.metadata) = 'object' then outbox.metadata
      else '{}'::jsonb
    end
  into
    v_outbox_id,
    v_intake_id,
    v_patient_id,
    v_certificate_id,
    v_email_type,
    v_to_email,
    v_status,
    v_delivery_status,
    v_delivery_status_updated_at,
    v_outbox_created_at,
    v_sent_at,
    v_retry_count,
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
  v_duplicate := v_processed_events ? v_event_key;
  v_event_recorded_at := p_event_created_at;
  v_effective_delivery_status := v_delivery_status;
  v_effective_delivery_status_updated_at := v_delivery_status_updated_at;
  v_normalized_recipient := nullif(lower(btrim(v_to_email)), '');
  v_masked_recipient := case
    when pg_catalog.strpos(v_to_email, '@') = 0
      or pg_catalog.split_part(v_to_email, '@', 2) = ''
      then '***@***'
    else (
      case
        when length(pg_catalog.split_part(v_to_email, '@', 1)) > 2
          then left(pg_catalog.split_part(v_to_email, '@', 1), 1)
            || '***'
            || right(pg_catalog.split_part(v_to_email, '@', 1), 1)
        else '***'
      end
    ) || '@' || pg_catalog.split_part(v_to_email, '@', 2)
  end;

  -- Earlier webhook handling represented a complaint as undelivered. A
  -- replay may safely heal only this outbox projection: the processed-event
  -- key still prevents preference/profile counters from running again.
  if v_duplicate
    and p_event_type = 'email.complained'
    and v_delivery_status = 'complained'
  then
    update public.email_outbox as outbox
    set status = 'sent', error_message = null
    where outbox.id = v_outbox_id;
    v_status := 'sent';
  end if;

  if not v_duplicate then

  v_incoming_delivery_status := case p_event_type
    when 'email.delivered' then 'delivered'
    when 'email.delivery_delayed' then 'delayed'
    when 'email.failed' then 'failed'
    when 'email.suppressed' then 'suppressed'
    when 'email.bounced' then 'bounced'
    when 'email.complained' then 'complained'
    when 'email.opened' then 'opened'
    when 'email.clicked' then 'clicked'
    else null
  end;
  v_incoming_rank := case v_incoming_delivery_status
    when 'complained' then 8
    when 'suppressed' then 7
    when 'bounced' then 6
    when 'failed' then 5
    when 'clicked' then 4
    when 'opened' then 3
    when 'delivered' then 2
    when 'delayed' then 1
    else 0
  end;
  v_current_rank := case v_delivery_status
    when 'complained' then 8
    when 'suppressed' then 7
    when 'bounced' then 6
    when 'failed' then 5
    when 'clicked' then 4
    when 'opened' then 3
    when 'delivered' then 2
    when 'delayed' then 1
    else 0
  end;
  v_delivery_state_applied :=
    v_incoming_rank > 0 and v_incoming_rank >= v_current_rank;
  if v_delivery_state_applied then
    v_effective_delivery_status := v_incoming_delivery_status;
    v_effective_delivery_status_updated_at := v_event_recorded_at;
  end if;

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
  elsif p_event_type = 'email.failed' then
    v_metadata := v_metadata || pg_catalog.jsonb_build_object(
      'failed', pg_catalog.jsonb_build_object(
        'reason', left(coalesce(p_error_message, ''), 500)
      )
    );
  elsif p_event_type = 'email.suppressed' then
    v_metadata := v_metadata || pg_catalog.jsonb_build_object(
      'suppressed', pg_catalog.jsonb_build_object(
        'message', left(coalesce(p_error_message, ''), 500),
        'type', left(coalesce(p_provider_detail_type, ''), 100)
      ),
      'suppression_type', left(coalesce(p_provider_detail_type, ''), 100)
    );
  end if;

  update public.email_outbox as outbox
  set
    metadata = v_metadata,
    status = case
      when p_event_type in (
        'email.bounced',
        'email.failed',
        'email.suppressed'
      ) and v_delivery_state_applied then 'failed'
      when p_event_type = 'email.complained' then 'sent'
      when p_event_type in (
        'email.sent',
        'email.delivered',
        'email.opened',
        'email.clicked'
      ) and coalesce(v_delivery_status, '') not in (
        'bounced',
        'complained',
        'failed',
        'suppressed'
      ) then 'sent'
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
      when p_event_type = 'email.complained' then null
      when p_event_type in ('email.bounced', 'email.failed', 'email.suppressed')
        and p_error_message is not null
        and v_delivery_state_applied
        then left(p_error_message, 2000)
      when p_event_type in (
        'email.sent',
        'email.delivered',
        'email.opened',
        'email.clicked'
      ) and coalesce(v_delivery_status, '') not in (
        'bounced',
        'complained',
        'failed',
        'suppressed'
      ) then null
      else outbox.error_message
    end,
    -- A provider-terminal callback owns the outcome of this exact outbox
    -- attempt. Replaying the same row reuses its Resend idempotency key and can
    -- return a cached acceptance without sending a new message, so only a new
    -- audited send attempt may retry it.
    retry_count = case
      when p_event_type in (
        'email.bounced',
        'email.complained',
        'email.failed',
        'email.suppressed'
      )
        then greatest(coalesce(outbox.retry_count, 0), 10)
      else outbox.retry_count
    end
  where outbox.id = v_outbox_id;

  -- Serialize address suppression through the patient row. Outbox rows for
  -- different message attempts otherwise have independent locks, allowing an
  -- older callback to commit after a newer attempt and corrupt address state.
  end if;

  -- Complaint consent is an idempotent, event-time-ordered reconciliation.
  -- Keep it outside receipt dedupe so a replay can heal a historical/mid-crash
  -- missing preference without incrementing delivery counters or profile state.
  if v_patient_id is not null
    and v_email_type <> 'med_cert_employer'
    and p_event_type in (
      'email.delivered',
      'email.bounced',
      'email.complained',
      'email.failed',
      'email.suppressed',
      'email.opened',
      'email.clicked'
    )
  then
    perform 1
    from public.profiles as profile
    where profile.normalized_email = v_normalized_recipient
      and profile.role = 'patient'
      and profile.merged_into_profile_id is null
    order by profile.id
    for update;

    select pg_catalog.array_agg(profile.id order by profile.id)
    into v_address_profile_ids
    from public.profiles as profile
    where profile.normalized_email = v_normalized_recipient
      and profile.role = 'patient'
      and profile.merged_into_profile_id is null;

    select outcome.delivery_status
    into v_latest_delivery_status
    from public.email_outbox as outcome
    where outcome.patient_id = any(v_address_profile_ids)
      and outcome.email_type <> 'med_cert_employer'
      and nullif(lower(btrim(outcome.to_email)), '') = v_normalized_recipient
      and outcome.delivery_status in (
        'delivered',
        'opened',
        'clicked',
        'bounced',
        'complained',
        'failed',
        'suppressed'
      )
    order by
      coalesce(outcome.sent_at, outcome.created_at) desc,
      outcome.created_at desc,
      outcome.id desc
    limit 1;

    if found then
      select count(*)::integer
      into v_consecutive_delivery_failures
      from public.email_outbox as soft_bounce
      where soft_bounce.patient_id = any(v_address_profile_ids)
        and soft_bounce.email_type <> 'med_cert_employer'
        and nullif(lower(btrim(soft_bounce.to_email)), '') = v_normalized_recipient
        and soft_bounce.delivery_status = 'bounced'
        and lower(coalesce(soft_bounce.metadata ->> 'bounce_type', '')) <> 'hard'
        and lower(coalesce(
          soft_bounce.metadata -> 'bounce' ->> 'type',
          ''
        )) not in ('hard', 'permanent')
        and not exists (
          select 1
          from public.email_outbox as newer_break
          where newer_break.patient_id = any(v_address_profile_ids)
            and newer_break.email_type <> 'med_cert_employer'
            and nullif(lower(btrim(newer_break.to_email)), '') =
              v_normalized_recipient
            and newer_break.delivery_status in (
              'delivered',
              'opened',
              'clicked',
              'bounced',
              'complained',
              'failed',
              'suppressed'
            )
            and not (
              newer_break.delivery_status = 'bounced'
              and lower(coalesce(
                newer_break.metadata ->> 'bounce_type',
                ''
              )) <> 'hard'
              and lower(coalesce(
                newer_break.metadata -> 'bounce' ->> 'type',
                ''
              )) not in ('hard', 'permanent')
            )
            and (
              coalesce(newer_break.sent_at, newer_break.created_at),
              newer_break.created_at,
              newer_break.id
            ) > (
              coalesce(soft_bounce.sent_at, soft_bounce.created_at),
              soft_bounce.created_at,
              soft_bounce.id
            )
        );

      -- A soft bounce is temporary provider evidence, not permanent address
      -- suppression. Preserve hard/provider suppression separately; consent
      -- complaints live only in email_preferences. A newer success heals the
      -- address-owned provider state.
      select
        suppression.delivery_status,
        suppression.error_message,
        case
          when jsonb_typeof(suppression.metadata) = 'object'
            then suppression.metadata
          else '{}'::jsonb
        end,
        suppression.delivery_status_updated_at
      into
        v_latest_suppression_status,
        v_latest_suppression_error_message,
        v_latest_suppression_metadata,
        v_latest_suppression_updated_at
      from public.email_outbox as suppression
      where suppression.patient_id = any(v_address_profile_ids)
        and suppression.email_type <> 'med_cert_employer'
        and nullif(lower(btrim(suppression.to_email)), '') =
          v_normalized_recipient
        and (
          suppression.delivery_status = 'suppressed'
          or (
            suppression.delivery_status = 'bounced'
            and (
              lower(coalesce(
                suppression.metadata ->> 'bounce_type',
                ''
              )) = 'hard'
              or lower(coalesce(
                suppression.metadata -> 'bounce' ->> 'type',
                ''
              )) in ('hard', 'permanent')
            )
          )
        )
        and not exists (
          select 1
          from public.email_outbox as newer_success
          where newer_success.patient_id = any(v_address_profile_ids)
            and newer_success.email_type <> 'med_cert_employer'
            and nullif(lower(btrim(newer_success.to_email)), '') =
              v_normalized_recipient
            and newer_success.delivery_status in ('delivered', 'opened', 'clicked')
            and (
              coalesce(newer_success.sent_at, newer_success.created_at),
              newer_success.created_at,
              newer_success.id
            ) > (
              coalesce(suppression.sent_at, suppression.created_at),
              suppression.created_at,
              suppression.id
            )
        )
      order by
        coalesce(suppression.sent_at, suppression.created_at) desc,
        suppression.created_at desc,
        suppression.id desc
      limit 1;

      update public.profiles as profile
      set
        email_bounced = coalesce(
          v_latest_suppression_status in ('bounced', 'suppressed'),
          false
        ),
        email_bounce_reason = case
          when v_latest_suppression_status = 'suppressed'
            then 'suppressed: ' || coalesce(
              nullif(
                v_latest_suppression_metadata -> 'suppressed' ->> 'type',
                ''
              ),
              'provider'
            ) || case
              when nullif(
                v_latest_suppression_metadata -> 'suppressed' ->> 'message',
                ''
              ) is null then ''
              else ': ' || (
                v_latest_suppression_metadata -> 'suppressed' ->> 'message'
              )
            end
          when v_latest_suppression_status = 'bounced'
            then 'hard: ' || coalesce(
              v_latest_suppression_error_message,
              v_latest_suppression_metadata -> 'bounce' ->> 'message',
              ''
            )
          else null
        end,
        email_bounced_at = case
          when v_latest_suppression_status in (
            'bounced',
            'suppressed'
          )
            then coalesce(
              v_latest_suppression_updated_at,
              profile.email_bounced_at,
              v_event_recorded_at
            )
          else profile.email_bounced_at
        end,
        email_delivery_failures = v_consecutive_delivery_failures
      where profile.id = any(v_address_profile_ids);
    end if;
  end if;

  if v_patient_id is not null
    and v_email_type <> 'med_cert_employer'
    and p_event_type = 'email.complained'
    and (v_delivery_state_applied or (v_duplicate and v_delivery_status = 'complained'))
  then
    perform public.record_email_spam_complaint(
      v_normalized_recipient,
      case when v_duplicate then coalesce(v_delivery_status_updated_at, v_event_recorded_at)
        else v_event_recorded_at end
    );
  end if;

  -- Certificate lifecycle ownership follows the current patient delivery id
  -- and document version, not certificate_id alone (employer and superseded
  -- sends retain that id too). This reconciliation intentionally runs for
  -- duplicate receipts so a retry can heal a missing current-attempt marker.
  if v_certificate_id is not null
    and v_email_type = 'med_cert_patient'
    and p_event_type in (
      'email.opened',
      'email.bounced',
      'email.failed',
      'email.suppressed'
    )
  then
    select
      certificate.email_delivery_id,
      certificate.status,
      certificate.storage_path,
      case
        when certificate.storage_path is null then null
        else left(
          encode(extensions.digest(certificate.storage_path, 'sha256'), 'hex'),
          32
        )
      end
    into
      v_certificate_delivery_id,
      v_certificate_status,
      v_certificate_storage_path,
      v_current_certificate_version
    from public.issued_certificates as certificate
    where certificate.id = v_certificate_id
    for update;

    if found
      and v_certificate_delivery_id = p_provider_message_id
      and v_metadata ->> 'certificate_storage_version' = v_current_certificate_version
    then
      if p_event_type = 'email.opened' then
        update public.issued_certificates as certificate
        set email_opened_at = case
          when certificate.email_opened_at is null then v_event_recorded_at
          else least(certificate.email_opened_at, v_event_recorded_at)
        end
        where certificate.id = v_certificate_id
          and certificate.email_delivery_id = p_provider_message_id;
      elsif v_effective_delivery_status in (
        'bounced',
        'failed',
        'suppressed'
      ) then
        update public.issued_certificates as certificate
        set
          email_sent_at = null,
          email_failed_at = coalesce(
            v_effective_delivery_status_updated_at,
            v_event_recorded_at
          ),
          email_failure_reason = case v_effective_delivery_status
            when 'bounced' then 'Resend email bounced'
            when 'suppressed' then 'Resend provider suppression'
            else 'Resend provider failure'
          end,
          updated_at = pg_catalog.clock_timestamp()
        where certificate.id = v_certificate_id
          and certificate.email_delivery_id = p_provider_message_id;
      end if;
    elsif found
      and v_certificate_status = 'valid'
      and v_certificate_delivery_id is distinct from p_provider_message_id
      and (
        coalesce(v_certificate_delivery_id, '') not like 'manual:%'
        or exists (
          select 1
          from public.certificate_resend_attempts as attempt
          where attempt.id::text = v_metadata ->> 'resend_attempt_id'
            and attempt.certificate_id = v_certificate_id
            and attempt.certificate_storage_path = v_certificate_storage_path
            and attempt.status = 'reserved'
        )
      )
      and v_metadata ->> 'certificate_storage_version' = v_current_certificate_version
      and not exists (
        select 1
        from public.email_outbox as newer
        where newer.certificate_id = v_certificate_id
          and newer.email_type = 'med_cert_patient'
          and newer.metadata ->> 'certificate_storage_version' = v_current_certificate_version
          and (
            coalesce(newer.sent_at, newer.created_at),
            newer.created_at,
            newer.id
          ) > (
            coalesce(v_sent_at, v_outbox_created_at),
            v_outbox_created_at,
            v_outbox_id
          )
      )
      and not exists (
        select 1
        from public.email_outbox as owner
        where owner.provider_message_id = v_certificate_delivery_id
          and owner.certificate_id = v_certificate_id
          and (
            coalesce(owner.sent_at, owner.created_at),
            owner.created_at,
            owner.id
          ) >= (
            coalesce(v_sent_at, v_outbox_created_at),
            v_outbox_created_at,
            v_outbox_id
          )
      )
    then
      -- Resend can call back after the outbox provider id is durable but
      -- before certificate finalization installs that id. Roll back the
      -- receipt so its provider retry can reconcile the current attempt.
      raise exception 'current certificate email delivery is not finalized'
        using errcode = '40001';
    end if;
  end if;

  -- delivery_tracking has a smaller status vocabulary than the outbox. Keep
  -- its terminal state monotonic while retaining independent timestamps for
  -- valid out-of-order provider evidence. The upsert also closes the race in
  -- which a provider callback arrives before direct-send tracking is inserted,
  -- and heals legacy duplicate receipts whose tracking row is absent or stale.
  if p_event_type in (
    'email.sent',
    'email.delivered',
    'email.bounced',
    'email.complained',
    'email.failed',
    'email.suppressed',
    'email.opened'
  ) then
    insert into public.delivery_tracking as tracking (
      message_id,
      intake_id,
      patient_id,
      channel,
      template_type,
      provider_id,
      recipient,
      status,
      sent_at,
      delivered_at,
      bounced_at,
      opened_at,
      bounce_type,
      bounce_reason,
      error_message,
      attempt_number
    ) values (
      p_provider_message_id,
      v_intake_id,
      v_patient_id,
      'email',
      v_email_type,
      p_provider_message_id,
      v_masked_recipient,
      case p_event_type
        -- A complaint is terminal for the provider attempt and consent, but
        -- proves recipient delivery. delivery_tracking has no complaint state.
        when 'email.complained' then 'delivered'
        when 'email.failed' then 'failed'
        when 'email.suppressed' then 'failed'
        when 'email.bounced' then 'bounced'
        when 'email.opened' then 'opened'
        when 'email.delivered' then 'delivered'
        else 'sent'
      end,
      coalesce(v_sent_at, v_event_recorded_at),
      case when p_event_type = 'email.delivered' then v_event_recorded_at else null end,
      case when p_event_type = 'email.bounced' then v_event_recorded_at else null end,
      case when p_event_type = 'email.opened' then v_event_recorded_at else null end,
      case
        when p_event_type = 'email.bounced' then coalesce(p_bounce_type, 'soft')
        else null
      end,
      case
        when p_event_type = 'email.bounced' then left(coalesce(p_error_message, ''), 2000)
        else null
      end,
      case
        when p_event_type = 'email.complained' then null
        when p_event_type in ('email.failed', 'email.suppressed')
          then left(coalesce(p_error_message, ''), 2000)
        else null
      end,
      greatest(coalesce(v_retry_count, 0), 1)
    )
    on conflict (message_id) do update
    set
      intake_id = coalesce(excluded.intake_id, tracking.intake_id),
      patient_id = coalesce(excluded.patient_id, tracking.patient_id),
      channel = excluded.channel,
      template_type = excluded.template_type,
      provider_id = excluded.provider_id,
      recipient = excluded.recipient,
      status = case
        when p_event_type = 'email.complained' and tracking.status <> 'opened'
          then 'delivered'
        when p_event_type in ('email.failed', 'email.suppressed')
          and coalesce(v_delivery_status, '') <> 'complained'
          then 'failed'
        when p_event_type = 'email.bounced'
          and coalesce(v_delivery_status, '') not in ('complained', 'suppressed')
          then 'bounced'
        when p_event_type = 'email.opened'
          and coalesce(v_delivery_status, '') not in (
            'failed',
            'suppressed',
            'bounced',
            'complained'
          )
          then 'opened'
        when p_event_type = 'email.delivered'
          and coalesce(v_delivery_status, '') not in (
            'failed',
            'suppressed',
            'bounced',
            'complained'
          )
          and tracking.status <> 'opened'
          then 'delivered'
        when p_event_type = 'email.sent'
          and coalesce(v_delivery_status, '') not in (
            'failed',
            'suppressed',
            'bounced',
            'complained'
          )
          and tracking.status not in ('delivered', 'opened')
          then 'sent'
        else tracking.status
      end,
      sent_at = coalesce(tracking.sent_at, excluded.sent_at),
      delivered_at = case
        when p_event_type = 'email.delivered'
          then coalesce(tracking.delivered_at, excluded.delivered_at)
        else tracking.delivered_at
      end,
      bounced_at = case
        when p_event_type = 'email.bounced'
          then coalesce(tracking.bounced_at, excluded.bounced_at)
        else tracking.bounced_at
      end,
      opened_at = case
        when p_event_type = 'email.opened'
          then case
            when tracking.opened_at is null then excluded.opened_at
            else least(tracking.opened_at, excluded.opened_at)
          end
        else tracking.opened_at
      end,
      bounce_type = case
        when p_event_type = 'email.bounced'
          then excluded.bounce_type
        else tracking.bounce_type
      end,
      bounce_reason = case
        when p_event_type = 'email.bounced'
          then excluded.bounce_reason
        else tracking.bounce_reason
      end,
      error_message = case
        when p_event_type = 'email.complained' then null
        when p_event_type in ('email.failed', 'email.suppressed')
          and coalesce(v_delivery_status, '') <> 'complained'
          then excluded.error_message
        when p_event_type in ('email.sent', 'email.delivered', 'email.opened')
          and coalesce(v_delivery_status, '') not in (
            'failed',
            'suppressed',
            'bounced',
            'complained'
          )
          then null
        else tracking.error_message
      end,
      attempt_number = greatest(
        coalesce(tracking.attempt_number, 0),
        excluded.attempt_number
      );
  end if;

  return query
    select true, v_duplicate, v_outbox_id, v_email_type, v_email_is_test;
end;
$function$;

comment on function public.record_resend_outbox_event(
  text,
  text,
  text,
  text,
  timestamptz,
  text
) is
  'Atomically records one deduplicated Resend lifecycle receipt and its critical profile, preference, certificate, and delivery-tracking database mirrors.';

revoke all on function public.record_resend_outbox_event(
  text,
  text,
  text,
  text,
  timestamptz,
  text
)
  from public, anon, authenticated, service_role;
grant execute on function public.record_resend_outbox_event(
  text,
  text,
  text,
  text,
  timestamptz,
  text
)
  to service_role;
