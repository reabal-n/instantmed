-- Explicit communication preference order. Defaults remain ON; no treatment-consent change.
-- Ordinary row creation and updated_at are never evidence of re-enablement.
alter table public.email_preferences
  add column if not exists preferences_changed_at timestamptz;
comment on column public.email_preferences.preferences_changed_at is
  'Time of a deliberate preference change or provider complaint; NULL for untouched defaults. Independent of the general updated_at trigger.';

create or replace function public.preserve_email_preference_choice()
returns trigger language plpgsql security definer set search_path = ''
as $function$
declare
  v_prior public.email_preferences;
begin
  if tg_op = 'INSERT' and new.preferences_changed_at is null then
    -- Recreated/default rows inherit a recorded choice for the same address.
    select preference.* into v_prior
    from public.email_preferences as preference
    join public.profiles as existing on existing.id = preference.profile_id
    join public.profiles as target on target.id = new.profile_id
    where existing.normalized_email = target.normalized_email
      and existing.role = 'patient' and target.role = 'patient'
      and existing.merged_into_profile_id is null
      and (preference.preferences_changed_at is not null
        or not preference.marketing_emails or not preference.abandoned_checkout_emails)
    order by coalesce(preference.preferences_changed_at, preference.unsubscribed_at, preference.updated_at) desc,
      preference.profile_id
    limit 1;
    if found then
      new.marketing_emails := v_prior.marketing_emails;
      new.abandoned_checkout_emails := v_prior.abandoned_checkout_emails;
      new.unsubscribed_at := v_prior.unsubscribed_at;
      new.unsubscribe_reason := v_prior.unsubscribe_reason;
      new.preferences_changed_at := v_prior.preferences_changed_at;
    end if;
  elsif tg_op = 'UPDATE' and (new.preferences_changed_at is null
    or new.preferences_changed_at is not distinct from old.preferences_changed_at) then
    new.preferences_changed_at := old.preferences_changed_at;
    -- Legacy opt-out writes still count; generic default upserts cannot enable a disabled flag.
    new.marketing_emails := new.marketing_emails and old.marketing_emails;
    new.abandoned_checkout_emails := new.abandoned_checkout_emails and old.abandoned_checkout_emails;
    if new.marketing_emails is distinct from old.marketing_emails
      or new.abandoned_checkout_emails is distinct from old.abandoned_checkout_emails then
      new.preferences_changed_at := pg_catalog.clock_timestamp();
    else
      new.unsubscribed_at := old.unsubscribed_at;
      new.unsubscribe_reason := old.unsubscribe_reason;
    end if;
  end if;
  return new;
end;
$function$;
drop trigger if exists email_preferences_choice_guard on public.email_preferences;
create trigger email_preferences_choice_guard before insert or update on public.email_preferences
  for each row execute function public.preserve_email_preference_choice();

create or replace function public.mirror_explicit_email_preference_choice()
returns trigger language plpgsql security definer set search_path = ''
as $function$
begin
  if pg_catalog.pg_trigger_depth() > 1 or new.preferences_changed_at is null then return new; end if;
  if tg_op = 'UPDATE' and new.preferences_changed_at is not distinct from old.preferences_changed_at then return new; end if;
  -- Communication choice follows the recipient; this never links Auth accounts or moves patient records.
  update public.email_preferences as preference set
    marketing_emails = new.marketing_emails,
    abandoned_checkout_emails = new.abandoned_checkout_emails,
    unsubscribed_at = new.unsubscribed_at,
    unsubscribe_reason = new.unsubscribe_reason,
    preferences_changed_at = new.preferences_changed_at
  from public.profiles as existing, public.profiles as target
  where target.id = new.profile_id and existing.id = preference.profile_id
    and existing.normalized_email = target.normalized_email
    and existing.role = 'patient' and target.role = 'patient'
    and existing.merged_into_profile_id is null
    and preference.profile_id <> new.profile_id
    and coalesce(preference.preferences_changed_at, '-infinity'::timestamptz) < new.preferences_changed_at;
  return new;
end;
$function$;
drop trigger if exists email_preferences_choice_mirror on public.email_preferences;
create trigger email_preferences_choice_mirror after insert or update on public.email_preferences
  for each row execute function public.mirror_explicit_email_preference_choice();
revoke all on function public.preserve_email_preference_choice() from public, anon, authenticated;
revoke all on function public.mirror_explicit_email_preference_choice() from public, anon, authenticated;

drop function if exists public.record_email_spam_complaint(uuid, timestamptz);

create or replace function public.record_email_spam_complaint(
  p_normalized_email text,
  p_event_created_at timestamptz
)
returns integer
language plpgsql
volatile
security invoker
set search_path = ''
as $function$
declare
  v_normalized_email text;
  v_affected integer := 0;
begin
  v_normalized_email := nullif(lower(btrim(p_normalized_email)), '');
  if v_normalized_email is null or p_event_created_at is null then
    raise exception 'invalid email complaint ownership';
  end if;

  if exists (
    select 1 from public.email_preferences as preference
    join public.profiles as profile on profile.id = preference.profile_id
    where profile.normalized_email = v_normalized_email
      and profile.role = 'patient' and profile.merged_into_profile_id is null
      and preference.preferences_changed_at > p_event_created_at
  ) then return 0; end if;

  insert into public.email_preferences as preferences (
    profile_id,
    marketing_emails,
    abandoned_checkout_emails,
    unsubscribed_at,
    unsubscribe_reason,
    preferences_changed_at
  )
  select
    profile.id,
    false,
    false,
    p_event_created_at,
    'spam_complaint',
    p_event_created_at
  from public.profiles as profile
  where profile.normalized_email = v_normalized_email
    and profile.role = 'patient'
    and profile.merged_into_profile_id is null
  on conflict (profile_id) do update
  set
    marketing_emails = false,
    abandoned_checkout_emails = false,
    unsubscribed_at = case
      when preferences.unsubscribed_at is null then excluded.unsubscribed_at
      else least(preferences.unsubscribed_at, excluded.unsubscribed_at)
    end,
    unsubscribe_reason = excluded.unsubscribe_reason,
    preferences_changed_at = excluded.preferences_changed_at
  where excluded.preferences_changed_at >= coalesce(preferences.preferences_changed_at, '-infinity'::timestamptz);

  get diagnostics v_affected = row_count;
  return v_affected;
end;
$function$;

comment on function public.record_email_spam_complaint(text, timestamptz) is
  'Applies a hash-verified auth-email spam complaint to every active patient profile for the normalized address, only when it is not older than explicit consent.';

revoke all on function public.record_email_spam_complaint(text, timestamptz)
  from public, anon, authenticated, service_role;
grant execute on function public.record_email_spam_complaint(text, timestamptz)
  to service_role;
