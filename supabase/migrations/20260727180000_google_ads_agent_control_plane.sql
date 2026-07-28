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

create or replace function public.enforce_google_ads_proposal_immutability()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is distinct from old.status and not (
    (old.status = 'draft' and new.status in ('validated', 'failed', 'expired'))
    or (
      old.status = 'validated'
      and new.status in ('awaiting_approval', 'failed', 'expired')
    )
    or (
      old.status = 'awaiting_approval'
      and new.status in ('approved', 'rejected', 'expired')
    )
    or (old.status = 'approved' and new.status in ('applying', 'aborted', 'expired'))
    or (
      old.status = 'applying'
      and new.status in ('applied', 'aborted', 'failed')
    )
    or (
      old.status = 'applied'
      and new.status in ('verified', 'failed', 'rolled_back')
    )
    or (old.status = 'verified' and new.status = 'rolled_back')
  ) then
    raise exception 'invalid Google Ads proposal status transition';
  end if;

  if (old.status <> 'draft' or new.status <> 'draft') and (
    new.proposal_key is distinct from old.proposal_key
    or new.run_id is distinct from old.run_id
    or new.mutation_family is distinct from old.mutation_family
    or new.operations is distinct from old.operations
    or new.rationale is distinct from old.rationale
    or new.baseline_hash is distinct from old.baseline_hash
    or new.rollback_plan is distinct from old.rollback_plan
    or new.expires_at is distinct from old.expires_at
  ) then
    raise exception 'validated Google Ads proposal payload is immutable';
  end if;

  if old.validation_receipt is not null
    and new.validation_receipt is distinct from old.validation_receipt then
    raise exception 'Google Ads proposal validation receipt is immutable';
  end if;

  if old.telegram_message_id is not null
    and new.telegram_message_id is distinct from old.telegram_message_id then
    raise exception 'Google Ads proposal Telegram message is immutable';
  end if;

  if old.approval_channel is not null and (
    new.approval_channel is distinct from old.approval_channel
    or new.approval_reference is distinct from old.approval_reference
    or new.approval_actor_hash is distinct from old.approval_actor_hash
    or new.approved_at is distinct from old.approved_at
    or new.rejected_at is distinct from old.rejected_at
    or new.telegram_update_id is distinct from old.telegram_update_id
    or new.telegram_callback_query_hash
      is distinct from old.telegram_callback_query_hash
  ) then
    raise exception 'Google Ads proposal decision receipt is immutable';
  end if;

  if old.apply_receipt is not null
    and new.apply_receipt is distinct from old.apply_receipt then
    raise exception 'Google Ads proposal apply receipt is immutable';
  end if;

  if old.verification_receipt is not null
    and new.verification_receipt is distinct from old.verification_receipt then
    raise exception 'Google Ads proposal verification receipt is immutable';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_google_ads_proposal_immutability()
  from public, anon, authenticated;

create trigger google_ads_change_proposals_immutable
before update on public.google_ads_change_proposals
for each row execute function public.enforce_google_ads_proposal_immutability();

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
