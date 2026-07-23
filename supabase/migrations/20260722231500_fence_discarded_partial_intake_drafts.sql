-- Make explicit draft discard win against every concurrent or delayed write.
--
-- A client-side timer cancellation cannot stop an already-started fetch or a
-- pagehide sendBeacon. Saves and deletes first share a DB-first compatibility
-- gate, then the mutation path serializes by the bearer session UUID.
-- Tombstones contain no PHI and outlive the seven-day draft window by one day.

create table if not exists public.partial_intake_discard_tombstones (
  session_id uuid primary key,
  flow_instance_id uuid,
  discarded_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '8 days')
);

comment on table public.partial_intake_discard_tombstones is
  'PHI-free lifecycle fence preventing delayed writes from recreating explicitly discarded anonymous intake drafts.';
comment on column public.partial_intake_discard_tombstones.session_id is
  'Secret draft bearer UUID retained only as a service-role lifecycle tombstone; never log or expose it.';
comment on column public.partial_intake_discard_tombstones.flow_instance_id is
  'Opaque non-PHI same-bearer consistency metadata; never authority to affect another session.';

create index if not exists idx_partial_intake_discard_tombstones_expires_at
  on public.partial_intake_discard_tombstones (expires_at);

alter table public.partial_intake_discard_tombstones enable row level security;
revoke all on table public.partial_intake_discard_tombstones
  from public, anon, authenticated;
grant select, insert, update, delete on table public.partial_intake_discard_tombstones
  to service_role;

create or replace function public.enforce_partial_intake_discard_fence()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  active_flow_instance_id uuid;
begin
  -- Compatibility gate for the DB-first rollout. Saves share this lock, so
  -- they remain concurrent; every DELETE takes the exclusive form in a
  -- statement trigger before PostgreSQL locks any target row.
  perform pg_catalog.pg_advisory_xact_lock_shared(731947, 1);

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('session:' || new.session_id::text, 0)
  );

  select partial.flow_instance_id
  into active_flow_instance_id
  from public.partial_intakes as partial
  where partial.session_id = new.session_id;

  if active_flow_instance_id is not null then
    if new.flow_instance_id is not null
      and new.flow_instance_id <> active_flow_instance_id then
      raise exception 'draft_session_flow_mismatch'
        using errcode = '23514';
    end if;
    new.flow_instance_id := active_flow_instance_id;
  end if;

  if exists (
    select 1
    from public.partial_intake_discard_tombstones as tombstone
    where tombstone.session_id = new.session_id
      and tombstone.expires_at > now()
  ) then
    return null;
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_partial_intake_discard_fence()
  from public, anon, authenticated;

create or replace function public.preserve_partial_intake_flow_identity()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.flow_instance_id is not null
    and new.flow_instance_id is distinct from old.flow_instance_id then
    raise exception 'draft_session_flow_mismatch'
      using errcode = '23514';
  end if;
  if new.service_type is distinct from old.service_type then
    raise exception 'draft_session_service_mismatch'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function public.preserve_partial_intake_flow_identity()
  from public, anon, authenticated;

drop trigger if exists trg_partial_intakes_discard_fence on public.partial_intakes;
create trigger trg_partial_intakes_discard_fence
  before insert on public.partial_intakes
  for each row execute function public.enforce_partial_intake_discard_fence();

drop trigger if exists trg_partial_intakes_preserve_flow_identity on public.partial_intakes;
create trigger trg_partial_intakes_preserve_flow_identity
  before update of flow_instance_id, service_type on public.partial_intakes
  for each row execute function public.preserve_partial_intake_flow_identity();

-- Production is intentionally migrated before the RPC-backed application is
-- deployed. The currently serving route still issues a direct table DELETE.
-- Acquire the exclusive compatibility lock at statement time, before the
-- executor can lock rows, so a concurrent delayed upsert cannot pass the
-- tombstone check and recreate PHI after that legacy DELETE.
create or replace function public.lock_partial_intake_delete_statement()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(731947, 1);
  return null;
end;
$$;

revoke all on function public.lock_partial_intake_delete_statement()
  from public, anon, authenticated;

