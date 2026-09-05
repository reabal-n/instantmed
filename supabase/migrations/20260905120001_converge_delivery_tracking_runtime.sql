-- Converge the older deployed tracking table with the existing runtime contract.
-- Keep legacy rows/columns and identifiers untouched; no historical backfill.
alter table public.delivery_tracking
  add column if not exists message_id text,
  add column if not exists patient_id uuid,
  add column if not exists template_type text,
  add column if not exists provider_id text,
  add column if not exists recipient text,
  add column if not exists bounced_at timestamptz,
  add column if not exists opened_at timestamptz,
  add column if not exists bounce_type text,
  add column if not exists bounce_reason text,
  add column if not exists error_code text,
  add column if not exists error_message text,
  add column if not exists attempt_number integer,
  add column if not exists message_type text;

-- Current writers use template_type; the baseline already permits a NULL legacy
-- message_type. Old writers can continue supplying it. Existing values are kept.
alter table public.delivery_tracking alter column message_type drop not null;

-- NULL legacy message IDs remain NULL. New provider-attempt rows have one key,
-- enabling the shared receipt function's ON CONFLICT (message_id) upsert.
create unique index if not exists delivery_tracking_message_id_key
  on public.delivery_tracking (message_id);

-- Retain the legacy pending state and accept the runtime's opened state.
alter table public.delivery_tracking drop constraint if exists delivery_tracking_status_check;
alter table public.delivery_tracking add constraint delivery_tracking_status_check
  check (status in ('pending', 'sent', 'delivered', 'failed', 'bounced', 'opened'));

comment on column public.delivery_tracking.message_id is
  'Current runtime/provider-attempt key. Nullable for untouched legacy rows; no identity or delivery evidence is inferred from legacy fields.';
