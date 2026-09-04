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

-- Webhooks must create schema-complete tracking rows when the direct-send
-- fire-and-forget insert loses the race or the dispatcher never created one.
insert into public.profiles (id, role) values
  ('10000000-0000-4000-8000-000000000008', 'patient'),
  ('10000000-0000-4000-8000-000000000009', 'patient'),
  ('10000000-0000-4000-8000-000000000010', 'patient'),
  ('10000000-0000-4000-8000-000000000011', 'patient');
update public.profiles
set
  email_bounced = true,
  email_bounce_reason = 'hard: older message',
  email_delivery_failures = 2
where id = '10000000-0000-4000-8000-000000000010';
insert into public.issued_certificates (id) values (
  '20000000-0000-4000-8000-000000000009'
);
insert into public.email_outbox (
  id, patient_id, certificate_id, email_type, to_email, subject, status,
  provider_message_id, sent_at, retry_count
) values
  (
    '30000000-0000-4000-8000-000000000008',
    '10000000-0000-4000-8000-000000000008',
    null,
    'script_sent',
    'alexandra@example.test',
    'Script sent',
    'sent',
    'resend-absent-bounce',
    '2026-09-05T00:00:00Z',
    1
  ),
  (
    '30000000-0000-4000-8000-000000000009',
    '10000000-0000-4000-8000-000000000009',
    '20000000-0000-4000-8000-000000000009',
    'med_cert_patient',
    'bo@example.test',
    'Certificate ready',
    'sent',
    'resend-absent-open',
    '2026-09-05T00:01:00Z',
    1
  ),
  (
    '30000000-0000-4000-8000-000000000010',
    '10000000-0000-4000-8000-000000000010',
    null,
    'generic',
    'dispatcher@example.test',
    'Dispatcher delivery',
    'sent',
    'resend-dispatcher-finalized-delivery',
    '2026-09-05T00:02:00Z',
    3
  ),
  (
    '30000000-0000-4000-8000-000000000011',
    '10000000-0000-4000-8000-000000000011',
    null,
    'refill_reminder',
    'complaint@example.test',
    'Refill reminder',
    'sent',
    'resend-absent-complaint',
    '2026-09-05T00:03:00Z',
    1
  );

select * from public.record_resend_outbox_event(
  'resend-absent-bounce',
  'email.bounced',
  'hard',
  'Mailbox unavailable',
  '2026-09-05T00:00:30Z'
);
select * from public.record_resend_outbox_event(
  'resend-absent-open',
  'email.opened',
  null,
  null,
  '2026-09-05T00:01:30Z'
);
select * from public.record_resend_outbox_event(
  'resend-dispatcher-finalized-delivery',
  'email.delivered',
  null,
  null,
  '2026-09-05T00:02:30Z'
);
select * from public.record_resend_outbox_event(
  'resend-absent-complaint',
  'email.complained',
  null,
  null,
  '2026-09-05T00:03:30Z'
);

select pg_temp.assert_true(
  (select status = 'bounced'
      and bounced_at = '2026-09-05T00:00:30Z'
      and channel = 'email'
      and template_type = 'script_sent'
      and recipient = 'a***a@example.test'
      and patient_id = '10000000-0000-4000-8000-000000000008'
      and sent_at = '2026-09-05T00:00:00Z'
      and attempt_number = 1
   from public.delivery_tracking
   where message_id = 'resend-absent-bounce'),
  'first bounce did not create durable delivery tracking'
);
select pg_temp.assert_true(
  (select status = 'opened'
      and opened_at = '2026-09-05T00:01:30Z'
      and template_type = 'med_cert_patient'
      and recipient = '***@example.test'
   from public.delivery_tracking
   where message_id = 'resend-absent-open'),
  'first open did not create durable delivery tracking'
);
select pg_temp.assert_true(
  (select email_opened_at = '2026-09-05T00:01:30Z'
   from public.issued_certificates
   where id = '20000000-0000-4000-8000-000000000009'),
  'certificate open did not use the signed provider event timestamp'
);
select pg_temp.assert_true(
  (select status = 'delivered'
      and delivered_at = '2026-09-05T00:02:30Z'
      and template_type = 'generic'
      and recipient = 'd***r@example.test'
      and attempt_number = 3
   from public.delivery_tracking
   where message_id = 'resend-dispatcher-finalized-delivery'),
  'dispatcher-finalized outbox did not create durable delivery tracking'
);
select pg_temp.assert_true(
  (select not email_bounced
      and email_bounce_reason is null
      and email_delivery_failures = 0
   from public.profiles
   where id = '10000000-0000-4000-8000-000000000010'),
  'first delivery did not clear a genuinely stale prior bounce'
);
select pg_temp.assert_true(
  (select status = 'failed'
      and error_message = 'Complaint received'
      and template_type = 'refill_reminder'
      and recipient = 'c***t@example.test'
   from public.delivery_tracking
   where message_id = 'resend-absent-complaint'),
  'first complaint did not create durable delivery tracking'
);
select pg_temp.assert_true(
  (select email_bounced_at = '2026-09-05T00:03:30Z'
   from public.profiles
   where id = '10000000-0000-4000-8000-000000000011'),
  'complaint suppression did not use the signed provider event timestamp'
);

