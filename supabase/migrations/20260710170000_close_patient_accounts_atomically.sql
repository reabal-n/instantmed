-- Close patient sign-in access without leaving an RLS-authorizing
-- profiles.auth_user_id behind. The separate tombstone deliberately has no
-- foreign key to auth.users, so auth cleanup cannot cascade it away.

create table if not exists public.closed_auth_accounts (
  auth_user_id uuid primary key,
  profile_id uuid not null,
  closed_at timestamptz not null default now(),
  reason text not null default 'self_service'
);

-- The squashed baseline still declares profiles.email NOT NULL even though the
-- production schema and account-closure policy allow it to be minimised. Pin
-- that production truth for fresh databases before the closure RPC sets NULL.
alter table public.profiles alter column email drop not null;

-- The squashed baseline calls the patient street column address_line_1, while
-- the live schema and application use address_line1. Reconcile that drift
-- before compiling the closure RPC so fresh databases can both run the
-- function and minimise the same PHI column as production. If both columns
-- exist, retain the canonical value, backfill gaps, then remove the legacy PHI
-- copy so closure cannot leave it behind.
do $$
declare
  v_has_legacy_address boolean;
  v_has_canonical_address boolean;
begin
  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'address_line_1'
  ) into v_has_legacy_address;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'address_line1'
  ) into v_has_canonical_address;

  if v_has_legacy_address and not v_has_canonical_address then
    alter table public.profiles rename column address_line_1 to address_line1;
  elsif v_has_legacy_address and v_has_canonical_address then
    update public.profiles
    set address_line1 = coalesce(address_line1, address_line_1)
    where address_line1 is null
      and address_line_1 is not null;

    alter table public.profiles drop column address_line_1;
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'address_line1'
  ) then
    raise exception 'profiles.address_line1 is required for account closure';
  end if;
end;
$$;

comment on table public.closed_auth_accounts is
  'Service-role-only durable tombstones preventing closed Supabase Auth users from recreating or relinking patient profiles.';

alter table public.closed_auth_accounts enable row level security;
alter table public.closed_auth_accounts force row level security;

revoke all on table public.closed_auth_accounts from public, anon, authenticated;
grant select, insert on table public.closed_auth_accounts to service_role;

drop policy if exists closed_auth_accounts_service_role on public.closed_auth_accounts;
create policy closed_auth_accounts_service_role
  on public.closed_auth_accounts
  for all
  to service_role
  using (true)
  with check (true);

-- App-side tombstone checks improve UX but cannot be the security boundary: a
-- concurrent service-role writer could otherwise link/create a profile after
-- its check and after closure commits. Enforce the invariant at the row write.
create or replace function public.reject_closed_auth_profile_link()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.auth_user_id is not null
    and exists (
      select 1
      from public.closed_auth_accounts closed
      where closed.auth_user_id = new.auth_user_id
    )
  then
    raise exception 'Closed auth account cannot be linked to a profile';
  end if;

  return new;
end;
$$;

revoke all on function public.reject_closed_auth_profile_link() from public, anon, authenticated;

drop trigger if exists reject_closed_auth_profile_insert on public.profiles;
create trigger reject_closed_auth_profile_insert
before insert on public.profiles
for each row
execute function public.reject_closed_auth_profile_link();

drop trigger if exists reject_closed_auth_profile_update on public.profiles;
create trigger reject_closed_auth_profile_update
before update of auth_user_id on public.profiles
for each row
when (new.auth_user_id is not null)
execute function public.reject_closed_auth_profile_link();

-- Storage can be called directly with a still-live access JWT, bypassing app
-- guards. Require the Auth identity to remain linked to an open profile for
-- every auth-ID-keyed patient object policy.
drop policy if exists avatars_owner_read on storage.objects;
create policy avatars_owner_read on storage.objects
  for select using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
    and exists (
      select 1 from public.profiles p
      where p.auth_user_id = auth.uid()
        and p.account_closed_at is null
    )
  );

drop policy if exists avatars_owner_insert on storage.objects;
create policy avatars_owner_insert on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
    and exists (
      select 1 from public.profiles p
      where p.auth_user_id = auth.uid()
        and p.account_closed_at is null
    )
  );

