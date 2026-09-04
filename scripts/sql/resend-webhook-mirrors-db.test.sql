\set ON_ERROR_STOP on

create or replace function pg_temp.assert_true(value boolean, message text)
returns void
language plpgsql
as $function$
begin
  if value is distinct from true then
    raise exception '%', message;
  end if;
end;
$function$;

-- An open callback may outrun delivery. Delivery still clears a bounce
-- inherited from an older message, while the richer outbox state stays intact.
insert into public.profiles (
  id, role, email_bounced, email_bounce_reason, email_delivery_failures
) values (
  '10000000-0000-4000-8000-000000000001',
  'patient',
  true,
  'hard: older message',
  2
);
insert into public.issued_certificates (id) values (
  '20000000-0000-4000-8000-000000000001'
);
insert into public.email_outbox (
  id, patient_id, certificate_id, email_type, status, provider_message_id
) values (
  '30000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  'med_cert_patient',
  'sent',
  'resend-stale-bounce'
);
insert into public.delivery_tracking (
  id, message_id, provider_id, status
) values (
  '40000000-0000-4000-8000-000000000001',
  'resend-stale-bounce',
  'resend-stale-bounce',
  'sent'
);

select * from public.record_resend_outbox_event(
  'resend-stale-bounce', 'email.opened', null, null
);
select * from public.record_resend_outbox_event(
  'resend-stale-bounce', 'email.delivered', null, null
);

select pg_temp.assert_true(
  (select not email_bounced
      and email_bounce_reason is null
      and email_delivery_failures = 0
   from public.profiles
   where id = '10000000-0000-4000-8000-000000000001'),
  'delivery after open did not clear a genuinely stale prior bounce'
);
select pg_temp.assert_true(
  (select delivery_status = 'opened'
      and jsonb_array_length(metadata -> 'processed_events') = 2
   from public.email_outbox
   where id = '30000000-0000-4000-8000-000000000001'),
  'open/delivery receipts or monotonic outbox state were not preserved'
);
select pg_temp.assert_true(
  (select email_opened_at is not null
   from public.issued_certificates
   where id = '20000000-0000-4000-8000-000000000001'),
  'certificate-open mirror was not committed with the receipt'
);
select pg_temp.assert_true(
  (select status = 'opened'
      and opened_at is not null
      and delivered_at is not null
   from public.delivery_tracking
   where provider_id = 'resend-stale-bounce'),
  'durable delivery tracking lost open or delivery evidence'
);

-- A click callback can likewise outrun delivery without blocking stale-bounce
-- recovery, even though delivery does not replace the richer click state.
insert into public.profiles (
  id, role, email_bounced, email_bounce_reason, email_delivery_failures
) values (
  '10000000-0000-4000-8000-000000000007',
  'patient',
  true,
  'soft: older message',
  1
);
insert into public.email_outbox (
  id, patient_id, email_type, status, provider_message_id
) values (
  '30000000-0000-4000-8000-000000000007',
  '10000000-0000-4000-8000-000000000007',
  'refill_reminder',
  'sent',
  'resend-stale-bounce-click'
);
insert into public.delivery_tracking (
  id, message_id, provider_id, status
) values (
  '40000000-0000-4000-8000-000000000007',
  'resend-stale-bounce-click',
  'resend-stale-bounce-click',
  'sent'
);

select * from public.record_resend_outbox_event(
  'resend-stale-bounce-click', 'email.clicked', null, null
);
select * from public.record_resend_outbox_event(
  'resend-stale-bounce-click', 'email.delivered', null, null
);

select pg_temp.assert_true(
  (select not email_bounced
      and email_bounce_reason is null
      and email_delivery_failures = 0
   from public.profiles
   where id = '10000000-0000-4000-8000-000000000007'),
  'delivery after click did not clear a genuinely stale prior bounce'
);
select pg_temp.assert_true(
  (select delivery_status = 'clicked'
      and jsonb_array_length(metadata -> 'processed_events') = 2
   from public.email_outbox
   where id = '30000000-0000-4000-8000-000000000007'),
  'click/delivery receipts or monotonic outbox state were not preserved'
);
select pg_temp.assert_true(
  (select status = 'delivered' and delivered_at is not null
   from public.delivery_tracking
   where provider_id = 'resend-stale-bounce-click'),
  'delivery tracking missed delivery after an earlier click'
);