-- A direct-send insert that finishes after the webhook must be rejected by
-- message_id uniqueness, not regress the terminal state back to sent.
do $function$
begin
  insert into public.delivery_tracking (
    id, message_id, channel, template_type, provider_id, recipient, status
  )
  values (
    '40000000-0000-4000-8000-000000000008',
    'resend-absent-bounce',
    'email',
    'script_sent',
    'resend-absent-bounce',
    'a***a@example.test',
    'sent'
  );
exception
  when unique_violation then null;
end;
$function$;
select pg_temp.assert_true(
  (select status = 'bounced' and bounced_at is not null
   from public.delivery_tracking
   where message_id = 'resend-absent-bounce'),
  'late direct-send tracking insert regressed a webhook terminal state'
);

-- Legacy receipts written before tracking-upsert ownership must heal on an
-- exact duplicate without repeating patient failure counts or unsubscribe
-- side effects. Cover both a missing row and a stale late-arriving sent row.
insert into public.profiles (
  id, role, email_bounced, email_bounce_reason, email_bounced_at,
  email_delivery_failures
) values
  (
    '10000000-0000-4000-8000-000000000012',
    'patient',
    true,
    'hard: Mailbox unavailable',
    '2026-09-05T00:04:00Z',
    1
  ),
  (
    '10000000-0000-4000-8000-000000000013',
    'patient',
    true,
    'complaint: Spam complaint',
    '2026-09-05T00:05:00Z',
    1
  );
insert into public.email_preferences (
  profile_id, marketing_emails, abandoned_checkout_emails,
  unsubscribed_at, unsubscribe_reason, updated_at
) values (
  '10000000-0000-4000-8000-000000000013',
  false,
  false,
  '2026-09-05T00:05:00Z',
  'spam_complaint',
  '2026-09-05T00:05:00Z'
);
insert into public.email_outbox (
  id, patient_id, email_type, to_email, subject, status,
  provider_message_id, sent_at, delivery_status, metadata
) values
  (
    '30000000-0000-4000-8000-000000000012',
    '10000000-0000-4000-8000-000000000012',
    'script_sent',
    'legacy-bounce@example.test',
    'Script sent',
    'failed',
    'resend-legacy-duplicate-bounce',
    '2026-09-05T00:04:00Z',
    'bounced',
    '{"processed_events":["resend-legacy-duplicate-bounce:email.bounced"]}'::jsonb
  ),
  (
    '30000000-0000-4000-8000-000000000013',
    '10000000-0000-4000-8000-000000000013',
    'refill_reminder',
    'legacy-complaint@example.test',
    'Refill reminder',
    'failed',
    'resend-legacy-duplicate-complaint',
    '2026-09-05T00:05:00Z',
    'complained',
    '{"processed_events":["resend-legacy-duplicate-complaint:email.complained"]}'::jsonb
  );