create or replace function public.tombstone_partial_intake_deleted_row()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  active_tombstone_flow_instance_id uuid;
begin
  select tombstone.flow_instance_id
  into active_tombstone_flow_instance_id
  from public.partial_intake_discard_tombstones as tombstone
  where tombstone.session_id = old.session_id
    and tombstone.expires_at > now()
  for update;

  if active_tombstone_flow_instance_id is not null
    and old.flow_instance_id is not null
    and active_tombstone_flow_instance_id <> old.flow_instance_id then
    raise exception 'draft_session_flow_mismatch'
      using errcode = '23514';
  end if;

  insert into public.partial_intake_discard_tombstones (
    session_id,
    flow_instance_id,
    discarded_at,
    expires_at
  ) values (
    old.session_id,
    old.flow_instance_id,
    now(),
    now() + interval '8 days'
  )
  on conflict (session_id) do update
  set flow_instance_id = case
        when public.partial_intake_discard_tombstones.expires_at <= now()
          then excluded.flow_instance_id
        else coalesce(
          excluded.flow_instance_id,
          public.partial_intake_discard_tombstones.flow_instance_id
        )
      end,
      discarded_at = excluded.discarded_at,
      expires_at = case
        when public.partial_intake_discard_tombstones.expires_at <= now()
          then excluded.expires_at
        else greatest(
          public.partial_intake_discard_tombstones.expires_at,
          excluded.expires_at
        )
      end;

  return old;
end;
$$;

revoke all on function public.tombstone_partial_intake_deleted_row()
  from public, anon, authenticated;

drop trigger if exists trg_partial_intakes_delete_compat_lock
  on public.partial_intakes;
create trigger trg_partial_intakes_delete_compat_lock
  before delete on public.partial_intakes
  for each statement execute function public.lock_partial_intake_delete_statement();

drop trigger if exists trg_partial_intakes_delete_compat_fence
  on public.partial_intakes;
create trigger trg_partial_intakes_delete_compat_fence
  before delete on public.partial_intakes
  for each row execute function public.tombstone_partial_intake_deleted_row();

-- Checkout must atomically verify and, for a legacy row only, claim the
-- bearer/flow/service tuple before using the bearer as submission identity.
-- Without this critical section two tabs could both observe a null legacy
-- flow and route the second checkout into the first tab's intake.
create or replace function public.claim_partial_intake_draft_for_checkout(
  p_session_id uuid,
  p_flow_instance_id uuid,
  p_service_type text
)
returns table (
  converted_to_intake_id uuid,
  email text,
  flow_instance_id uuid,
  service_type text
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  draft_record public.partial_intakes%rowtype;
begin
  if p_session_id is null
    or p_flow_instance_id is null
    or p_service_type is null then
    raise exception 'draft_checkout_identity_required'
      using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('session:' || p_session_id::text, 0)
  );

  if exists (
    select 1
    from public.partial_intake_discard_tombstones as tombstone
    where tombstone.session_id = p_session_id
      and tombstone.expires_at > now()
  ) then
    raise exception 'draft_checkout_tombstoned'
      using errcode = '23514';
  end if;

  select partial.*
  into draft_record
  from public.partial_intakes as partial
  where partial.session_id = p_session_id
  for update;

  if not found then
    -- The DB-first compatibility trigger does not take the session lock, so a
    -- direct DELETE can win between the first tombstone check and this read.
    -- Reclassify that race as an explicit discard instead of ordinary absence.
    if exists (
      select 1
      from public.partial_intake_discard_tombstones as tombstone
      where tombstone.session_id = p_session_id
        and tombstone.expires_at > now()
    ) then
      raise exception 'draft_checkout_tombstoned'
        using errcode = '23514';
    end if;
    return;
  end if;

  if draft_record.expires_at <= now() then
    return;
  end if;

  if draft_record.service_type is distinct from p_service_type then
    raise exception 'draft_session_service_mismatch'
      using errcode = '23514';
  end if;

  if draft_record.flow_instance_id is not null
    and draft_record.flow_instance_id <> p_flow_instance_id then
    raise exception 'draft_session_flow_mismatch'
      using errcode = '23514';
  end if;

  if draft_record.flow_instance_id is null then
    update public.partial_intakes as partial
    set flow_instance_id = p_flow_instance_id
    where partial.session_id = p_session_id;
    draft_record.flow_instance_id := p_flow_instance_id;
  end if;

  converted_to_intake_id := draft_record.converted_to_intake_id;
  email := draft_record.email;
  flow_instance_id := draft_record.flow_instance_id;
  service_type := draft_record.service_type;
  return next;