-- A same-message terminal bounce wins when a later delivery arrives.
-- Replayed callbacks must not inflate the patient failure count.
insert into public.profiles (id, role) values (
  '10000000-0000-4000-8000-000000000002', 'patient'
);
insert into public.email_outbox (
  id, patient_id, email_type, status, provider_message_id
) values (
  '30000000-0000-4000-8000-000000000002',
  '10000000-0000-4000-8000-000000000002',
  'refill_reminder',
  'sent',
  'resend-terminal-bounce'
);
insert into public.delivery_tracking (
  id, message_id, provider_id, status
) values (
  '40000000-0000-4000-8000-000000000002',
  'resend-terminal-bounce',
  'resend-terminal-bounce',
  'sent'
);

select * from public.record_resend_outbox_event(
  'resend-terminal-bounce', 'email.bounced', 'hard', 'Mailbox unavailable'
);
select * from public.record_resend_outbox_event(
  'resend-terminal-bounce', 'email.delivered', null, null
);
select * from public.record_resend_outbox_event(
  'resend-terminal-bounce', 'email.bounced', 'hard', 'Mailbox unavailable'
);
select * from public.record_resend_outbox_event(
  'resend-terminal-bounce', 'email.delivered', null, null
);

select pg_temp.assert_true(
  (select email_bounced
      and email_delivery_failures = 1
      and email_bounce_reason = 'hard: Mailbox unavailable'
   from public.profiles
   where id = '10000000-0000-4000-8000-000000000002'),
  'terminal bounce lost or duplicate callback inflated the failure count'
);
select pg_temp.assert_true(
  (select delivery_status = 'bounced'
      and status = 'failed'
      and jsonb_array_length(metadata -> 'processed_events') = 2
   from public.email_outbox
   where id = '30000000-0000-4000-8000-000000000002'),
  'terminal bounce did not remain the durable outbox winner'
);
select pg_temp.assert_true(
  (select status = 'bounced'
      and delivered_at is not null
      and bounced_at is not null
   from public.delivery_tracking
   where provider_id = 'resend-terminal-bounce'),
  'delivery tracking regressed after terminal bounce'
);

-- Complaint suppression and unsubscribe are part of the same transaction and
-- remain exactly-once under duplicate delivery.
insert into public.profiles (id, role) values (
  '10000000-0000-4000-8000-000000000003', 'patient'
);
insert into public.email_outbox (
  id, patient_id, email_type, status, provider_message_id
) values (
  '30000000-0000-4000-8000-000000000003',
  '10000000-0000-4000-8000-000000000003',
  'refill_reminder',
  'sent',
  'resend-complaint'
);
insert into public.delivery_tracking (
  id, message_id, provider_id, status
) values (
  '40000000-0000-4000-8000-000000000003',
  'resend-complaint',
  'resend-complaint',
  'sent'
);

select * from public.record_resend_outbox_event(
  'resend-complaint', 'email.complained', null, null
);
select * from public.record_resend_outbox_event(
  'resend-complaint', 'email.complained', null, null
);

select pg_temp.assert_true(
  (select email_bounced and email_delivery_failures = 1
   from public.profiles
   where id = '10000000-0000-4000-8000-000000000003'),
  'complaint suppression was missing or applied more than once'
);
select pg_temp.assert_true(
  (select not marketing_emails
      and not abandoned_checkout_emails
      and unsubscribe_reason = 'spam_complaint'
   from public.email_preferences
   where profile_id = '10000000-0000-4000-8000-000000000003'),
  'complaint unsubscribe was not committed with the receipt'
);
select pg_temp.assert_true(
  (select status = 'failed'
   from public.delivery_tracking
   where provider_id = 'resend-complaint'),
  'complaint was not mirrored to durable delivery tracking'
);

-- Inject one transactional mirror failure. The first receipt must roll back,
-- leaving a retry able to own and finish the event exactly once.
insert into public.profiles (id, role) values (
  '10000000-0000-4000-8000-000000000004', 'patient'
);
insert into public.email_outbox (
  id, patient_id, email_type, status, provider_message_id
) values (
  '30000000-0000-4000-8000-000000000004',
  '10000000-0000-4000-8000-000000000004',
  'refill_reminder',
  'sent',
  'resend-retry-after-mirror-failure'
);
insert into public.delivery_tracking (
  id, message_id, provider_id, status
) values (
  '40000000-0000-4000-8000-000000000004',
  'resend-retry-after-mirror-failure',
  'resend-retry-after-mirror-failure',
  'sent'
);

