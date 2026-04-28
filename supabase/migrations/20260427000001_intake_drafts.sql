-- Server-side intake drafts. Backs the cross-device "finish on another device"
-- feature and feeds the partial-intake email recovery cron.
--
-- Design notes:
--   * session_id is the session token. Anyone holding it can read/write the draft.
--   * The table is RLS-locked. All access goes through the /api/draft route
--     (service role) which validates the session_id from the request body.
--   * email is denormalised onto the row so the recovery cron can find drafts
--     by email without scanning answers JSON.
--   * expires_at + cleanup cron keeps the table small.

create table if not exists public.intake_drafts (
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

  -- Recovery email tracking - PR4 will populate these
  recovery_email_sent_at timestamptz,
  converted_to_intake_id uuid -- set when the draft is realised as a real intake; suppresses recovery emails
);

-- Find stale drafts by email for recovery cron
create index idx_intake_drafts_recovery
  on public.intake_drafts (email, recovery_email_sent_at, updated_at)
  where email is not null and converted_to_intake_id is null;

-- Cleanup expired rows
create index idx_intake_drafts_expires_at on public.intake_drafts (expires_at);

-- Updated-at trigger
create or replace function public.tg_intake_drafts_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_intake_drafts_set_updated_at
  before update on public.intake_drafts
  for each row execute function public.tg_intake_drafts_set_updated_at();

-- RLS: lock down direct access. All reads/writes go through the service-role API.
alter table public.intake_drafts enable row level security;

-- No anon or authenticated policies are added. Service role bypasses RLS.

-- Periodic cleanup function: deletes expired drafts. Called by a Vercel cron.
create or replace function public.cleanup_expired_intake_drafts()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  delete from public.intake_drafts
  where expires_at < now();

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

comment on table public.intake_drafts is
  'Server-side intake drafts. Anonymous (no auth required). RLS-locked - all access via /api/draft service-role route.';
comment on column public.intake_drafts.session_id is
  'Session token. Knowing this id is the authorization to read/write this draft.';
comment on column public.intake_drafts.email is
  'Denormalised from answers so the recovery cron can find drafts by email cheaply.';
comment on column public.intake_drafts.converted_to_intake_id is
  'Set when this draft is realised as a real intakes row. Suppresses recovery emails for completed drafts.';
