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

select pg_temp.assert_true(
  pg_catalog.to_regclass('public.idx_auth_email_events_provider_message_id')
    is not null,
  'auth lifecycle ownership lookup index is missing'
);

-- Webhooks must create schema-complete tracking rows when the direct-send
-- fire-and-forget insert loses the race or the dispatcher never created one.
insert into public.profiles (id, role, email) values
  ('10000000-0000-4000-8000-000000000008', 'patient', 'alexandra@example.test'),
  ('10000000-0000-4000-8000-000000000009', 'patient', 'bo@example.test'),
  ('10000000-0000-4000-8000-000000000010', 'patient', 'dispatcher@example.test'),
  ('10000000-0000-4000-8000-000000000011', 'patient', 'complaint@example.test');
update public.profiles
set
  email_bounced = true,
  email_bounce_reason = 'hard: older message',
  email_delivery_failures = 2
where id = '10000000-0000-4000-8000-000000000010';
insert into public.issued_certificates (id, email_delivery_id) values (
  '20000000-0000-4000-8000-000000000009',
  'resend-absent-open'
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
-- Match the frozen document-version metadata written by the real sender.
update public.email_outbox as outbox
set metadata = coalesce(outbox.metadata, '{}'::jsonb) || jsonb_build_object(
  'certificate_storage_version', left(encode(extensions.digest(certificate.storage_path, 'sha256'), 'hex'), 32)
)
from public.issued_certificates as certificate
where certificate.id = outbox.certificate_id
  and outbox.provider_message_id = 'resend-absent-open';
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
  (select status = 'delivered'
      and error_message is null
      and template_type = 'refill_reminder'
      and recipient = 'c***t@example.test'
   from public.delivery_tracking
   where message_id = 'resend-absent-complaint'),
  'first complaint did not create durable delivery tracking'
);
select pg_temp.assert_true(
  (select not profile.email_bounced
      and profile.email_bounced_at is null
      and not preferences.marketing_emails
      and preferences.unsubscribe_reason = 'spam_complaint'
   from public.profiles as profile
   join public.email_preferences as preferences on preferences.profile_id = profile.id
   where profile.id = '10000000-0000-4000-8000-000000000011'),
  'complaint did not retain delivered address state and sticky consent'
);

-- A single provider Transient/Undetermined bounce is a delivery failure but
-- never a permanent profile suppression. The runtime 3-in-24h gate owns
-- temporary soft-bounce blocking; profile.email_bounced is hard/provider only.
insert into public.profiles (id, role, email) values (
  '10000000-0000-4000-8000-000000000026',
  'patient',
  'single-soft@example.test'
);
insert into public.email_outbox (
  id, patient_id, email_type, to_email, subject, status,
  provider_message_id, created_at, sent_at
) values (
  '30000000-0000-4000-8000-000000000056',
  '10000000-0000-4000-8000-000000000026',
  'refill_reminder',
  'single-soft@example.test',
  'Soft bounce policy',
  'sent',
  'resend-single-soft-bounce',
  '2026-09-05T00:04:00Z',
  '2026-09-05T00:04:00Z'
);
select * from public.record_resend_outbox_event(
  'resend-single-soft-bounce',
  'email.bounced',
  'soft',
  'Temporary recipient issue',
  '2026-09-05T00:04:30Z'
);
select pg_temp.assert_true(
  (select not email_bounced
      and email_bounce_reason is null
      and email_bounced_at is null
      and email_delivery_failures = 1
   from public.profiles
   where id = '10000000-0000-4000-8000-000000000026'),
  'one soft bounce permanently suppressed the patient profile'
);
select pg_temp.assert_true(
  (select delivery_status = 'bounced'
      and metadata ->> 'bounce_type' = 'soft'
      and retry_count = 10
   from public.email_outbox
   where id = '30000000-0000-4000-8000-000000000056'),
  'soft bounce did not remain durable delivery evidence'
);

-- Before bounce normalization, a real Resend Permanent event could be stored
-- with the raw provider type nested beside an incorrectly derived soft alias.
-- Recompute must treat either hard signal as permanent suppression.
insert into public.profiles (id, role, email) values (
  '10000000-0000-4000-8000-000000000027',
  'patient',
  'legacy-permanent@example.test'
);
insert into public.email_outbox (
  id, patient_id, email_type, to_email, subject, status,
  provider_message_id, error_message, metadata, created_at, sent_at,
  delivery_status, delivery_status_updated_at
) values
  (
    '30000000-0000-4000-8000-000000000057',
    '10000000-0000-4000-8000-000000000027',
    'refill_reminder',
    'legacy-permanent@example.test',
    'Older recompute trigger',
    'sent',
    'resend-legacy-permanent-trigger',
    null,
    '{}'::jsonb,
    '2026-09-05T00:04:00Z',
    '2026-09-05T00:04:00Z',
    null,
    null
  ),
  (
    '30000000-0000-4000-8000-000000000058',
    '10000000-0000-4000-8000-000000000027',
    'refill_reminder',
    'legacy-permanent@example.test',
    'Legacy permanent bounce',
    'failed',
    'resend-legacy-permanent',
    'Legacy permanent failure',
    pg_catalog.jsonb_build_object(
      'bounce_type', 'soft',
      'bounce', pg_catalog.jsonb_build_object(
        'type', 'Permanent',
        'message', 'Legacy permanent failure'
      )
    ),
    '2026-09-05T00:05:00Z',
    '2026-09-05T00:05:00Z',
    'bounced',
    '2026-09-05T00:05:30Z'
  );
select * from public.record_resend_outbox_event(
  'resend-legacy-permanent-trigger',
  'email.opened',
  null,
  null,
  '2026-09-05T00:04:30Z'
);
select pg_temp.assert_true(
  (select email_bounced
      and email_bounce_reason = 'hard: Legacy permanent failure'
      and email_bounced_at = '2026-09-05T00:05:30Z'
      and email_delivery_failures = 0
   from public.profiles
   where id = '10000000-0000-4000-8000-000000000027'),
  'legacy raw Permanent bounce was shadowed by its incorrect soft alias'
);

-- App bookkeeping can mark a row failed after an ambiguous provider response.
-- Later signed delivery evidence heals that non-terminal failure, including a
-- stale failed tracking row; a real provider terminal state remains sticky.
insert into public.profiles (id, role, email) values
  (
    '10000000-0000-4000-8000-000000000028',
    'patient',
    'failed-heal@example.test'
  ),
  (
    '10000000-0000-4000-8000-000000000029',
    'patient',
    'provider-failed@example.test'
  ),
  (
    '10000000-0000-4000-8000-000000000030',
    'patient',
    'provider-suppressed@example.test'
  );
insert into public.email_outbox (
  id, patient_id, email_type, to_email, subject, status,
  provider_message_id, error_message, created_at, sent_at
) values
  (
    '30000000-0000-4000-8000-000000000059',
    '10000000-0000-4000-8000-000000000028',
    'refill_reminder',
    'failed-heal@example.test',
    'Ambiguous send',
    'failed',
    'resend-app-failed-then-delivered',
    'Application send state was ambiguous',
    '2026-09-05T00:06:00Z',
    '2026-09-05T00:06:00Z'
  ),
  (
    '30000000-0000-4000-8000-000000000060',
    '10000000-0000-4000-8000-000000000029',
    'refill_reminder',
    'provider-failed@example.test',
    'Provider failure',
    'sent',
    'resend-provider-failed',
    null,
    '2026-09-05T00:07:00Z',
    '2026-09-05T00:07:00Z'
  ),
  (
    '30000000-0000-4000-8000-000000000061',
    '10000000-0000-4000-8000-000000000030',
    'refill_reminder',
    'provider-suppressed@example.test',
    'Provider suppression',
    'sent',
    'resend-provider-suppressed',
    null,
    '2026-09-05T00:08:00Z',
    '2026-09-05T00:08:00Z'
  );