insert into public.delivery_tracking (
  id, message_id, channel, template_type, provider_id, recipient, status, sent_at
) values (
  '40000000-0000-4000-8000-000000000013',
  'resend-legacy-duplicate-complaint',
  'email',
  'refill_reminder',
  'resend-legacy-duplicate-complaint',
  'l***t@example.test',
  'sent',
  '2026-09-05T00:05:00Z'
);

create temporary table duplicate_absent_tracking_result as
select * from public.record_resend_outbox_event(
  'resend-legacy-duplicate-bounce',
  'email.bounced',
  'hard',
  'Mailbox unavailable'
);
create temporary table duplicate_stale_tracking_result as
select * from public.record_resend_outbox_event(
  'resend-legacy-duplicate-complaint',
  'email.complained',
  null,
  null
);

select pg_temp.assert_true(
  (select matched and duplicate from duplicate_absent_tracking_result),
  'legacy missing-row retry was not recognized as a duplicate receipt'
);
select pg_temp.assert_true(
  (select status = 'bounced' and bounced_at is not null
   from public.delivery_tracking
   where message_id = 'resend-legacy-duplicate-bounce'),
  'legacy duplicate did not create its missing terminal tracking row'
);
select pg_temp.assert_true(
  (select email_delivery_failures = 1
      and email_bounced_at = '2026-09-05T00:04:00Z'
   from public.profiles
   where id = '10000000-0000-4000-8000-000000000012'),
  'legacy duplicate reapplied patient bounce suppression'
);
select pg_temp.assert_true(
  (select matched and duplicate from duplicate_stale_tracking_result),
  'legacy stale-row retry was not recognized as a duplicate receipt'
);
select pg_temp.assert_true(
  (select status = 'failed' and error_message = 'Complaint received'
   from public.delivery_tracking
   where message_id = 'resend-legacy-duplicate-complaint'),
  'legacy duplicate did not heal its stale sent tracking row'
);
select pg_temp.assert_true(
  (select email_delivery_failures = 1
      and email_bounced_at = '2026-09-05T00:05:00Z'
   from public.profiles
   where id = '10000000-0000-4000-8000-000000000013'),
  'legacy complaint duplicate reapplied patient suppression'
);
select pg_temp.assert_true(
  (select unsubscribed_at = '2026-09-05T00:05:00Z'
      and updated_at = '2026-09-05T00:05:00Z'
   from public.email_preferences
   where profile_id = '10000000-0000-4000-8000-000000000013'),
  'legacy complaint duplicate reapplied unsubscribe side effects'
);

insert into public.profiles (id, role) values (
  '10000000-0000-4000-8000-000000000018', 'patient'
);
insert into public.issued_certificates (id, email_opened_at) values (
  '20000000-0000-4000-8000-000000000018',
  '2026-09-05T00:06:00Z'
);
insert into public.email_outbox (
  id, patient_id, certificate_id, email_type, to_email, subject, status,
  provider_message_id, sent_at, delivery_status, metadata
) values (
  '30000000-0000-4000-8000-000000000018',
  '10000000-0000-4000-8000-000000000018',
  '20000000-0000-4000-8000-000000000018',
  'med_cert_patient',
  'legacy-open@example.test',
  'Certificate ready',
  'sent',
  'resend-legacy-duplicate-open',
  '2026-09-05T00:05:30Z',
  'opened',
  '{"processed_events":["resend-legacy-duplicate-open:email.opened"]}'::jsonb
);
create temporary table duplicate_open_tracking_result as
select * from public.record_resend_outbox_event(
  'resend-legacy-duplicate-open',
  'email.opened',
  null,
  null,
  '2026-09-05T00:06:30Z'
);
select pg_temp.assert_true(
  (select matched and duplicate from duplicate_open_tracking_result),
  'legacy open retry was not recognized as a duplicate receipt'
);
select pg_temp.assert_true(
  (select status = 'opened' and opened_at = '2026-09-05T00:06:30Z'
   from public.delivery_tracking
   where message_id = 'resend-legacy-duplicate-open'),
  'legacy open duplicate did not create its missing tracking row'
);
select pg_temp.assert_true(
  (select email_opened_at = '2026-09-05T00:06:00Z'
   from public.issued_certificates
   where id = '20000000-0000-4000-8000-000000000018'),
  'legacy open duplicate replaced the first certificate-open timestamp'
);
select pg_temp.assert_true(
  (select jsonb_array_length(metadata -> 'processed_events') = 1
   from public.email_outbox
   where id = '30000000-0000-4000-8000-000000000018'),
  'legacy open duplicate appended a second processed-event receipt'
);

