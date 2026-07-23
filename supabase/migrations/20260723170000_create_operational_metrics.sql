-- Restore the aggregate-only metrics table described by the squashed baseline.
--
-- Existing production databases predate the squashed baseline and never ran
-- its CREATE TABLE statement. The review reputation scorecard is the first
-- live consumer, so this incremental migration makes that dependency explicit.

create table if not exists public.operational_metrics (
  id uuid primary key default gen_random_uuid(),
  metric_name text not null,
  metric_value numeric not null,
  dimensions jsonb not null default '{}'::jsonb,
  recorded_at timestamptz not null default now()
);

alter table public.operational_metrics
  add column if not exists dimensions jsonb,
  add column if not exists recorded_at timestamptz;

update public.operational_metrics
set dimensions = '{}'::jsonb
where dimensions is null;

update public.operational_metrics
set recorded_at = now()
where recorded_at is null;

alter table public.operational_metrics
  alter column dimensions set default '{}'::jsonb,
  alter column dimensions set not null,
  alter column recorded_at set default now(),
  alter column recorded_at set not null;

create index if not exists idx_metrics_name_time
  on public.operational_metrics(metric_name, recorded_at desc);

alter table public.operational_metrics enable row level security;

drop policy if exists "operational_metrics_admin"
  on public.operational_metrics;

revoke all on table public.operational_metrics
  from public, anon, authenticated, service_role;

grant select, insert on table public.operational_metrics
  to service_role;

comment on table public.operational_metrics is
  'Aggregate-only operational time series. Direct browser roles have no access.';

comment on column public.operational_metrics.dimensions is
  'Fixed, non-identifying dimensions only. Never store patient, intake, email, review, or clinical data.';