insert into public.delivery_tracking (
  id, message_id, patient_id, channel, template_type, provider_id, recipient,
  status, error_message
) values (
  '40000000-0000-4000-8000-000000000059',
  'resend-app-failed-then-delivered',
  '10000000-0000-4000-8000-000000000028',
  'email',
  'refill_reminder',
  'resend-app-failed-then-delivered',
  'f***l@example.test',
  'failed',
  'Application send state was ambiguous'
);

select * from public.record_resend_outbox_event(
  'resend-app-failed-then-delivered',
  'email.delivered',
  null,
  null,
  '2026-09-05T00:06:30Z'
);
select * from public.record_resend_outbox_event(
  'resend-provider-failed',
  'email.failed',
  null,
  'reached_daily_quota',
  '2026-09-05T00:07:30Z'
);
select * from public.record_resend_outbox_event(
  'resend-provider-suppressed',
  'email.suppressed',
  null,
  'Address is on the account suppression list',
  '2026-09-05T00:08:30Z',
  'OnAccountSuppressionList'
);

select pg_temp.assert_true(
  (select status = 'sent'
      and delivery_status = 'delivered'
      and error_message is null
   from public.email_outbox
   where id = '30000000-0000-4000-8000-000000000059'),
  'authoritative delivery did not heal a non-terminal failed outbox row'
);
select pg_temp.assert_true(
  (select status = 'delivered'
      and delivered_at = '2026-09-05T00:06:30Z'
      and error_message is null
   from public.delivery_tracking
   where message_id = 'resend-app-failed-then-delivered'),
  'authoritative delivery did not heal stale failed tracking'
);
select pg_temp.assert_true(
  (select not email_bounced and email_delivery_failures = 0
   from public.profiles
   where id = '10000000-0000-4000-8000-000000000029'),
  'generic provider failure permanently suppressed the patient address'
);
select pg_temp.assert_true(
  (select status = 'failed'
      and delivery_status = 'failed'
      and retry_count = 10
      and error_message = 'reached_daily_quota'
      and metadata -> 'failed' ->> 'reason' = 'reached_daily_quota'
   from public.email_outbox
   where id = '30000000-0000-4000-8000-000000000060'),
  'provider failure was not recorded durably'
);
select pg_temp.assert_true(
  (select status = 'failed' and error_message = 'reached_daily_quota'
   from public.delivery_tracking
   where message_id = 'resend-provider-failed'),
  'provider failure did not create failed delivery tracking'
);
select pg_temp.assert_true(
  (select email_bounced
      and email_delivery_failures = 0
      and email_bounce_reason =
        'suppressed: OnAccountSuppressionList: Address is on the account suppression list'
   from public.profiles
   where id = '10000000-0000-4000-8000-000000000030'),
  'provider suppression did not make the current address non-deliverable'
);
select pg_temp.assert_true(
  (select status = 'failed'
      and delivery_status = 'suppressed'
      and retry_count = 10
      and metadata -> 'suppressed' ->> 'type' = 'OnAccountSuppressionList'
      and metadata -> 'suppressed' ->> 'message' =
        'Address is on the account suppression list'
   from public.email_outbox
   where id = '30000000-0000-4000-8000-000000000061'),
  'provider suppression was not recorded durably'
);
select pg_temp.assert_true(
  (select status = 'failed'
      and error_message = 'Address is on the account suppression list'
   from public.delivery_tracking
   where message_id = 'resend-provider-suppressed'),
  'provider suppression did not create failed delivery tracking'
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
  id, role, email, email_bounced, email_bounce_reason, email_bounced_at,
  email_delivery_failures
) values
  (
    '10000000-0000-4000-8000-000000000012',
    'patient',
    'legacy-bounce@example.test',
    true,
    'hard: Mailbox unavailable',
    '2026-09-05T00:04:00Z',
    1
  ),
  (
    '10000000-0000-4000-8000-000000000013',
    'patient',
    'legacy-complaint@example.test',
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
  null,
  '2026-09-05T00:05:00Z'
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
  (select status = 'sent' and delivery_status = 'complained'
   from public.email_outbox
   where provider_message_id = 'resend-legacy-duplicate-complaint'),
  'legacy complaint duplicate did not heal false undelivered outbox status'
);
select pg_temp.assert_true(
  (select status = 'delivered' and error_message is null
   from public.delivery_tracking
   where message_id = 'resend-legacy-duplicate-complaint'),
  'legacy duplicate did not heal its stale sent tracking row'
);
select pg_temp.assert_true(
  (select not email_bounced and email_delivery_failures = 0
      and email_bounced_at = '2026-09-05T00:05:00Z'
   from public.profiles
   where id = '10000000-0000-4000-8000-000000000013'),
  'legacy complaint duplicate reapplied patient suppression'
);
select pg_temp.assert_true(
  (select unsubscribed_at = '2026-09-05T00:05:00Z'
      and preferences_changed_at = '2026-09-05T00:05:00Z'
   from public.email_preferences
   where profile_id = '10000000-0000-4000-8000-000000000013'),
  'legacy complaint duplicate reapplied unsubscribe side effects'
);

insert into public.profiles (id, role, email) values (
  '10000000-0000-4000-8000-000000000018',
  'patient',
  'legacy-open@example.test'
);
insert into public.issued_certificates (
  id, email_delivery_id, email_opened_at
) values (
  '20000000-0000-4000-8000-000000000018',
  'resend-legacy-duplicate-open',
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
-- Match the frozen document-version metadata written by the real sender.
update public.email_outbox as outbox
set metadata = coalesce(outbox.metadata, '{}'::jsonb) || jsonb_build_object(
  'certificate_storage_version', left(encode(extensions.digest(certificate.storage_path, 'sha256'), 'hex'), 32)
)
from public.issued_certificates as certificate
where certificate.id = outbox.certificate_id
  and outbox.provider_message_id = 'resend-legacy-duplicate-open';
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
insert into public.profiles (id, role, email) values (
  '10000000-0000-4000-8000-000000000014',
  'patient',
  'cross-message@example.test'
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
      and email_delivery_failures = 0
      and email_bounced_at = '2026-09-05T01:10:00Z'
   from public.profiles
   where id = '10000000-0000-4000-8000-000000000014'),
  'older message delivery cleared a newer terminal bounce'
);

-- Distinct-message terminal callbacks may also arrive in reverse order. The
-- older callback counts as a separate failed message but must not replace the
-- newer suppression timestamp or reason used by delivery ordering guards.
insert into public.profiles (id, role, email) values (
  '10000000-0000-4000-8000-000000000016',
  'patient',
  'reverse-bounces@example.test'
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
  '2026-09-05T03:10:00Z'
);

select pg_temp.assert_true(
  (select email_bounced
      and email_delivery_failures = 0
      and email_bounced_at = '2026-09-05T02:10:00Z'
      and email_bounce_reason = 'hard: Newer failure'
   from public.profiles
   where id = '10000000-0000-4000-8000-000000000016'),
  'older bounce replaced newer suppression ordering evidence'
);

