-- Marketing-funnel partial intake drafts.
--
-- Backs the cross-device "finish on another device" feature and feeds the
-- partial-intake email recovery cron. Distinct from the legacy clinical
-- `intake_drafts` table (PHI-heavy, encrypted, from the deleted /flow system).
--
-- Design notes:
--   * session_id is the session token. Anyone holding it can read/write the row.
--   * RLS-locked. All access goes through /api/draft (service role) which
--     validates the session_id from the request body.
--   * email/first_name/last_name/phone are denormalised onto the row so the
--     recovery cron can address users without parsing the answers JSON.
--   * expires_at + cleanup cron keeps the table small.
--
-- Initial table name `intake_drafts` collided with the legacy table from the
-- deleted /flow system, hence `partial_intakes`. Same purpose, different
-- audience: marketing funnel (this) vs clinical intake (legacy).

create table if not exists public.partial_intakes (
  session_id uuid primary key default gen_random_uuid(),
  service_type text not null check (service_type in ('med-cert', 'prescription', 'consult')),
  current_step_id text,
  answers jsonb not null default '{}'::jsonb,

  -- Identity (denormalised so the recovery cron can address users without parsing answers)
  email text,
  first_name text,
  last_name text,
  phone text,

  -- Lifecycle
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),

  -- Recovery email tracking
  recovery_email_sent_at timestamptz,
  converted_to_intake_id uuid -- set when realised as a real intake; suppresses recovery emails
);

create index if not exists idx_partial_intakes_recovery
  on public.partial_intakes (email, recovery_email_sent_at, updated_at)
  where email is not null and converted_to_intake_id is null;

create index if not exists idx_partial_intakes_expires_at on public.partial_intakes (expires_at);

create or replace function public.tg_partial_intakes_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_partial_intakes_set_updated_at on public.partial_intakes;
create trigger trg_partial_intakes_set_updated_at
  before update on public.partial_intakes
  for each row execute function public.tg_partial_intakes_set_updated_at();

alter table public.partial_intakes enable row level security;

create or replace function public.cleanup_expired_partial_intakes()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  delete from public.partial_intakes where expires_at < now();
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

comment on table public.partial_intakes is
  'Marketing-funnel partial intake drafts for cross-device resume + recovery email cron. Anonymous (no auth required). RLS-locked - all access via /api/draft service-role route. Distinct from clinical intake_drafts (legacy /flow system).';
comment on column public.partial_intakes.session_id is
  'Session token. Knowing this id is the authorization to read/write this draft.';
comment on column public.partial_intakes.email is
  'Denormalised from answers so the recovery cron can find drafts by email cheaply.';
comment on column public.partial_intakes.converted_to_intake_id is
  'Set when this draft is realised as a real intakes row. Suppresses recovery emails for completed drafts.';