drop policy if exists avatars_owner_update on storage.objects;
create policy avatars_owner_update on storage.objects
  for update using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
    and exists (
      select 1 from public.profiles p
      where p.auth_user_id = auth.uid()
        and p.account_closed_at is null
    )
  )
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
    and exists (
      select 1 from public.profiles p
      where p.auth_user_id = auth.uid()
        and p.account_closed_at is null
    )
  );

drop policy if exists avatars_owner_delete on storage.objects;
create policy avatars_owner_delete on storage.objects
  for delete using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
    and exists (
      select 1 from public.profiles p
      where p.auth_user_id = auth.uid()
        and p.account_closed_at is null
    )
  );

drop policy if exists intake_photos_patient_read on storage.objects;
create policy intake_photos_patient_read on storage.objects
  for select using (
    bucket_id = 'intake-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
    and exists (
      select 1 from public.profiles p
      where p.auth_user_id = auth.uid()
        and p.account_closed_at is null
    )
  );

drop policy if exists intake_photos_patient_insert on storage.objects;
create policy intake_photos_patient_insert on storage.objects
  for insert with check (
    bucket_id = 'intake-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
    and exists (
      select 1 from public.profiles p
      where p.auth_user_id = auth.uid()
        and p.account_closed_at is null
    )
  );

-- The squashed baseline contains this obsolete broad documents policy even
-- though production no longer does. Signed URLs use their embedded signature;
-- authenticated users must never receive blanket SELECT on the PHI bucket.
drop policy if exists "Authenticated users can view documents via signed URL" on storage.objects;
drop policy if exists "Anyone can view documents" on storage.objects;

-- Supabase access JWTs remain valid until their short expiry even after a
-- global sign-out. Most patient RLS joins through profiles.auth_user_id, which
-- closure clears, but these legacy PHI tables key ownership directly to
-- auth.users. Keep normal patient access while requiring the linked profile to
-- remain open, so detaching the profile is an immediate database boundary.
drop policy if exists "intake_drafts_owner_select" on public.intake_drafts;
create policy "intake_drafts_owner_select"
  on public.intake_drafts
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.auth_user_id = (select auth.uid())
        and p.account_closed_at is null
        and p.role = 'patient'
    )
  );

drop policy if exists "intake_drafts_owner_update" on public.intake_drafts;
create policy "intake_drafts_owner_update"
  on public.intake_drafts
  for update
  to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.auth_user_id = (select auth.uid())
        and p.account_closed_at is null
        and p.role = 'patient'
    )
  )
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.auth_user_id = (select auth.uid())
        and p.account_closed_at is null
        and p.role = 'patient'
    )
  );

drop policy if exists "intake_drafts_owner_insert" on public.intake_drafts;
create policy "intake_drafts_owner_insert"
  on public.intake_drafts
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.auth_user_id = (select auth.uid())
        and p.account_closed_at is null
        and p.role = 'patient'
    )
  );

drop policy if exists "intake_drafts_user_delete" on public.intake_drafts;
create policy "intake_drafts_user_delete"
  on public.intake_drafts
  for delete
  to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.auth_user_id = (select auth.uid())
        and p.account_closed_at is null
        and p.role = 'patient'
    )
  );