-- An open callback may outrun delivery. Delivery still clears a bounce
-- inherited from an older message, while the richer outbox state stays intact.
insert into public.profiles (
  id, role, email, email_bounced, email_bounce_reason, email_delivery_failures
) values (
  '10000000-0000-4000-8000-000000000001',
  'patient',
  'open@example.test',
  true,
  'hard: older message',
  2
);
insert into public.issued_certificates (id, email_delivery_id) values (
  '20000000-0000-4000-8000-000000000001',
  'resend-stale-bounce'
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

-- Match the frozen document-version metadata written by the real sender.
update public.email_outbox as outbox
set metadata = coalesce(outbox.metadata, '{}'::jsonb) || jsonb_build_object(
  'certificate_storage_version', left(encode(extensions.digest(certificate.storage_path, 'sha256'), 'hex'), 32)
)
from public.issued_certificates as certificate
where certificate.id = outbox.certificate_id
  and outbox.provider_message_id = 'resend-stale-bounce';
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
  id, role, email, email_bounced, email_bounce_reason, email_delivery_failures
) values (
  '10000000-0000-4000-8000-000000000007',
  'patient',
  'click@example.test',
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
insert into public.profiles (id, role, email) values (
  '10000000-0000-4000-8000-000000000002',
  'patient',
  'bounce@example.test'
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
      and email_delivery_failures = 0
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
insert into public.profiles (id, role, email) values (
  '10000000-0000-4000-8000-000000000003',
  'patient',
  'complaint-three@example.test'
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
  (select not email_bounced and email_delivery_failures = 0
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
  (select status = 'delivered'
   from public.delivery_tracking
   where provider_id = 'resend-complaint'),
  'complaint was not mirrored to durable delivery tracking'
);

-- Inject one transactional mirror failure. The first receipt must roll back,
-- leaving a retry able to own and finish the event exactly once.
insert into public.profiles (id, role, email) values (
  '10000000-0000-4000-8000-000000000004',
  'patient',
  'retry@example.test'
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
  (select not email_bounced and email_delivery_failures = 0
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
      and status = 'sent'
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
  (select status = 'delivered'
   from public.delivery_tracking
   where provider_id = 'resend-retry-after-mirror-failure'),
  'retry did not finish the rolled-back delivery mirror'
);

-- Message-attempt order, not callback arrival time, owns address suppression.
-- A delayed terminal callback from an older attempt must not re-suppress an
-- address after a newer attempt has durably delivered.
insert into public.profiles (id, role, email) values (
  '10000000-0000-4000-8000-000000000019',
  'patient',
  'ordering@example.test'
);
insert into public.email_outbox (
  id, patient_id, email_type, to_email, subject, status,
  provider_message_id, created_at, sent_at
) values
  (
    '30000000-0000-4000-8000-000000000019',
    '10000000-0000-4000-8000-000000000019',
    'refill_reminder',
    'ordering@example.test',
    'Older reminder',
    'sent',
    'resend-newer-success-older-bounce',
    '2026-09-05T00:00:00Z',
    '2026-09-05T00:00:00Z'
  ),
  (
    '30000000-0000-4000-8000-000000000020',
    '10000000-0000-4000-8000-000000000019',
    'refill_reminder',
    'ordering@example.test',
    'Newer reminder',
    'sent',
    'resend-newer-success',
    '2026-09-05T01:00:00Z',
    '2026-09-05T01:00:00Z'
  );

select * from public.record_resend_outbox_event(
  'resend-newer-success',
  'email.delivered',
  null,
  null,
  '2026-09-05T01:10:00Z'
);
select * from public.record_resend_outbox_event(
  'resend-newer-success-older-bounce',
  'email.bounced',
  'hard',
  'Delayed older failure',
  '2026-09-05T02:10:00Z'
);

select pg_temp.assert_true(
  (select not email_bounced
      and email_bounce_reason is null
      and email_delivery_failures = 0
   from public.profiles
   where id = '10000000-0000-4000-8000-000000000019'),
  'older delayed bounce re-suppressed an address after a newer delivery'
);
select pg_temp.assert_true(
  (select count(*) = 2
      and bool_and(delivery_status is not null)
   from public.email_outbox
   where patient_id = '10000000-0000-4000-8000-000000000019'),
  'cross-message ordering lost either durable outbox outcome'
);

-- Bounce and complaint side effects belong to the current normalized address,
-- not merely the patient id retained on an old outbox. A valid current-address
-- complaint preference remains sticky after later success.
insert into public.profiles (id, role, email) values (
  '10000000-0000-4000-8000-000000000020',
  'patient',
  'new-address@example.test'
);
insert into public.email_outbox (
  id, patient_id, email_type, to_email, subject, status,
  provider_message_id, created_at, sent_at
) values
  (
    '30000000-0000-4000-8000-000000000021',
    '10000000-0000-4000-8000-000000000020',
    'refill_reminder',
    'old-address@example.test',
    'Old-address bounce',
    'sent',
    'resend-old-address-bounce',
    '2026-09-05T00:00:00Z',
    '2026-09-05T00:00:00Z'
  ),
  (
    '30000000-0000-4000-8000-000000000022',
    '10000000-0000-4000-8000-000000000020',
    'refill_reminder',
    'old-address@example.test',
    'Old-address delivery',
    'sent',
    'resend-old-address-delivery',
    '2026-09-05T00:01:00Z',
    '2026-09-05T00:01:00Z'
  ),
  (
    '30000000-0000-4000-8000-000000000023',
    '10000000-0000-4000-8000-000000000020',
    'refill_reminder',
    'old-address@example.test',
    'Old-address complaint',
    'sent',
    'resend-old-address-complaint',
    '2026-09-05T00:02:00Z',
    '2026-09-05T00:02:00Z'
  ),
  (
    '30000000-0000-4000-8000-000000000026',
    '10000000-0000-4000-8000-000000000020',
    'refill_reminder',
    ' NEW-ADDRESS@example.test ',
    'Current-address complaint',
    'sent',
    'resend-current-address-complaint',
    '2026-09-05T02:00:00Z',
    '2026-09-05T02:00:00Z'
  ),
  (
    '30000000-0000-4000-8000-000000000027',
    '10000000-0000-4000-8000-000000000020',
    'refill_reminder',
    'new-address@example.test',
    'Current-address delivery',
    'sent',
    'resend-current-address-delivery',
    '2026-09-05T03:00:00Z',
    '2026-09-05T03:00:00Z'
  );

select * from public.record_resend_outbox_event(
  'resend-old-address-bounce',
  'email.bounced',
  'hard',
  'Old mailbox unavailable',
  '2026-09-05T00:10:00Z'
);
select pg_temp.assert_true(
  (select not email_bounced and email_delivery_failures = 0
   from public.profiles
   where id = '10000000-0000-4000-8000-000000000020'),
  'old-address bounce suppressed the current address'
);

update public.profiles
set
  email_bounced = true,
  email_bounce_reason = 'hard: current address failure',
  email_bounced_at = '2026-09-05T01:00:00Z',
  email_delivery_failures = 2
where id = '10000000-0000-4000-8000-000000000020';

select * from public.record_resend_outbox_event(
  'resend-old-address-delivery',
  'email.delivered',
  null,
  null,
  '2026-09-05T01:10:00Z'
);
select * from public.record_resend_outbox_event(
  'resend-old-address-complaint',
  'email.complained',
  null,
  null,
  '2026-09-05T01:20:00Z'
);

select pg_temp.assert_true(
  (select email_bounced
      and email_bounce_reason = 'hard: current address failure'
      and email_bounced_at = '2026-09-05T01:00:00Z'
      and email_delivery_failures = 2
   from public.profiles
   where id = '10000000-0000-4000-8000-000000000020'),
  'old-address delivery or complaint mutated current-address suppression'
);
select pg_temp.assert_true(
  not exists (
    select 1
    from public.email_preferences
    where profile_id = '10000000-0000-4000-8000-000000000020'
  ),
  'old-address complaint created a preference side effect for the new address'
);

select * from public.record_resend_outbox_event(
  'resend-current-address-complaint',
  'email.complained',
  null,
  null,
  '2026-09-05T02:10:00Z'
);
select * from public.record_resend_outbox_event(
  'resend-current-address-delivery',
  'email.delivered',
  null,
  null,
  '2026-09-05T03:10:00Z'
);
select pg_temp.assert_true(
  (select not email_bounced and email_delivery_failures = 0
   from public.profiles
   where id = '10000000-0000-4000-8000-000000000020'),
  'newer current-address success did not clear valid complaint suppression'
);
select pg_temp.assert_true(
  (select not marketing_emails
      and not abandoned_checkout_emails
      and unsubscribe_reason = 'spam_complaint'
   from public.email_preferences
   where profile_id = '10000000-0000-4000-8000-000000000020'),
  'later success reversed a valid complaint opt-out'
);

-- Employer callbacks carry the patient id for document ownership but are not
-- patient-address evidence. Their receipts and tracking remain durable without
-- suppressing, unsubscribing, or marking the patient certificate as opened.
insert into public.profiles (id, role, email) values (
  '10000000-0000-4000-8000-000000000021',
  'patient',
  'patient-owner@example.test'
);
insert into public.issued_certificates (id, email_delivery_id) values (
  '20000000-0000-4000-8000-000000000021',
  'resend-employer-recipient'
);
insert into public.email_outbox (
  id, patient_id, certificate_id, email_type, to_email, subject, status,
  provider_message_id, created_at, sent_at
) values (
  '30000000-0000-4000-8000-000000000028',
  '10000000-0000-4000-8000-000000000021',
  '20000000-0000-4000-8000-000000000021',
  'med_cert_employer',
  'employer@example.test',
  'Employee certificate',
  'sent',
  'resend-employer-recipient',
  '2026-09-05T00:00:00Z',
  '2026-09-05T00:00:00Z'
);
select * from public.record_resend_outbox_event(
  'resend-employer-recipient',
  'email.complained',
  null,
  null,
  '2026-09-05T00:10:00Z'
);
select * from public.record_resend_outbox_event(
  'resend-employer-recipient',
  'email.opened',
  null,
  null,
  '2026-09-05T00:11:00Z'
);
select pg_temp.assert_true(
  (select not email_bounced and email_delivery_failures = 0
   from public.profiles
   where id = '10000000-0000-4000-8000-000000000021'),
  'employer complaint suppressed the patient address'
);
select pg_temp.assert_true(
  not exists (
    select 1 from public.email_preferences
    where profile_id = '10000000-0000-4000-8000-000000000021'
  ),
  'employer complaint unsubscribed the patient address'
);
select pg_temp.assert_true(
  (select email_opened_at is null
   from public.issued_certificates
   where id = '20000000-0000-4000-8000-000000000021'),
  'employer open was recorded as a patient certificate open'
);
select pg_temp.assert_true(
  (select delivery_status = 'complained'
      and jsonb_array_length(metadata -> 'processed_events') = 2
   from public.email_outbox
   where id = '30000000-0000-4000-8000-000000000028'),
  'employer lifecycle receipts were not retained'
);

-- Certificate opens belong only to the provider id currently installed by
-- certificate delivery finalization. A stale pre-resend provider still gets a
-- receipt/tracking row, while the current provider owns the marker. Duplicate
-- current-provider evidence can heal the marker to the earliest signed time.
insert into public.issued_certificates (
  id, storage_path, email_delivery_id
) values (
  '20000000-0000-4000-8000-000000000019',
  'certificates/resend-current.pdf',
  'resend-certificate-current'
);
insert into public.email_outbox (
  id, certificate_id, email_type, to_email, subject, status,
  provider_message_id, created_at, sent_at, metadata
) values
  (
    '30000000-0000-4000-8000-000000000030',
    '20000000-0000-4000-8000-000000000019',
    'med_cert_patient',
    'certificate@example.test',
    'Stale certificate delivery',
    'sent',
    'resend-certificate-stale',
    '2026-09-05T00:00:00Z',
    '2026-09-05T00:00:00Z',
    pg_catalog.jsonb_build_object(
      'certificate_storage_version',
      left(encode(extensions.digest('certificates/resend-current.pdf', 'sha256'), 'hex'), 32)
    )
  ),
  (
    '30000000-0000-4000-8000-000000000031',
    '20000000-0000-4000-8000-000000000019',
    'med_cert_patient',
    'certificate@example.test',
    'Current certificate delivery',
    'sent',
    'resend-certificate-current',
    '2026-09-05T00:01:00Z',
    '2026-09-05T00:01:00Z',
    pg_catalog.jsonb_build_object(
      'certificate_storage_version',
      left(encode(extensions.digest('certificates/resend-current.pdf', 'sha256'), 'hex'), 32)
    )
  );

select * from public.record_resend_outbox_event(
  'resend-certificate-stale',
  'email.opened',
  null,
  null,
  '2026-09-05T00:01:30Z'
);
select pg_temp.assert_true(
  (select email_opened_at is null
   from public.issued_certificates
   where id = '20000000-0000-4000-8000-000000000019'),
  'stale pre-resend provider marked the current certificate opened'
);
select pg_temp.assert_true(
  (select status = 'opened'
   from public.delivery_tracking
   where provider_id = 'resend-certificate-stale'),
  'stale pre-resend open did not retain durable tracking'
);
select * from public.record_resend_outbox_event(
  'resend-certificate-current',
  'email.opened',
  null,
  null,
  '2026-09-05T00:03:00Z'
);
select * from public.record_resend_outbox_event(
  'resend-certificate-current',
  'email.opened',
  null,
  null,
  '2026-09-05T00:02:00Z'
);
select pg_temp.assert_true(
  (select email_opened_at = '2026-09-05T00:02:00Z'
   from public.issued_certificates
   where id = '20000000-0000-4000-8000-000000000019'),
  'current-provider duplicate did not heal the earliest signed open time'
);
select pg_temp.assert_true(
  (select opened_at = '2026-09-05T00:02:00Z'
   from public.delivery_tracking
   where provider_id = 'resend-certificate-current'),
  'current-provider duplicate did not heal tracking to the earliest open time'
);
select * from public.record_resend_outbox_event(
  'resend-certificate-current',
  'email.opened',
  null,
  null,
  '2026-09-05T00:04:00Z'
);
select pg_temp.assert_true(
  (select email_opened_at = '2026-09-05T00:02:00Z'
   from public.issued_certificates
   where id = '20000000-0000-4000-8000-000000000019'),
  'later exact certificate-open duplicate changed the earliest marker'
);
select pg_temp.assert_true(
  (select jsonb_array_length(metadata -> 'processed_events') = 1
   from public.email_outbox
   where id = '30000000-0000-4000-8000-000000000031'),
  'current-provider duplicate appended a second receipt'
);

-- An open can arrive after the outbox provider id is durable but before the
-- certificate finalizer installs it. The RPC must roll back so Resend retries;
-- after finalization, the same callback owns the receipt and marker.
insert into public.issued_certificates (
  id, storage_path, email_delivery_id
) values (
  '20000000-0000-4000-8000-000000000020',
  'certificates/finalization-gap.pdf',
  null
);
insert into public.email_outbox (
  id, certificate_id, email_type, to_email, subject, status,
  provider_message_id, created_at, sent_at, metadata
) values (
  '30000000-0000-4000-8000-000000000032',
  '20000000-0000-4000-8000-000000000020',
  'med_cert_patient',
  'gap@example.test',
  'Current certificate delivery',
  'sent',
  'resend-certificate-finalization-gap',
  '2026-09-05T01:00:00Z',
  '2026-09-05T01:00:00Z',
  pg_catalog.jsonb_build_object(
    'certificate_storage_version',
    left(encode(extensions.digest('certificates/finalization-gap.pdf', 'sha256'), 'hex'), 32)
  )
);
do $function$
begin
  perform * from public.record_resend_outbox_event(
    'resend-certificate-finalization-gap',
    'email.opened',
    null,
    null,
    '2026-09-05T01:10:00Z'
  );
  raise exception 'pre-finalization certificate open unexpectedly committed';
exception
  when serialization_failure then null;
end;
$function$;
select pg_temp.assert_true(
  (select not (metadata ? 'processed_events')
   from public.email_outbox
   where id = '30000000-0000-4000-8000-000000000032'),
  'pre-finalization retryable open committed its receipt'
);
select pg_temp.assert_true(
  not exists (
    select 1 from public.delivery_tracking
    where provider_id = 'resend-certificate-finalization-gap'
  ),
  'pre-finalization retryable open committed tracking'
);
update public.issued_certificates
set email_delivery_id = 'resend-certificate-finalization-gap'
where id = '20000000-0000-4000-8000-000000000020';
select * from public.record_resend_outbox_event(
  'resend-certificate-finalization-gap',
  'email.opened',
  null,
  null,
  '2026-09-05T01:10:00Z'
);
select pg_temp.assert_true(
  (select email_opened_at = '2026-09-05T01:10:00Z'
   from public.issued_certificates
   where id = '20000000-0000-4000-8000-000000000020'),
  'retry after certificate finalization did not restore the open marker'
);

-- A manual-resolution owner may be followed by a normal provider resend. An
-- old pre-manual callback is stale, but the newer provider callback is a real
-- finalization gap and must roll back until the provider id becomes current.
insert into public.issued_certificates (
  id, storage_path, email_delivery_id, email_sent_at, updated_at
) values (
  '20000000-0000-4000-8000-000000000023',
  'certificates/post-manual-resend.pdf',
  'manual:10000000-0000-4000-8000-000000000099',
  '2026-09-05T00:30:00Z',
  '2026-09-05T00:30:00Z'
);
insert into public.email_outbox (
  id, certificate_id, email_type, to_email, subject, status,
  provider_message_id, created_at, sent_at, metadata
) values (
  '30000000-0000-4000-8000-000000000034',
  '20000000-0000-4000-8000-000000000023',
  'med_cert_patient',
  'manual-owner@example.test',
  'Pre-manual provider delivery',
  'sent',
  'resend-certificate-before-manual',
  '2026-09-05T00:00:00Z',
  '2026-09-05T00:00:00Z',
  pg_catalog.jsonb_build_object(
    'certificate_storage_version',
    left(encode(extensions.digest('certificates/post-manual-resend.pdf', 'sha256'), 'hex'), 32)
  )
);
select * from public.record_resend_outbox_event(
  'resend-certificate-before-manual',
  'email.opened',
  null,
  null,
  '2026-09-05T00:10:00Z'
);
select pg_temp.assert_true(
  (select email_opened_at is null
   from public.issued_certificates
   where id = '20000000-0000-4000-8000-000000000023'),
  'pre-manual provider callback marked the manual delivery opened'
);
select pg_temp.assert_true(
  (select jsonb_array_length(metadata -> 'processed_events') = 1
   from public.email_outbox
   where id = '30000000-0000-4000-8000-000000000034'),
  'pre-manual stale callback did not commit its receipt'
);

-- The current resend's worker clocks are deliberately non-authoritative: its
-- sent_at is skewed before the manual marker while created_at is exactly equal.
-- The matching reserved attempt, not either timestamp, owns the retry gap.
insert into public.certificate_resend_attempts (
  id, certificate_id, certificate_storage_path, actor_id, actor_role,
  resend_reason, status, created_at
) values (
  '60000000-0000-4000-8000-000000000023',
  '20000000-0000-4000-8000-000000000023',
  'certificates/post-manual-resend.pdf',
  '10000000-0000-4000-8000-000000000008',
  'patient',
  'Patient requested resend',
  'reserved',
  '2026-09-05T00:29:00Z'
);
insert into public.email_outbox (
  id, certificate_id, email_type, to_email, subject, status,
  provider_message_id, created_at, sent_at, metadata
) values (
  '30000000-0000-4000-8000-000000000035',
  '20000000-0000-4000-8000-000000000023',
  'med_cert_patient',
  'manual-owner@example.test',
  'Post-manual provider resend',
  'sent',
  'resend-certificate-after-manual',
  '2026-09-05T00:30:00Z',
  '2026-09-05T00:29:00Z',
  pg_catalog.jsonb_build_object(
    'certificate_storage_version',
    left(encode(extensions.digest('certificates/post-manual-resend.pdf', 'sha256'), 'hex'), 32),
    'resend_attempt_id',
    '60000000-0000-4000-8000-000000000023'
  )
);
do $function$
begin
  perform * from public.record_resend_outbox_event(
    'resend-certificate-after-manual',
    'email.opened',
    null,
    null,
    '2026-09-05T01:10:00Z'
  );
  raise exception 'post-manual pre-finalization open unexpectedly committed';
exception
  when serialization_failure then null;
end;
$function$;
select pg_temp.assert_true(
  (select not (metadata ? 'processed_events')
   from public.email_outbox
   where id = '30000000-0000-4000-8000-000000000035'),
  'post-manual finalization-gap open committed its receipt'
);
update public.issued_certificates
set
  email_delivery_id = 'resend-certificate-after-manual',
  email_sent_at = '2026-09-05T01:05:00Z',
  email_opened_at = null,
  updated_at = '2026-09-05T01:05:00Z'
where id = '20000000-0000-4000-8000-000000000023';
update public.certificate_resend_attempts
set
  status = 'sent',
  email_outbox_id = '30000000-0000-4000-8000-000000000035',
  provider_message_id = 'resend-certificate-after-manual',
  finalized_at = '2026-09-05T01:05:00Z'
where id = '60000000-0000-4000-8000-000000000023';
select * from public.record_resend_outbox_event(
  'resend-certificate-after-manual',
  'email.opened',
  null,
  null,
  '2026-09-05T01:10:00Z'
);
select pg_temp.assert_true(
  (select email_opened_at = '2026-09-05T01:10:00Z'
   from public.issued_certificates
   where id = '20000000-0000-4000-8000-000000000023'),
  'post-manual retry did not restore the current-provider open marker'
);

-- A correction changes storage version and clears delivery ownership. Its old
-- outbox must stay stale rather than becoming an indefinitely retrying gap.
insert into public.issued_certificates (
  id, storage_path, email_delivery_id
) values (
  '20000000-0000-4000-8000-000000000022',
  'certificates/corrected-current.pdf',
  null
);
insert into public.email_outbox (
  id, certificate_id, email_type, to_email, subject, status,
  provider_message_id, created_at, sent_at, metadata
) values (
  '30000000-0000-4000-8000-000000000033',
  '20000000-0000-4000-8000-000000000022',
  'med_cert_patient',
  'corrected@example.test',
  'Superseded certificate delivery',
  'sent',
  'resend-certificate-superseded-version',
  '2026-09-05T00:00:00Z',
  '2026-09-05T00:00:00Z',
  pg_catalog.jsonb_build_object(
    'certificate_storage_version',
    left(encode(extensions.digest('certificates/pre-correction.pdf', 'sha256'), 'hex'), 32)
  )
);
select * from public.record_resend_outbox_event(
  'resend-certificate-superseded-version',
  'email.opened',
  null,
  null,
  '2026-09-05T00:10:00Z'
);
select pg_temp.assert_true(
  (select email_opened_at is null
   from public.issued_certificates
   where id = '20000000-0000-4000-8000-000000000022'),
  'superseded certificate-version open marked the correction opened'
);

-- Only consecutive soft/undetermined bounce outcomes contribute to the
-- transient threshold. Generic provider failures are operational failures,
-- and a newer success resets an earlier soft-bounce run.
insert into public.profiles (id, role, email) values
  (
    '10000000-0000-4000-8000-000000000036',
    'patient',
    'soft-suffix@example.test'
  ),
  (
    '10000000-0000-4000-8000-000000000037',
    'patient',
    'provider-failures@example.test'
  );
insert into public.email_outbox (
  id, patient_id, email_type, to_email, subject, status,
  provider_message_id, created_at, sent_at
) values
  (
    '30000000-0000-4000-8000-000000000160',
    '10000000-0000-4000-8000-000000000036',
    'refill_reminder',
    'soft-suffix@example.test',
    'Soft A',
    'sent',
    'resend-soft-suffix-a',
    '2026-09-05T05:00:00Z',
    '2026-09-05T05:00:00Z'
  ),
  (
    '30000000-0000-4000-8000-000000000161',
    '10000000-0000-4000-8000-000000000036',
    'refill_reminder',
    'soft-suffix@example.test',
    'Soft B',
    'sent',
    'resend-soft-suffix-b',
    '2026-09-05T05:10:00Z',
    '2026-09-05T05:10:00Z'
  ),
  (
    '30000000-0000-4000-8000-000000000062',
    '10000000-0000-4000-8000-000000000036',
    'refill_reminder',
    'soft-suffix@example.test',
    'Soft C',
    'sent',
    'resend-soft-suffix-c',
    '2026-09-05T05:20:00Z',
    '2026-09-05T05:20:00Z'
  ),
  (
    '30000000-0000-4000-8000-000000000063',
    '10000000-0000-4000-8000-000000000036',
    'refill_reminder',
    'soft-suffix@example.test',
    'Recovered',
    'sent',
    'resend-soft-suffix-recovered',
    '2026-09-05T05:30:00Z',
    '2026-09-05T05:30:00Z'
  ),
  (
    '30000000-0000-4000-8000-000000000064',
    '10000000-0000-4000-8000-000000000037',
    'refill_reminder',
    'provider-failures@example.test',
    'Provider failure A',
    'sent',
    'resend-provider-failure-a',
    '2026-09-05T05:00:00Z',
    '2026-09-05T05:00:00Z'
  ),
  (
    '30000000-0000-4000-8000-000000000065',
    '10000000-0000-4000-8000-000000000037',
    'refill_reminder',
    'provider-failures@example.test',
    'Provider failure B',
    'sent',
    'resend-provider-failure-b',
    '2026-09-05T05:10:00Z',
    '2026-09-05T05:10:00Z'
  ),
  (
    '30000000-0000-4000-8000-000000000066',
    '10000000-0000-4000-8000-000000000037',
    'refill_reminder',
    'provider-failures@example.test',
    'Provider failure C',
    'sent',
    'resend-provider-failure-c',
    '2026-09-05T05:20:00Z',
    '2026-09-05T05:20:00Z'
  );
select * from public.record_resend_outbox_event(
  'resend-soft-suffix-a', 'email.bounced', 'soft', 'Temporary A',
  '2026-09-05T05:01:00Z'
);
select * from public.record_resend_outbox_event(
  'resend-soft-suffix-b', 'email.bounced', 'soft', 'Temporary B',
  '2026-09-05T05:11:00Z'
);
select * from public.record_resend_outbox_event(
  'resend-soft-suffix-c', 'email.bounced', 'soft', 'Temporary C',
  '2026-09-05T05:21:00Z'
);
select pg_temp.assert_true(
  (select not email_bounced and email_delivery_failures = 3
   from public.profiles
   where id = '10000000-0000-4000-8000-000000000036'),
  'three consecutive soft bounces did not own the transient threshold mirror'
);
select * from public.record_resend_outbox_event(
  'resend-soft-suffix-recovered', 'email.delivered', null, null,
  '2026-09-05T05:31:00Z'
);
select pg_temp.assert_true(
  (select not email_bounced and email_delivery_failures = 0
   from public.profiles
   where id = '10000000-0000-4000-8000-000000000036'),
  'newer successful attempt did not reset soft-bounce suffix'
);
select * from public.record_resend_outbox_event(
  'resend-provider-failure-a', 'email.failed', null, 'Quota A',
  '2026-09-05T05:01:00Z'
);
select * from public.record_resend_outbox_event(
  'resend-provider-failure-b', 'email.failed', null, 'Quota B',
  '2026-09-05T05:11:00Z'
);
select * from public.record_resend_outbox_event(
  'resend-provider-failure-c', 'email.failed', null, 'Quota C',
  '2026-09-05T05:21:00Z'
);
select pg_temp.assert_true(
  (select not email_bounced and email_delivery_failures = 0
   from public.profiles
   where id = '10000000-0000-4000-8000-000000000037'),
  'generic provider failures accumulated recipient soft-bounce evidence'
);

-- Complaint consent uses provider event time, not callback arrival time. A
-- delayed old complaint cannot undo newer explicit consent; a later complaint
-- does win, and profile address state remains separately owned.
insert into public.profiles (id, role, email) values (
  '10000000-0000-4000-8000-000000000038',
  'patient',
  'complaint-order@example.test'
);
insert into public.email_preferences (
  profile_id, marketing_emails, abandoned_checkout_emails,
  unsubscribed_at, unsubscribe_reason, preferences_changed_at
) values (
  '10000000-0000-4000-8000-000000000038',
  true,
  true,
  null,
  null,
  '2026-09-05T06:00:00Z'
);
insert into public.email_outbox (
  id, patient_id, email_type, to_email, subject, status,
  provider_message_id, created_at, sent_at
) values
  (
    '30000000-0000-4000-8000-000000000067',
    '10000000-0000-4000-8000-000000000038',
    'refill_reminder',
    'complaint-order@example.test',
    'Older complaint',
    'sent',
    'resend-complaint-order-old',
    '2026-09-05T04:00:00Z',
    '2026-09-05T04:00:00Z'
  ),
  (
    '30000000-0000-4000-8000-000000000068',
    '10000000-0000-4000-8000-000000000038',
    'refill_reminder',
    'complaint-order@example.test',
    'Later complaint',
    'sent',
    'resend-complaint-order-new',
    '2026-09-05T07:00:00Z',
    '2026-09-05T07:00:00Z'
  );
select * from public.record_resend_outbox_event(
  'resend-complaint-order-old', 'email.complained', null, null,
  '2026-09-05T04:10:00Z'
);
select pg_temp.assert_true(
  (select marketing_emails
      and abandoned_checkout_emails
      and unsubscribe_reason is null
      and preferences_changed_at = '2026-09-05T06:00:00Z'
   from public.email_preferences
   where profile_id = '10000000-0000-4000-8000-000000000038'),
  'delayed old complaint overwrote newer explicit consent'
);
select * from public.record_resend_outbox_event(
  'resend-complaint-order-new', 'email.complained', null, null,
  '2026-09-05T07:10:00Z'
);
select pg_temp.assert_true(
  (select not marketing_emails
      and not abandoned_checkout_emails
      and unsubscribe_reason = 'spam_complaint'
      and unsubscribed_at = '2026-09-05T07:10:00Z'
      and preferences_changed_at = '2026-09-05T07:10:00Z'
   from public.email_preferences
   where profile_id = '10000000-0000-4000-8000-000000000038'),
  'later complaint did not override older explicit consent'
);
select pg_temp.assert_true(
  (select not email_bounced and email_delivery_failures = 0
   from public.profiles
   where id = '10000000-0000-4000-8000-000000000038'),
  'complaint consent evidence leaked into address bounce state'
);

-- Provider-terminal evidence must move the exact current patient certificate
-- into the existing undelivered state. A duplicate heals idempotently without
-- changing the first durable terminal timestamp.
insert into public.issued_certificates (
  id, storage_path, email_delivery_id, email_sent_at
) values (
  '20000000-0000-4000-8000-000000000024',
  'certificates/terminal-current.pdf',
  'resend-certificate-terminal-current',
  '2026-09-05T02:00:00Z'
);
insert into public.email_outbox (
  id, certificate_id, email_type, to_email, subject, status,
  provider_message_id, created_at, sent_at, metadata
) values (
  '30000000-0000-4000-8000-000000000156',
  '20000000-0000-4000-8000-000000000024',
  'med_cert_patient',
  'certificate-terminal@example.test',
  'Current certificate delivery',
  'sent',
  'resend-certificate-terminal-current',
  '2026-09-05T02:00:00Z',
  '2026-09-05T02:00:00Z',
  pg_catalog.jsonb_build_object(
    'certificate_storage_version',
    left(encode(extensions.digest('certificates/terminal-current.pdf', 'sha256'), 'hex'), 32)
  )
);
select * from public.record_resend_outbox_event(
  'resend-certificate-terminal-current',
  'email.failed',
  null,
  'Untrusted provider detail must not reach the certificate',
  '2026-09-05T02:10:00Z'
);
select * from public.record_resend_outbox_event(
  'resend-certificate-terminal-current',
  'email.failed',
  null,
  'Different duplicate detail',
  '2026-09-05T02:20:00Z'
);
select pg_temp.assert_true(
  (select email_sent_at is null
      and email_failed_at = '2026-09-05T02:10:00Z'
      and email_failure_reason = 'Resend provider failure'
   from public.issued_certificates
   where id = '20000000-0000-4000-8000-000000000024'),
  'current certificate provider failure was not reconciled idempotently'
);

-- A complaint proves the current certificate email reached the patient. It is
-- terminal for this provider attempt and consent, but must not manufacture an
-- undelivered certificate or invite a same-address resend.
insert into public.issued_certificates (
  id, storage_path, email_delivery_id, email_sent_at
) values (
  '20000000-0000-4000-8000-000000000027',
  'certificates/complained-current.pdf',
  'resend-certificate-complained-current',
  '2026-09-05T02:30:00Z'
);
insert into public.email_outbox (
  id, certificate_id, email_type, to_email, subject, status,
  provider_message_id, created_at, sent_at, metadata
) values (
  '30000000-0000-4000-8000-000000000069',
  '20000000-0000-4000-8000-000000000027',
  'med_cert_patient',
  'certificate-complained@example.test',
  'Current certificate delivery',
  'sent',
  'resend-certificate-complained-current',
  '2026-09-05T02:30:00Z',
  '2026-09-05T02:30:00Z',
  pg_catalog.jsonb_build_object(
    'certificate_storage_version',
    left(encode(extensions.digest('certificates/complained-current.pdf', 'sha256'), 'hex'), 32)
  )
);
select * from public.record_resend_outbox_event(
  'resend-certificate-complained-current',
  'email.complained',
  null,
  null,
  '2026-09-05T02:40:00Z'
);
select pg_temp.assert_true(
  (select email_sent_at = '2026-09-05T02:30:00Z'
      and email_failed_at is null
      and email_failure_reason is null
   from public.issued_certificates
   where id = '20000000-0000-4000-8000-000000000027'),
  'certificate complaint was falsely reconciled as undelivered'
);
select pg_temp.assert_true(
  (select status = 'sent'
      and delivery_status = 'complained'
      and retry_count = 10
   from public.email_outbox
   where id = '30000000-0000-4000-8000-000000000069'),
  'certificate complaint lost sent evidence or exact-attempt terminality'
);
select pg_temp.assert_true(
  (select status = 'delivered' and error_message is null
   from public.delivery_tracking
   where provider_id = 'resend-certificate-complained-current'),
  'certificate complaint was falsely tracked as undelivered'
);

-- A terminal callback from a superseded provider attempt remains durable on
-- its outbox/tracking rows but cannot clobber a newer certificate delivery.
insert into public.issued_certificates (
  id, storage_path, email_delivery_id, email_sent_at
) values (
  '20000000-0000-4000-8000-000000000025',
  'certificates/terminal-stale.pdf',
  'resend-certificate-terminal-newer',
  '2026-09-05T03:00:00Z'
);
insert into public.email_outbox (
  id, certificate_id, email_type, to_email, subject, status,
  provider_message_id, created_at, sent_at, metadata
) values
  (
    '30000000-0000-4000-8000-000000000157',
    '20000000-0000-4000-8000-000000000025',
    'med_cert_patient',
    'certificate-stale@example.test',
    'Older certificate delivery',
    'sent',
    'resend-certificate-terminal-stale',
    '2026-09-05T02:00:00Z',
    '2026-09-05T02:00:00Z',
    pg_catalog.jsonb_build_object(
      'certificate_storage_version',
      left(encode(extensions.digest('certificates/terminal-stale.pdf', 'sha256'), 'hex'), 32)
    )
  ),
  (
    '30000000-0000-4000-8000-000000000158',
    '20000000-0000-4000-8000-000000000025',
    'med_cert_patient',
    'certificate-stale@example.test',
    'Newer certificate delivery',
    'sent',
    'resend-certificate-terminal-newer',
    '2026-09-05T03:00:00Z',
    '2026-09-05T03:00:00Z',
    pg_catalog.jsonb_build_object(
      'certificate_storage_version',
      left(encode(extensions.digest('certificates/terminal-stale.pdf', 'sha256'), 'hex'), 32)
    )
  );
select * from public.record_resend_outbox_event(
  'resend-certificate-terminal-stale',
  'email.suppressed',
  null,
  'Old attempt suppressed',
  '2026-09-05T03:10:00Z',
  'OnAccountSuppressionList'
);
select pg_temp.assert_true(
  (select email_delivery_id = 'resend-certificate-terminal-newer'
      and email_sent_at = '2026-09-05T03:00:00Z'
      and email_failed_at is null
      and email_failure_reason is null
   from public.issued_certificates
   where id = '20000000-0000-4000-8000-000000000025'),
  'stale provider failure clobbered the current certificate delivery'
);

-- A terminal callback can also outrun certificate finalization. The whole
-- receipt must roll back until current provider ownership is installed.
insert into public.issued_certificates (
  id, storage_path, email_delivery_id, email_sent_at
) values (
  '20000000-0000-4000-8000-000000000026',
  'certificates/terminal-gap.pdf',
  null,
  null
);
insert into public.email_outbox (
  id, certificate_id, email_type, to_email, subject, status,
  provider_message_id, created_at, sent_at, metadata
) values (
  '30000000-0000-4000-8000-000000000159',
  '20000000-0000-4000-8000-000000000026',
  'med_cert_patient',
  'certificate-gap@example.test',
  'Current certificate delivery',
  'sent',
  'resend-certificate-terminal-gap',
  '2026-09-05T04:00:00Z',
  '2026-09-05T04:00:00Z',
  pg_catalog.jsonb_build_object(
    'certificate_storage_version',
    left(encode(extensions.digest('certificates/terminal-gap.pdf', 'sha256'), 'hex'), 32)
  )
);
do $function$
begin
  perform * from public.record_resend_outbox_event(
    'resend-certificate-terminal-gap',
    'email.bounced',
    'soft',
    'Temporary mailbox issue',
    '2026-09-05T04:10:00Z'
  );
  raise exception 'pre-finalization certificate failure unexpectedly committed';
exception
  when serialization_failure then null;
end;
$function$;
select pg_temp.assert_true(
  (select not (metadata ? 'processed_events')
   from public.email_outbox
   where id = '30000000-0000-4000-8000-000000000159'),
  'pre-finalization terminal callback committed its receipt'
);
update public.issued_certificates
set
  email_delivery_id = 'resend-certificate-terminal-gap',
  email_sent_at = '2026-09-05T04:05:00Z'
where id = '20000000-0000-4000-8000-000000000026';
select * from public.record_resend_outbox_event(
  'resend-certificate-terminal-gap',
  'email.bounced',
  'soft',
  'Temporary mailbox issue',
  '2026-09-05T04:10:00Z'
);
select pg_temp.assert_true(
  (select email_sent_at is null
      and email_failed_at = '2026-09-05T04:10:00Z'
      and email_failure_reason = 'Resend email bounced'
   from public.issued_certificates
   where id = '20000000-0000-4000-8000-000000000026'),
  'terminal retry after certificate finalization did not reconcile failure'
);

-- Consecutive failures are derived from message-attempt order. A successful
-- middle attempt breaks the run even when its callback arrives after the newer
-- terminal callback: A(bounce) -> C(bounce) -> B(delivered) leaves only C.
insert into public.profiles (id, role, email) values (
  '10000000-0000-4000-8000-000000000024',
  'patient',
  'consecutive-order@example.test'
);
insert into public.email_outbox (
  id, patient_id, email_type, to_email, subject, status,
  provider_message_id, created_at, sent_at
) values
  (
    '30000000-0000-4000-8000-000000000050',
    '10000000-0000-4000-8000-000000000024',
    'refill_reminder',
    'consecutive-order@example.test',
    'Attempt A',
    'sent',
    'resend-consecutive-a',
    '2026-09-05T00:00:00Z',
    '2026-09-05T00:00:00Z'
  ),
  (
    '30000000-0000-4000-8000-000000000051',
    '10000000-0000-4000-8000-000000000024',
    'refill_reminder',
    'consecutive-order@example.test',
    'Attempt B',
    'sent',
    'resend-consecutive-b',
    '2026-09-05T01:00:00Z',
    '2026-09-05T01:00:00Z'
  ),
  (
    '30000000-0000-4000-8000-000000000052',
    '10000000-0000-4000-8000-000000000024',
    'refill_reminder',
    'consecutive-order@example.test',
    'Attempt C',
    'sent',
    'resend-consecutive-c',
    '2026-09-05T02:00:00Z',
    '2026-09-05T02:00:00Z'
  );
select * from public.record_resend_outbox_event(
  'resend-consecutive-a', 'email.bounced', 'soft', 'Attempt A failed',
  '2026-09-05T00:10:00Z'
);
select * from public.record_resend_outbox_event(
  'resend-consecutive-c', 'email.bounced', 'hard', 'Attempt C failed',
  '2026-09-05T02:10:00Z'
);
select * from public.record_resend_outbox_event(
  'resend-consecutive-b', 'email.delivered', null, null,
  '2026-09-05T01:10:00Z'
);
select pg_temp.assert_true(
  (select email_bounced
      and email_bounce_reason = 'hard: Attempt C failed'
      and email_bounced_at = '2026-09-05T02:10:00Z'
      and email_delivery_failures = 0
   from public.profiles
   where id = '10000000-0000-4000-8000-000000000024'),
  'consecutive failure count depended on A-C-B callback order'
);

-- Rows used by the shell runner's same-message and cross-message concurrent
-- order checks.
insert into public.profiles (id, role, email) values
  ('10000000-0000-4000-8000-000000000005', 'patient', 'delivery-first@example.test'),
  ('10000000-0000-4000-8000-000000000006', 'patient', 'complaint-first@example.test');
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

insert into public.profiles (id, role, email) values
  (
    '10000000-0000-4000-8000-000000000022',
    'patient',
    'concurrent-success-first@example.test'
  ),
  (
    '10000000-0000-4000-8000-000000000023',
    'patient',
    'concurrent-complaint-first@example.test'
  );
insert into public.email_outbox (
  id, patient_id, email_type, to_email, subject, status,
  provider_message_id, created_at, sent_at
) values
  (
    '30000000-0000-4000-8000-000000000040',
    '10000000-0000-4000-8000-000000000022',
    'refill_reminder',
    'concurrent-success-first@example.test',
    'Older reminder',
    'sent',
    'resend-concurrent-cross-older-bounce',
    '2026-09-05T00:00:00Z',
    '2026-09-05T00:00:00Z'
  ),
  (
    '30000000-0000-4000-8000-000000000041',
    '10000000-0000-4000-8000-000000000022',
    'refill_reminder',
    'concurrent-success-first@example.test',
    'Newer reminder',
    'sent',
    'resend-concurrent-cross-newer-delivery',
    '2026-09-05T01:00:00Z',
    '2026-09-05T01:00:00Z'
  ),
  (
    '30000000-0000-4000-8000-000000000042',
    '10000000-0000-4000-8000-000000000023',
    'refill_reminder',
    'concurrent-complaint-first@example.test',
    'Older complaint',
    'sent',
    'resend-concurrent-cross-older-complaint',
    '2026-09-05T00:00:00Z',
    '2026-09-05T00:00:00Z'
  ),
  (
    '30000000-0000-4000-8000-000000000043',
    '10000000-0000-4000-8000-000000000023',
    'refill_reminder',
    'concurrent-complaint-first@example.test',
    'Newer opened reminder',
    'sent',
    'resend-concurrent-cross-newer-open',
    '2026-09-05T01:00:00Z',
    '2026-09-05T01:00:00Z'
  );

insert into public.profiles (id, role, email) values (
  '10000000-0000-4000-8000-000000000025',
  'patient',
  'concurrent-consecutive@example.test'
);
insert into public.email_outbox (
  id, patient_id, email_type, to_email, subject, status,
  provider_message_id, created_at, sent_at
) values
  (
    '30000000-0000-4000-8000-000000000053',
    '10000000-0000-4000-8000-000000000025',
    'refill_reminder',
    'concurrent-consecutive@example.test',
    'Attempt A',
    'sent',
    'resend-concurrent-consecutive-a',
    '2026-09-05T00:00:00Z',
    '2026-09-05T00:00:00Z'
  ),
  (
    '30000000-0000-4000-8000-000000000054',
    '10000000-0000-4000-8000-000000000025',
    'refill_reminder',
    'concurrent-consecutive@example.test',
    'Attempt B',
    'sent',
    'resend-concurrent-consecutive-b',
    '2026-09-05T01:00:00Z',
    '2026-09-05T01:00:00Z'
  ),
  (
    '30000000-0000-4000-8000-000000000055',
    '10000000-0000-4000-8000-000000000025',
    'refill_reminder',
    'concurrent-consecutive@example.test',
    'Attempt C',
    'sent',
    'resend-concurrent-consecutive-c',
    '2026-09-05T02:00:00Z',
    '2026-09-05T02:00:00Z'
  );
select * from public.record_resend_outbox_event(
  'resend-concurrent-consecutive-a',
  'email.bounced',
  'soft',
  'Attempt A failed',
  '2026-09-05T00:10:00Z'
);
