begin;
create function pg_temp.delivery_assert(condition boolean, message text)
returns void language plpgsql as $$ begin if not coalesce(condition, false) then raise exception '%', message; end if; end; $$;
insert into public.profiles (id, role, email) values ('80000000-0000-4000-8000-000000000001', 'patient', 'delivery-order@example.test');
insert into public.email_outbox (id, patient_id, email_type, to_email, subject, status, provider_message_id, created_at, sent_at) values
 ('80000000-0000-4000-8000-000000000002','80000000-0000-4000-8000-000000000001','refill_reminder','delivery-order@example.test','Order test','sent','resend-order-delivered','2026-09-05T01:00:00Z','2026-09-05T01:00:00Z'),
 ('80000000-0000-4000-8000-000000000003','80000000-0000-4000-8000-000000000001','refill_reminder','delivery-order@example.test','Order test','sent','resend-order-opened','2026-09-05T01:00:00Z','2026-09-05T01:00:00Z');
select * from public.record_resend_outbox_event('resend-order-delivered','email.delivered',null,null,'2026-09-05T01:10:00Z');
select * from public.record_resend_outbox_event('resend-order-delivered','email.sent',null,null,'2026-09-05T01:00:00Z');
select pg_temp.delivery_assert((select status = 'delivered' and delivered_at = '2026-09-05T01:10:00Z' from public.delivery_tracking where provider_id = 'resend-order-delivered'), 'delayed sent regressed delivered tracking');
select * from public.record_resend_outbox_event('resend-order-opened','email.opened',null,null,'2026-09-05T01:20:00Z');
select * from public.record_resend_outbox_event('resend-order-opened','email.sent',null,null,'2026-09-05T01:00:00Z');
select * from public.record_resend_outbox_event('resend-order-opened','email.delivered',null,null,'2026-09-05T01:10:00Z');
select pg_temp.delivery_assert((select status = 'opened' and opened_at = '2026-09-05T01:20:00Z' and delivered_at = '2026-09-05T01:10:00Z' from public.delivery_tracking where provider_id = 'resend-order-opened'), 'reversed sent/delivery regressed opened tracking');
select * from public.record_resend_outbox_event('resend-order-opened','email.complained',null,null,'2026-09-05T01:30:00Z');
select * from public.record_resend_outbox_event('resend-order-opened','email.sent',null,null,'2026-09-05T01:00:00Z');
select * from public.record_resend_outbox_event('resend-order-opened','email.failed',null,'Delayed earlier failure','2026-09-05T01:05:00Z');
select * from public.record_resend_outbox_event('resend-order-opened','email.bounced','hard','Delayed earlier bounce','2026-09-05T01:06:00Z');
select pg_temp.delivery_assert((select status = 'opened' and opened_at = '2026-09-05T01:20:00Z' and delivered_at = '2026-09-05T01:10:00Z' from public.delivery_tracking where provider_id = 'resend-order-opened'), 'complaint erased delivery evidence');
select pg_temp.delivery_assert((select status = 'sent' and delivery_status = 'complained' and retry_count >= 10 from public.email_outbox where provider_message_id = 'resend-order-opened'), 'complaint did not close the exact provider attempt');
select pg_temp.delivery_assert((select status = 'sent' and delivery_status = 'delivered' and retry_count < 10 from public.email_outbox where provider_message_id = 'resend-order-delivered'), 'complaint affected another provider attempt');
select pg_temp.delivery_assert((select not marketing_emails and not abandoned_checkout_emails and preferences_changed_at = '2026-09-05T01:30:00Z' from public.email_preferences where profile_id = '80000000-0000-4000-8000-000000000001'), 'complaint preference order was not integrated');
rollback;
