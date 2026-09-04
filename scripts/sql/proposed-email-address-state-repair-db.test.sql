create function pg_temp.assert_true(value boolean, message text) returns void language plpgsql as $$ begin if value is distinct from true then raise exception '%', message; end if; end; $$;
-- Synthetic assertions for the separate repair proposal. Run only in the
-- isolated harness after loading the proposal inside a rollback transaction.
select pg_temp.assert_true(
  (select not email_bounced
      and email_bounce_reason is null
      and email_bounced_at is null
      and email_delivery_failures = 0
   from public.profiles
   where id = '10000000-0000-4000-8000-000000000090'),
  'legacy single soft bounce stayed permanently suppressed'
);
select pg_temp.assert_true(
  (select not profile.email_bounced
      and profile.email_delivery_failures = 0
      and not preferences.marketing_emails
      and not preferences.abandoned_checkout_emails
      and preferences.unsubscribe_reason = 'spam_complaint'
   from public.profiles as profile
   join public.email_preferences as preferences on preferences.profile_id = profile.id
   where profile.id = '10000000-0000-4000-8000-000000000091'),
  'legacy complaint cleanup did not retain sticky preference ownership'
);
select pg_temp.assert_true(
  (select email_bounced
      and email_bounce_reason = 'hard: Invalid mailbox'
      and email_delivery_failures = 1
   from public.profiles
   where id = '10000000-0000-4000-8000-000000000092'),
  'legacy cleanup erased genuine hard-bounce evidence'
);
select pg_temp.assert_true(
  (select email_bounced
      and email_bounce_reason = 'soft: Misclassified permanent'
      and email_delivery_failures = 1
   from public.profiles
   where id = '10000000-0000-4000-8000-000000000093'),
  'legacy cleanup erased durable nested Permanent evidence'
);

-- Address-owned provider state resets only for a real normalized-email
-- change. Insert and case/whitespace-only updates preserve the state; a
-- corrected address starts with clean delivery evidence.
insert into public.profiles (
  id, role, email, email_bounced, email_bounce_reason, email_bounced_at,
  email_delivery_failures
) values (
  '10000000-0000-4000-8000-000000000035',
  'patient',
  'address-reset@example.test',
  true,
  'hard: prior address',
  '2026-09-05T00:00:00Z',
  3
);
update public.profiles
set email = ' Address-Reset@Example.Test '
where id = '10000000-0000-4000-8000-000000000035';
select pg_temp.assert_true(
  (select email_bounced
      and email_bounce_reason = 'hard: prior address'
      and email_delivery_failures = 3
   from public.profiles
   where id = '10000000-0000-4000-8000-000000000035'),
  'equivalent normalized email reset current address delivery state'
);
update public.profiles
set email = 'corrected-address@example.test'
where id = '10000000-0000-4000-8000-000000000035';
select pg_temp.assert_true(
  (select normalized_email = 'corrected-address@example.test'
      and not email_bounced
      and email_bounce_reason is null
      and email_bounced_at is null
      and email_delivery_failures = 0
   from public.profiles
   where id = '10000000-0000-4000-8000-000000000035'),
  'real normalized email change retained prior address delivery state'
);