-- Production and the squashed baseline differ on which retired AI audit
-- tables still exist. Recreate only policies whose table is present.
do $closure_ai_rls$
begin
  if to_regclass('public.ai_chat_audit_log') is not null then
    execute 'drop policy if exists "Patients can view own chat audit log" on public.ai_chat_audit_log';
    execute $policy$
      create policy "Patients can view own chat audit log"
        on public.ai_chat_audit_log
        for select
        to authenticated
        using (
          patient_id = (select auth.uid())
          and exists (
            select 1 from public.profiles p
            where p.auth_user_id = (select auth.uid())
              and p.account_closed_at is null
              and p.role = 'patient'
          )
        )
    $policy$;
  end if;

  if to_regclass('public.ai_intake_completions') is not null then
    execute 'drop policy if exists "Patients can view own completions" on public.ai_intake_completions';
    execute $policy$
      create policy "Patients can view own completions"
        on public.ai_intake_completions
        for select
        to authenticated
        using (
          patient_id = (select auth.uid())
          and exists (
            select 1 from public.profiles p
            where p.auth_user_id = (select auth.uid())
              and p.account_closed_at is null
              and p.role = 'patient'
          )
        )
    $policy$;
  end if;

  if to_regclass('public.ai_chat_transcripts') is not null then
    execute 'drop policy if exists "Patients can read own transcripts" on public.ai_chat_transcripts';
    execute $policy$
      create policy "Patients can read own transcripts"
        on public.ai_chat_transcripts
        for select
        to authenticated
        using (
          patient_id = (select auth.uid())
          and exists (
            select 1 from public.profiles p
            where p.auth_user_id = (select auth.uid())
              and p.account_closed_at is null
              and p.role = 'patient'
          )
        )
    $policy$;
  end if;

  if to_regclass('public.ai_safety_blocks') is not null then
    execute 'drop policy if exists "Patients can view own safety blocks" on public.ai_safety_blocks';
    execute $policy$
      create policy "Patients can view own safety blocks"
        on public.ai_safety_blocks
        for select
        to authenticated
        using (
          patient_id = (select auth.uid())
          and exists (
            select 1 from public.profiles p
            where p.auth_user_id = (select auth.uid())
              and p.account_closed_at is null
              and p.role = 'patient'
          )
        )
    $policy$;
  end if;
end;
$closure_ai_rls$;

-- Repair any closure rows created by an older app release that retained the
-- auth identifier. The migration itself is transactional: persist the
-- tombstone before removing the RLS-authorizing profile link.
insert into public.closed_auth_accounts (auth_user_id, profile_id, closed_at, reason)
select
  p.auth_user_id,
  p.id,
  p.account_closed_at,
  coalesce(nullif(trim(p.account_closure_reason), ''), 'legacy_closure')
from public.profiles p
where p.account_closed_at is not null
  and p.auth_user_id is not null
on conflict (auth_user_id) do nothing;

update public.profiles
set auth_user_id = null
where account_closed_at is not null
  and auth_user_id is not null;

-- Database backstop for the migration-before-app-deploy window and any future
-- closure writer. Capture the old auth link in the same profile UPDATE
-- transaction before it can stop authorizing RLS ownership checks.
create or replace function public.capture_closed_profile_auth_tombstone()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if old.auth_user_id is not null
    and new.auth_user_id is null
    and new.account_closed_at is not null
  then
    insert into public.closed_auth_accounts (
      auth_user_id,
      profile_id,
      closed_at,
      reason
    )
    values (
      old.auth_user_id,
      old.id,
      new.account_closed_at,
      coalesce(nullif(trim(new.account_closure_reason), ''), 'profile_update')
    )
    on conflict (auth_user_id) do nothing;
  end if;

  return new;
end;
$$;

revoke all on function public.capture_closed_profile_auth_tombstone() from public, anon, authenticated;

drop trigger if exists capture_closed_profile_auth_tombstone on public.profiles;
create trigger capture_closed_profile_auth_tombstone
before update of auth_user_id, account_closed_at on public.profiles
for each row
execute function public.capture_closed_profile_auth_tombstone();

-- Serialize intake creation and every transition into active clinical/payment
-- work against account closure. Both paths lock the same profile row:
--
--   * intake write first  -> closure waits, then sees the committed active row
--   * closure first       -> intake waits, then rejects the closed profile
--
-- New inserts are guarded even when they begin as draft so a delayed checkout
-- cannot attach fresh work to a profile after the patient closes access.
create or replace function public.require_open_profile_for_intake_write()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_profile_is_open boolean;
begin
  if tg_op <> 'INSERT'
    and new.status::text not in (
      'pending_payment', 'checkout_failed', 'paid', 'in_review',
      'pending_info', 'approved', 'awaiting_script', 'escalated'
    )
  then
    return new;
  end if;

  select p.account_closed_at is null
  into v_profile_is_open
  from public.profiles p
  where p.id = new.patient_id
  for key share;

  if v_profile_is_open is distinct from true then
    raise exception 'Cannot attach active intake work to a closed profile';
  end if;

  return new;
end;
$$;

revoke all on function public.require_open_profile_for_intake_write() from public, anon, authenticated;

drop trigger if exists require_open_profile_for_intake_write on public.intakes;
create trigger require_open_profile_for_intake_write
before insert or update of patient_id, status on public.intakes
for each row
execute function public.require_open_profile_for_intake_write();

