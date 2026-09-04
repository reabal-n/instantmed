-- Separate proposal, excluded from deploy migrations. Review affected rows and
-- obtain explicit production repair approval before adapting this dry run.
-- Default execution always rolls back, including the proposed trigger change.
begin;

-- Bounce state belongs to one normalized recipient address. A patient who
-- corrects an address must not inherit the prior address's provider failure,
-- while case/whitespace-only edits must leave the current address state intact.
-- Spam-complaint preference is deliberately profile-owned and is not touched.
create or replace function public.tg_profiles_identity_normalize()
returns trigger
language plpgsql
set search_path = ''
as $function$
declare
  v_normalized_email text;
begin
  v_normalized_email := nullif(lower(btrim(new.email)), '');

  if tg_op = 'UPDATE'
    and v_normalized_email is distinct from nullif(lower(btrim(old.email)), '')
  then
    new.email_bounced := false;
    new.email_bounce_reason := null;
    new.email_bounced_at := null;
    new.email_delivery_failures := 0;
  end if;

  new.normalized_email := v_normalized_email;
  new.normalized_phone := public.normalize_au_phone(new.phone);
  return new;
end;
$function$;

-- The retired webhook helper marked every soft bounce and complaint as a
-- permanent address defect. Clear only those recognizable legacy markers.
-- Complaint consent remains enforced by email_preferences until an explicit
-- preference-centre opt-in; hard/provider-suppressed evidence is untouched.
update public.profiles as profile
set
  email_bounced = false,
  email_bounce_reason = null,
  email_bounced_at = null,
  email_delivery_failures = 0
where profile.role = 'patient'
  and profile.email_bounced = true
  and (
    lower(coalesce(profile.email_bounce_reason, '')) like 'soft:%'
    or lower(coalesce(profile.email_bounce_reason, '')) like 'transient:%'
    or lower(coalesce(profile.email_bounce_reason, '')) like 'temporary:%'
    or lower(coalesce(profile.email_bounce_reason, '')) like 'undetermined:%'
    or (
      lower(coalesce(profile.email_bounce_reason, '')) like 'complaint:%'
      and exists (
        select 1
        from public.email_preferences as preferences
        where preferences.profile_id = profile.id
          and preferences.unsubscribe_reason = 'spam_complaint'
      )
    )
  )
  and not exists (
    select 1
    from public.email_outbox as suppression
    where nullif(lower(btrim(suppression.to_email)), '') = profile.normalized_email
      and suppression.patient_id in (
        select address_profile.id
        from public.profiles as address_profile
        where address_profile.normalized_email = profile.normalized_email
          and address_profile.role = 'patient'
          and address_profile.merged_into_profile_id is null
      )
      and (
        suppression.delivery_status = 'suppressed'
        or (
          suppression.delivery_status = 'bounced'
          and (
            lower(coalesce(suppression.metadata ->> 'bounce_type', '')) = 'hard'
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
        where nullif(lower(btrim(newer_success.to_email)), '') = profile.normalized_email
          and newer_success.patient_id in (
            select address_profile.id
            from public.profiles as address_profile
            where address_profile.normalized_email = profile.normalized_email
              and address_profile.role = 'patient'
              and address_profile.merged_into_profile_id is null
          )
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
  );


rollback;
