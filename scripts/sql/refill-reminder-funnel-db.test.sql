-- Reporting-only proof: no preference, identity-change, or historical-repair migration.
begin;
create function pg_temp.fixture_id(kind int, sequence int) returns uuid language sql immutable
as $$ select ('9000000' || kind || '-0000-4000-8000-' || lpad(sequence::text, 12, '0'))::uuid $$;
create function pg_temp.assert_funnel(condition boolean, message text) returns void language plpgsql
as $$ begin if condition is distinct from true then raise exception '%', message; end if; end; $$;

insert into public.profiles (id, role, email)
select pg_temp.fixture_id(1,n), 'patient', 'refill-' || n || '@example.test' from generate_series(1,5) n;
insert into public.intakes (id, patient_id, category, subtype, paid_at, payment_status, exclude_from_reporting)
select pg_temp.fixture_id(2,n), pg_temp.fixture_id(1,n), 'prescription', 'repeat', '2026-05-01Z', 'paid', n=4
from generate_series(1,5) n;
insert into public.prescriptions (id, patient_id, intake_id)
select pg_temp.fixture_id(3,n), pg_temp.fixture_id(1,n), pg_temp.fixture_id(2,n) from generate_series(1,5) n;

insert into public.email_outbox (id, email_type, to_email, subject, status, provider_message_id,
  patient_id, sent_at, delivery_status, metadata)
select pg_temp.fixture_id(4,n), 'refill_reminder', 'refill@example.test', 'Synthetic', 'sent', 'refill-proof-' || n,
  pg_temp.fixture_id(1,patient), sent::timestamptz, delivery,
  jsonb_build_object('prescription_id', pg_temp.fixture_id(3,patient), 'processed_events', receipts)
from (values
  (1,1,'2026-07-20T00:00:00Z','delivered','["refill-proof-1:email.delivered"]'::jsonb),
  -- The mutable status is terminal, but delivered/clicked receipts remain countable.
  (2,1,'2026-07-21T00:00:00Z','complained','["refill-proof-2:email.delivered","refill-proof-2:email.clicked","refill-proof-2:email.clicked","refill-proof-2:email.complained"]'::jsonb),
  (3,2,'2026-07-22T00:00:00Z','delivered','["refill-proof-3:email.delivered","refill-proof-3:email.clicked"]'::jsonb),
  (4,3,'2026-09-01T00:00:00Z',null,'[]'::jsonb)
) fixture(n,patient,sent,delivery,receipts);

-- Clone a tempting reportable send, then independently make each clone ineligible.
insert into public.email_outbox (id,email_type,to_email,subject,status,provider_message_id,patient_id,sent_at,metadata)
select pg_temp.fixture_id(4,n),email_type,to_email,subject,status,'excluded-' || n,patient_id,sent_at,metadata
from public.email_outbox cross join generate_series(10,20) n where id=pg_temp.fixture_id(4,1);
update public.email_outbox set metadata=metadata || '{"test":true}' where id=pg_temp.fixture_id(4,10);
update public.email_outbox set metadata=metadata || '{"e2e_mode":true}' where id=pg_temp.fixture_id(4,11);
update public.email_outbox set metadata=metadata || '{"dev_mode":true}' where id=pg_temp.fixture_id(4,12);
update public.email_outbox set status='skipped_e2e' where id=pg_temp.fixture_id(4,13);
update public.email_outbox set patient_id=pg_temp.fixture_id(1,4),metadata=jsonb_build_object('prescription_id',pg_temp.fixture_id(3,4)) where id=pg_temp.fixture_id(4,14);
update public.email_outbox set patient_id=pg_temp.fixture_id(1,5),metadata=jsonb_build_object('prescription_id',pg_temp.fixture_id(3,5)) where id=pg_temp.fixture_id(4,15);
update public.email_outbox set metadata=jsonb_build_object('prescription_id',pg_temp.fixture_id(3,2)) where id=pg_temp.fixture_id(4,16);
update public.email_outbox set metadata='{}' where id=pg_temp.fixture_id(4,17);
update public.email_outbox set provider='other' where id=pg_temp.fixture_id(4,18);
update public.email_outbox set provider_message_id=null where id=pg_temp.fixture_id(4,19);
update public.email_outbox set sent_at=null where id=pg_temp.fixture_id(4,20);

insert into public.intakes (id,patient_id,category,subtype,paid_at,payment_status,utm_source,exclude_from_reporting)
select pg_temp.fixture_id(2,n),pg_temp.fixture_id(1,patient),'prescription','repeat',paid::timestamptz,status,utm,excluded
from (values
  (101,1,'2026-07-21T03:00:00Z','paid','refill_reminder',false),
  (102,1,'2026-07-22T03:00:00Z','paid',null,false),
  -- Gross paid outcome, not retained cash: the subsequent refund does not erase the order.
  (103,2,'2026-07-23T04:00:00Z','refunded','refill_reminder',false),
  (104,2,'2026-08-15T04:00:00Z','paid','refill_reminder',false),
  (105,2,'2026-07-23T04:00:00Z','unpaid','refill_reminder',false),
  (106,2,'2026-07-23T04:00:00Z','paid','refill_reminder',true),
  (107,3,'2026-09-08T04:00:00Z','paid','refill_reminder',false),
  (108,1,'2026-07-19T04:00:00Z','paid','refill_reminder',false)
) fixture(n,patient,paid,status,utm,excluded);

create temporary table measured as select * from public.get_refill_reminder_funnel(
  '2026-07-01Z','2026-09-05Z','2026-09-05Z',array[pg_temp.fixture_id(1,5)]
);
select pg_temp.assert_funnel((select count(*)=2 from measured),'test/invalid sends created extra cohorts');
select pg_temp.assert_funnel((select sent=3 and delivered=3 and observed_provider_clicks=2
  and utm_attributed_paid_renewals_within_21d=2 and same_patient_paid_reorders_within_21d=3
  and utm_converted_sends_within_21d=2 and same_patient_converted_sends_within_21d=2
  and maturity_at='2026-08-12T00:00:00Z'
  from measured where week_start='2026-07-19T14:00:00Z'),
  'mature cohort counts, distinct-send assignment, durable receipts or Sydney boundary are wrong');
select pg_temp.assert_funnel((select sent=1 and delivered=0 and observed_provider_clicks=0
  and same_patient_paid_reorders_within_21d=0 and maturity_at='2026-09-22T00:00:00Z'
  from measured where week_start='2026-08-30T14:00:00Z'),
  'maturing wave included future paid evidence or wrong observation window');
select pg_temp.assert_funnel(not exists(select 1 from public.get_refill_reminder_funnel(
  '2026-09-06Z','2026-09-05Z','2026-09-05Z','{}'::uuid[])), 'invalid bounds should return no rows');
select pg_temp.assert_funnel(not has_function_privilege('authenticated',
  'public.get_refill_reminder_funnel(timestamptz,timestamptz,timestamptz,uuid[])','execute'),
  'patient role can call reporting RPC');
rollback;