-- A late delivery for an older message must not clear a newer message's
-- terminal bounce, even when the older delivery callback itself arrives last.
insert into public.profiles (id, role) values (
  '10000000-0000-4000-8000-000000000014', 'patient'
);
insert into public.email_outbox (
  id, patient_id, email_type, to_email, subject, status,
  provider_message_id, sent_at
) values
  (
    '30000000-0000-4000-8000-000000000014',
    '10000000-0000-4000-8000-000000000014',
    'refill_reminder',
    'cross-message@example.test',
    'Older reminder',
    'sent',
    'resend-cross-message-older',
    '2026-09-05T00:00:00Z'
  ),
  (
    '30000000-0000-4000-8000-000000000015',
    '10000000-0000-4000-8000-000000000014',
    'refill_reminder',
    'cross-message@example.test',
    'Newer reminder',
    'sent',
    'resend-cross-message-newer',
    '2026-09-05T01:00:00Z'
  );

select * from public.record_resend_outbox_event(
  'resend-cross-message-older',
  'email.opened',
  null,
  null,
  '2026-09-05T00:10:00Z'
);
select * from public.record_resend_outbox_event(
  'resend-cross-message-newer',
  'email.bounced',
  'hard',
  'Mailbox unavailable',
  '2026-09-05T01:10:00Z'
);
select * from public.record_resend_outbox_event(
  'resend-cross-message-older',
  'email.delivered',
  null,
  null,
  '2026-09-05T02:00:00Z'
);

select pg_temp.assert_true(
  (select email_bounced
      and email_delivery_failures = 1
      and email_bounced_at = '2026-09-05T01:10:00Z'
   from public.profiles
   where id = '10000000-0000-4000-8000-000000000014'),
  'older message delivery cleared a newer terminal bounce'
);

-- Distinct-message terminal callbacks may also arrive in reverse order. The
-- older callback counts as a separate failed message but must not replace the
-- newer suppression timestamp or reason used by delivery ordering guards.
insert into public.profiles (id, role) values (
  '10000000-0000-4000-8000-000000000016', 'patient'
);
insert into public.email_outbox (
  id, patient_id, email_type, to_email, subject, status,
  provider_message_id, sent_at
) values
  (
    '30000000-0000-4000-8000-000000000016',
    '10000000-0000-4000-8000-000000000016',
    'refill_reminder',
    'reverse-bounces@example.test',
    'Older reminder',
    'sent',
    'resend-reverse-bounce-older',
    '2026-09-05T00:00:00Z'
  ),
  (
    '30000000-0000-4000-8000-000000000017',
    '10000000-0000-4000-8000-000000000016',
    'refill_reminder',
    'reverse-bounces@example.test',
    'Newer reminder',
    'sent',
    'resend-reverse-bounce-newer',
    '2026-09-05T02:00:00Z'
  );

select * from public.record_resend_outbox_event(
  'resend-reverse-bounce-newer',
  'email.bounced',
  'hard',
  'Newer failure',
  '2026-09-05T02:10:00Z'
);
select * from public.record_resend_outbox_event(
  'resend-reverse-bounce-older',
  'email.bounced',
  'soft',
  'Older failure',
  '2026-09-05T00:10:00Z'
);

