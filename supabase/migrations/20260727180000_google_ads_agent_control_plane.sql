-- PHI-free persistence for the approval-gated Google Ads Agent.
-- Browser roles receive no grants or policies; trusted server code uses service_role.

create table public.google_ads_agent_runs (
  id uuid primary key default gen_random_uuid(),
  report_date date not null unique,
  status text not null
    check (status in ('running', 'delivered', 'failed', 'skipped')),
  tracking_state text
    check (tracking_state in ('GREEN', 'AMBER', 'RED')),
  snapshot jsonb,
  recommendation jsonb,
  telegram_message_id bigint,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  delivered_at timestamptz,
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.google_ads_change_proposals (
  id uuid primary key default gen_random_uuid(),
  proposal_key text not null unique,
  run_id uuid references public.google_ads_agent_runs(id) on delete set null,
  status text not null
    check (
      status in (
        'draft',
        'validated',
        'awaiting_approval',
        'approved',
        'rejected',
        'applying',
        'applied',
        'verified',
        'aborted',
        'failed',
        'rolled_back',
        'expired'
      )
    ),
  mutation_family text not null,
  operations jsonb not null,
  rationale jsonb not null,
  baseline_hash text not null,
  rollback_plan jsonb not null,
  expires_at timestamptz not null,
  approval_reference text,
  approval_channel text
    check (approval_channel in ('telegram', 'codex')),
  approval_actor_hash text,
  approved_at timestamptz,
  rejected_at timestamptz,
  telegram_message_id bigint,
  telegram_update_id bigint unique,
  telegram_callback_query_hash text unique,
  validation_receipt jsonb,
  apply_receipt jsonb,
  verification_receipt jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.google_ads_experiments (
  id uuid primary key default gen_random_uuid(),
  experiment_key text not null unique,
  service text not null,
  hypothesis text not null,
  variable text not null,
  control jsonb not null,
  challenger jsonb not null,
  primary_metric text not null,
  max_loss_cents integer not null
    check (max_loss_cents > 0),
  minimum_orders_per_arm integer not null
    check (minimum_orders_per_arm > 0),
  starts_at timestamptz,
  ends_at timestamptz,
  status text not null
    check (
      status in (
        'draft',
        'approved',
        'running',
        'stopped',
        'won',
        'lost',
        'inconclusive'
      )
    ),
  result jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index google_ads_change_proposals_status_expiry_idx
  on public.google_ads_change_proposals (status, expires_at);

create index google_ads_experiments_status_idx
  on public.google_ads_experiments (status);

alter table public.google_ads_agent_runs enable row level security;
alter table public.google_ads_change_proposals enable row level security;
alter table public.google_ads_experiments enable row level security;

revoke all on table public.google_ads_agent_runs
  from public, anon, authenticated, service_role;
revoke all on table public.google_ads_change_proposals
  from public, anon, authenticated, service_role;
revoke all on table public.google_ads_experiments
  from public, anon, authenticated, service_role;

grant select, insert, update on table public.google_ads_agent_runs
  to service_role;
grant select, insert, update on table public.google_ads_change_proposals
  to service_role;
grant select, insert, update on table public.google_ads_experiments
  to service_role;

alter table public.payments
  add column if not exists stripe_balance_transaction_id text,
  add column if not exists stripe_fee_cents integer
    check (stripe_fee_cents >= 0),
  add column if not exists stripe_fee_synced_at timestamptz;

comment on table public.google_ads_agent_runs is
  'Aggregate, PHI-free daily Google Ads Agent snapshots and delivery receipts.';
comment on table public.google_ads_change_proposals is
  'Immutable Google Ads proposals, decisions, and mutation receipts.';
comment on table public.google_ads_experiments is
  'Governed one-variable Google Ads experiment registry.';
