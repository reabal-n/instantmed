-- Roll back fixtures so the independent delivery harness keeps its own cohort.
begin;
create function pg_temp.preference_assert(condition boolean, message text)
returns void language plpgsql as $$ begin if not coalesce(condition, false) then raise exception '%', message; end if; end; $$;
insert into public.profiles (id, role, email) values
 ('90000000-0000-4000-8000-000000000001', 'patient', 'preference-order@example.test'),
 ('90000000-0000-4000-8000-000000000002', 'patient', 'preference-order@example.test');
-- Merely opening settings creates a default-on row with a later generic timestamp.
insert into public.email_preferences (profile_id, updated_at) values
 ('90000000-0000-4000-8000-000000000001', '2026-09-05T06:00:00Z');
select pg_temp.preference_assert((select marketing_emails and abandoned_checkout_emails and preferences_changed_at is null
 from public.email_preferences where profile_id = '90000000-0000-4000-8000-000000000001'), 'defaults must remain enabled without reconsent evidence');
select public.record_email_spam_complaint('preference-order@example.test', '2026-09-05T05:00:00Z');
select pg_temp.preference_assert((select bool_and(not marketing_emails and not abandoned_checkout_emails
 and preferences_changed_at = '2026-09-05T05:00:00Z') from public.email_preferences
 where profile_id in ('90000000-0000-4000-8000-000000000001', '90000000-0000-4000-8000-000000000002')),
 'delayed complaint must beat newer default rows across duplicates');
select pg_temp.preference_assert((select updated_at <> preferences_changed_at from public.email_preferences
 where profile_id = '90000000-0000-4000-8000-000000000001'), 'real updated_at trigger must be active');
-- Generic settings write and default upsert cannot remove the explicit choice.
update public.email_preferences set updated_at = '2099-01-01', marketing_emails = true, abandoned_checkout_emails = true,
 preferences_changed_at = null, unsubscribed_at = null, unsubscribe_reason = null
 where profile_id = '90000000-0000-4000-8000-000000000001';
select pg_temp.preference_assert((select not marketing_emails and not abandoned_checkout_emails and unsubscribe_reason = 'spam_complaint'
 from public.email_preferences where profile_id = '90000000-0000-4000-8000-000000000001'), 'generic defaults erased removal');
-- A duplicate created after withdrawal inherits that choice, not fresh defaults.
insert into public.profiles (id, role, email) values ('90000000-0000-4000-8000-000000000003', 'patient', 'preference-order@example.test');
insert into public.email_preferences (profile_id) values ('90000000-0000-4000-8000-000000000003');
select pg_temp.preference_assert((select not marketing_emails and preferences_changed_at = '2026-09-05T05:00:00Z'
 from public.email_preferences where profile_id = '90000000-0000-4000-8000-000000000003'), 'new duplicate erased removal');
-- Deliberate later enabling is allowed and propagates to existing duplicate preferences.
update public.email_preferences set marketing_emails = true, abandoned_checkout_emails = true,
 unsubscribed_at = null, unsubscribe_reason = null, preferences_changed_at = '2026-09-05T07:00:00Z'
 where profile_id = '90000000-0000-4000-8000-000000000001';
select public.record_email_spam_complaint('preference-order@example.test', '2026-09-05T06:00:00Z');
select pg_temp.preference_assert((select bool_and(marketing_emails and abandoned_checkout_emails and preferences_changed_at = '2026-09-05T07:00:00Z')
 from public.email_preferences where profile_id::text like '90000000-%'), 'older complaint erased deliberate later enabling');
select public.record_email_spam_complaint('preference-order@example.test', '2026-09-05T08:00:00Z');
select pg_temp.preference_assert((select bool_and(not marketing_emails and not abandoned_checkout_emails and preferences_changed_at = '2026-09-05T08:00:00Z')
 from public.email_preferences where profile_id::text like '90000000-%'), 'later complaint must win');
-- A non-complaint disabled setting also survives generic updates and row recreation.
update public.email_preferences set marketing_emails = false, abandoned_checkout_emails = true,
 unsubscribe_reason = 'preference_center', preferences_changed_at = '2026-09-05T09:00:00Z'
 where profile_id = '90000000-0000-4000-8000-000000000001';
delete from public.email_preferences where profile_id = '90000000-0000-4000-8000-000000000003';
insert into public.email_preferences (profile_id) values ('90000000-0000-4000-8000-000000000003');
select pg_temp.preference_assert((select not marketing_emails and abandoned_checkout_emails and preferences_changed_at = '2026-09-05T09:00:00Z'
 from public.email_preferences where profile_id = '90000000-0000-4000-8000-000000000003'), 'recreated preferences erased a disabled setting');
rollback;