select pg_temp.assert_true(
  (select email_bounced
      and email_delivery_failures = 2
      and email_bounced_at = '2026-09-05T02:10:00Z'
      and email_bounce_reason = 'hard: Newer failure'
   from public.profiles
   where id = '10000000-0000-4000-8000-000000000016'),
  'older bounce replaced newer suppression ordering evidence'
);

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
  id, patient_id, certificate_id, email_type, to_email, subject, status,
  provider_message_id
) values (
  '30000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  'med_cert_patient',
  'open@example.test',
  'Certificate ready',
  'sent',
  'resend-stale-bounce'
);
insert into public.delivery_tracking (
  id, message_id, channel, template_type, provider_id, recipient, status
) values (
  '40000000-0000-4000-8000-000000000001',
  'resend-stale-bounce',
  'email',
  'med_cert_patient',
  'resend-stale-bounce',
  'o***n@example.test',
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
  id, patient_id, email_type, to_email, subject, status, provider_message_id
) values (
  '30000000-0000-4000-8000-000000000007',
  '10000000-0000-4000-8000-000000000007',
  'refill_reminder',
  'click@example.test',
  'Refill reminder',
  'sent',
  'resend-stale-bounce-click'
);
insert into public.delivery_tracking (
  id, message_id, channel, template_type, provider_id, recipient, status
) values (
  '40000000-0000-4000-8000-000000000007',
  'resend-stale-bounce-click',
  'email',
  'refill_reminder',
  'resend-stale-bounce-click',
  'c***k@example.test',
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
  id, patient_id, email_type, to_email, subject, status, provider_message_id
) values (
  '30000000-0000-4000-8000-000000000002',
  '10000000-0000-4000-8000-000000000002',
  'refill_reminder',
  'bounce@example.test',
  'Refill reminder',
  'sent',
  'resend-terminal-bounce'
);
insert into public.delivery_tracking (
  id, message_id, channel, template_type, provider_id, recipient, status
) values (
  '40000000-0000-4000-8000-000000000002',
  'resend-terminal-bounce',
  'email',
  'refill_reminder',
  'resend-terminal-bounce',
  'b***e@example.test',
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
  id, patient_id, email_type, to_email, subject, status, provider_message_id
) values (
  '30000000-0000-4000-8000-000000000003',
  '10000000-0000-4000-8000-000000000003',
  'refill_reminder',
  'complaint-three@example.test',
  'Refill reminder',
  'sent',
  'resend-complaint'
);
insert into public.delivery_tracking (
  id, message_id, channel, template_type, provider_id, recipient, status
) values (
  '40000000-0000-4000-8000-000000000003',
  'resend-complaint',
  'email',
  'refill_reminder',
  'resend-complaint',
  'c***e@example.test',
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
  id, patient_id, email_type, to_email, subject, status, provider_message_id
) values (
  '30000000-0000-4000-8000-000000000004',
  '10000000-0000-4000-8000-000000000004',
  'refill_reminder',
  'retry@example.test',
  'Refill reminder',
  'sent',
  'resend-retry-after-mirror-failure'
);
insert into public.delivery_tracking (
  id, message_id, channel, template_type, provider_id, recipient, status
) values (
  '40000000-0000-4000-8000-000000000004',
  'resend-retry-after-mirror-failure',
  'email',
  'refill_reminder',
  'resend-retry-after-mirror-failure',
  'r***y@example.test',
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
  id, patient_id, email_type, to_email, subject, status, provider_message_id
) values
  (
    '30000000-0000-4000-8000-000000000005',
    '10000000-0000-4000-8000-000000000005',
    'refill_reminder',
    'delivery-first@example.test',
    'Refill reminder',
    'sent',
    'resend-concurrent-delivery-first'
  ),
  (
    '30000000-0000-4000-8000-000000000006',
    '10000000-0000-4000-8000-000000000006',
    'refill_reminder',
    'complaint-first@example.test',
    'Refill reminder',
    'sent',
    'resend-concurrent-complaint-first'
  );
insert into public.delivery_tracking (
  id, message_id, channel, template_type, provider_id, recipient, status
) values
  (
    '40000000-0000-4000-8000-000000000005',
    'resend-concurrent-delivery-first',
    'email',
    'refill_reminder',
    'resend-concurrent-delivery-first',
    'd***t@example.test',
    'sent'
  ),
  (
    '40000000-0000-4000-8000-000000000006',
    'resend-concurrent-complaint-first',
    'email',
    'refill_reminder',
    'resend-concurrent-complaint-first',
    'c***t@example.test',
    'sent'
  );