end;
$$;

comment on function public.claim_partial_intake_draft_for_checkout(
  uuid,
  uuid,
  text
) is
  'Atomically verifies bearer, flow, and service identity for checkout, claiming only a legacy null-flow row.';

revoke all on function public.claim_partial_intake_draft_for_checkout(
  uuid,
  uuid,
  text
) from public, anon, authenticated;
grant execute on function public.claim_partial_intake_draft_for_checkout(
  uuid,
  uuid,
  text
) to service_role;

drop function if exists public.discard_partial_intake_draft(uuid);

create or replace function public.discard_partial_intake_draft(
  p_session_id uuid,
  p_flow_instance_id uuid default null
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  row_flow_instance_id uuid;
  tombstone_flow_instance_id uuid;
  discarded_flow_instance_id uuid;
begin
  if p_session_id is null then
    raise exception 'draft_session_id_required'
      using errcode = '22023';
  end if;

  -- This must precede the per-session lock and every DELETE statement so the
  -- DB-first legacy route cannot invert row and advisory lock order.
  perform pg_catalog.pg_advisory_xact_lock(731947, 1);

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('session:' || p_session_id::text, 0)
  );

  select partial.flow_instance_id
  into row_flow_instance_id
  from public.partial_intakes as partial
  where partial.session_id = p_session_id;

  select tombstone.flow_instance_id
  into tombstone_flow_instance_id
  from public.partial_intake_discard_tombstones as tombstone
  where tombstone.session_id = p_session_id
    and tombstone.expires_at > now();

  if row_flow_instance_id is not null
    and tombstone_flow_instance_id is not null
    and row_flow_instance_id <> tombstone_flow_instance_id then
    raise exception 'draft_session_flow_mismatch'
      using errcode = '23514';
  end if;

  if p_flow_instance_id is not null
    and coalesce(row_flow_instance_id, tombstone_flow_instance_id) is not null
    and p_flow_instance_id <>
      coalesce(row_flow_instance_id, tombstone_flow_instance_id) then
    raise exception 'draft_session_flow_mismatch'
      using errcode = '23514';
  end if;

  discarded_flow_instance_id := coalesce(
    row_flow_instance_id,
    tombstone_flow_instance_id
  );

  insert into public.partial_intake_discard_tombstones (
    session_id,
    flow_instance_id,
    discarded_at,
    expires_at
  ) values (
    p_session_id,
    discarded_flow_instance_id,
    now(),
    now() + interval '8 days'
  )
  on conflict (session_id) do update
  set flow_instance_id = case
        when public.partial_intake_discard_tombstones.expires_at <= now()
          then excluded.flow_instance_id
        else coalesce(
          public.partial_intake_discard_tombstones.flow_instance_id,
          excluded.flow_instance_id
        )
      end,
      discarded_at = excluded.discarded_at,
      expires_at = case
        when public.partial_intake_discard_tombstones.expires_at <= now()
          then excluded.expires_at
        else greatest(
          public.partial_intake_discard_tombstones.expires_at,
          excluded.expires_at
        )
      end;

  delete from public.partial_intakes
  where session_id = p_session_id;

  return true;
end;
$$;

comment on function public.discard_partial_intake_draft(uuid, uuid) is
  'Atomically fences one proven bearer session against stale saves, validates its flow metadata, then physically deletes only that PHI draft row.';

revoke all on function public.discard_partial_intake_draft(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.discard_partial_intake_draft(uuid, uuid)
  to service_role;

create or replace function public.cleanup_expired_partial_intakes()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted_draft_count integer;
  deleted_tombstone_count integer;
begin
  -- Match the compatibility ordering used by saves and explicit discard.
  -- The DELETE statement trigger reacquires this transaction lock safely.
  perform pg_catalog.pg_advisory_xact_lock(731947, 1);

  delete from public.partial_intake_discard_tombstones
  where expires_at < now();
  get diagnostics deleted_tombstone_count = row_count;

  delete from public.partial_intakes
  where expires_at < now();
  get diagnostics deleted_draft_count = row_count;

  return deleted_draft_count + deleted_tombstone_count;
end;
$$;

revoke execute on function public.cleanup_expired_partial_intakes()
  from public, anon, authenticated;
grant execute on function public.cleanup_expired_partial_intakes()
  to service_role;