create sequence public.test_resend_mirror_failure_once;
create or replace function public.test_fail_first_resend_delivery_mirror()
returns trigger
language plpgsql
as $function$
begin
  if new.provider_id = 'resend-retry-after-mirror-failure'
    and nextval('public.test_resend_mirror_failure_once') = 1
  then
    raise exception 'injected resend mirror failure';
  end if;
  return new;
end;
$function$;
create trigger test_fail_first_resend_delivery_mirror
before update on public.delivery_tracking
for each row execute function public.test_fail_first_resend_delivery_mirror();

do $function$
begin
  perform * from public.record_resend_outbox_event(
    'resend-retry-after-mirror-failure',
    'email.complained',
    null,
    null
  );
  raise exception 'first mirror attempt unexpectedly succeeded';
exception
  when others then
    if sqlerrm <> 'injected resend mirror failure' then
      raise;
    end if;
end;
$function$;

select pg_temp.assert_true(
  (select delivery_status is null
      and not coalesce(
        metadata -> 'processed_events' ? 'resend-retry-after-mirror-failure:email.complained',
        false
      )
   from public.email_outbox
   where id = '30000000-0000-4000-8000-000000000004'),
  'failed mirror attempt committed its event receipt'
);
select pg_temp.assert_true(
  (select not email_bounced and email_delivery_failures = 0
   from public.profiles
   where id = '10000000-0000-4000-8000-000000000004'),
  'failed final mirror committed its earlier profile suppression'
);
select pg_temp.assert_true(
  not exists (
    select 1
    from public.email_preferences
    where profile_id = '10000000-0000-4000-8000-000000000004'
  ),
  'failed final mirror committed its earlier complaint unsubscribe'
);
select pg_temp.assert_true(
  (select status = 'sent'
   from public.delivery_tracking
   where provider_id = 'resend-retry-after-mirror-failure'),
  'failed delivery mirror changed durable tracking state'
);

select * from public.record_resend_outbox_event(
  'resend-retry-after-mirror-failure',
  'email.complained',
  null,
  null
);
select * from public.record_resend_outbox_event(
  'resend-retry-after-mirror-failure',
  'email.complained',
  null,
  null
);

select pg_temp.assert_true(
  (select email_bounced and email_delivery_failures = 1
   from public.profiles
   where id = '10000000-0000-4000-8000-000000000004'),
  'retry did not finish the rolled-back profile mirror exactly once'
);
select pg_temp.assert_true(
  (select not marketing_emails
      and not abandoned_checkout_emails
      and unsubscribe_reason = 'spam_complaint'
   from public.email_preferences
   where profile_id = '10000000-0000-4000-8000-000000000004'),
  'retry did not finish the rolled-back complaint unsubscribe'
);
select pg_temp.assert_true(
  (select delivery_status = 'complained'
      and status = 'failed'
      and (
        select count(*) = 1
        from pg_catalog.jsonb_array_elements_text(metadata -> 'processed_events') as event(value)
        where event.value = 'resend-retry-after-mirror-failure:email.complained'
      )
   from public.email_outbox
   where id = '30000000-0000-4000-8000-000000000004'),
  'retry did not durably own the rolled-back event'
);
select pg_temp.assert_true(
  (select status = 'failed'
   from public.delivery_tracking
   where provider_id = 'resend-retry-after-mirror-failure'),
  'retry did not finish the rolled-back delivery mirror'
);

-- Rows used by the shell runner's two real concurrent order checks.
insert into public.profiles (id, role) values
  ('10000000-0000-4000-8000-000000000005', 'patient'),
  ('10000000-0000-4000-8000-000000000006', 'patient');
insert into public.email_outbox (
  id, patient_id, email_type, status, provider_message_id
) values
  (
    '30000000-0000-4000-8000-000000000005',
    '10000000-0000-4000-8000-000000000005',
    'refill_reminder',
    'sent',
    'resend-concurrent-delivery-first'
  ),
  (
    '30000000-0000-4000-8000-000000000006',
    '10000000-0000-4000-8000-000000000006',
    'refill_reminder',
    'sent',
    'resend-concurrent-complaint-first'
  );
insert into public.delivery_tracking (
  id, message_id, provider_id, status
) values
  (
    '40000000-0000-4000-8000-000000000005',
    'resend-concurrent-delivery-first',
    'resend-concurrent-delivery-first',
    'sent'
  ),
  (
    '40000000-0000-4000-8000-000000000006',
    'resend-concurrent-complaint-first',
    'resend-concurrent-complaint-first',
    'sent'
  );