create or replace function public.close_patient_account(
  p_profile_id uuid,
  p_auth_user_id uuid,
  p_reason text default 'self_service'
)
returns table (
  success boolean,
  error_code text,
  closed_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_closed_at timestamptz := clock_timestamp();
  v_profile_id uuid;
begin
  select p.id
  into v_profile_id
  from public.profiles p
  where p.id = p_profile_id
    and p.auth_user_id = p_auth_user_id
    and p.role = 'patient'
    and p.account_closed_at is null
  for update;

  if v_profile_id is null then
    return query
      select false, 'not_found'::text, null::timestamptz;
    return;
  end if;

  if exists (
    select 1
    from public.intakes i
    where i.patient_id = v_profile_id
      and i.status::text in (
        'pending_payment', 'checkout_failed', 'paid', 'in_review',
        'pending_info', 'approved', 'awaiting_script', 'escalated'
      )
  ) then
    return query
      select false, 'active_intake'::text, null::timestamptz;
    return;
  end if;

  insert into public.closed_auth_accounts (
    auth_user_id,
    profile_id,
    closed_at,
    reason
  )
  values (
    p_auth_user_id,
    v_profile_id,
    v_closed_at,
    coalesce(nullif(trim(p_reason), ''), 'self_service')
  )
  on conflict (auth_user_id) do nothing;

  update public.profiles
  set
    auth_user_id = null,
    account_closed_at = v_closed_at,
    account_closure_reason = coalesce(nullif(trim(p_reason), ''), 'self_service'),
    email = null,
    full_name = 'Closed Account',
    first_name = null,
    last_name = null,
    avatar_url = null,
    date_of_birth = null,
    date_of_birth_encrypted = null,
    phone = null,
    phone_encrypted = null,
    address_line1 = null,
    suburb = null,
    state = null,
    postcode = null,
    medicare_number = null,
    medicare_number_encrypted = null,
    ihi_number = null,
    ihi_number_encrypted = null,
    medicare_irn = null,
    medicare_expiry = null,
    phi_encrypted_at = null,
    email_verified = false,
    email_verified_at = null,
    email_bounced = null,
    email_bounced_at = null,
    email_bounce_reason = null,
    email_delivery_failures = 0,
    stripe_customer_id = null,
    parchment_patient_id = null,
    certificate_identity_complete = false,
    updated_at = v_closed_at
  where id = v_profile_id
    and auth_user_id = p_auth_user_id
    and account_closed_at is null;

  if not found then
    raise exception 'profile changed during account closure';
  end if;

  return query
    select true, null::text, v_closed_at;
end;
$$;

revoke all on function public.close_patient_account(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.close_patient_account(uuid, uuid, text) to service_role;

-- Prevent the auth.users insert trigger from linking or creating a profile for
-- an auth identity that has already been closed.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_guest_profile_id uuid;
begin
  if exists (
    select 1
    from public.closed_auth_accounts closed
    where closed.auth_user_id = new.id
  ) then
    return new;
  end if;

  select p.id
  into v_guest_profile_id
  from public.profiles p
  where lower(p.email) = lower(new.email)
    and p.auth_user_id is null
    and p.account_closed_at is null
    and p.role = 'patient'
  order by
    exists (
      select 1
      from public.intakes i
      where i.patient_id = p.id
        and i.payment_status = 'paid'
    ) desc,
    p.created_at desc
  limit 1;

  if v_guest_profile_id is not null then
    update public.profiles p
    set
      auth_user_id = new.id,
      email_verified = true,
      email_verified_at = now()
    where p.id = v_guest_profile_id
      and p.auth_user_id is null
      and p.account_closed_at is null;
  else
    insert into public.profiles (auth_user_id, email, full_name, role)
    values (
      new.id,
      lower(new.email),
      coalesce(
        new.raw_user_meta_data->>'full_name',
        new.raw_user_meta_data->>'name',
        split_part(new.email, '@', 1)
      ),
      'patient'
    )
    on conflict (auth_user_id) do nothing;
  end if;

  return new;
exception when others then
  raise warning 'handle_new_user trigger failed for user %: %',
    new.id, sqlerrm;
  return new;
end;
$$;
