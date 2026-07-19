-- Separate confirmed delivery from terminal policy suppression. Existing sent
-- markers are intentionally not backfilled into the new suppression columns.

alter table public.intakes
  add column if not exists review_email_suppressed_at timestamptz;

alter table public.partial_intakes
  add column if not exists recovery_email_suppressed_at timestamptz;

alter table public.partial_intakes
  add column if not exists recovery_tracking_id uuid;

update public.partial_intakes
set recovery_tracking_id = gen_random_uuid()
where recovery_tracking_id is null;

alter table public.partial_intakes
  alter column recovery_tracking_id set default gen_random_uuid();

alter table public.partial_intakes
  alter column recovery_tracking_id set not null;

create unique index if not exists idx_partial_intakes_recovery_tracking_id
  on public.partial_intakes (recovery_tracking_id);

comment on column public.intakes.review_email_suppressed_at is
  'Terminal policy-suppression marker for review requests. Never inferred from review_email_sent_at.';

comment on column public.partial_intakes.recovery_email_suppressed_at is
  'Terminal policy-suppression marker for draft recovery. Never inferred from recovery_email_sent_at.';

comment on column public.partial_intakes.recovery_tracking_id is
  'Non-bearer correlation ID for recovery delivery records. session_id remains a secret bearer token and must not be logged or queued.';

update public.email_outbox
set metadata = coalesce(metadata, '{}'::jsonb)
  - 'draft_idempotency_hash'
  - 'service_type'
  - 'draft_session_id'
  - 'session_id'
  - 'resume_url'
where email_type = 'partial_intake_recovery'
  and coalesce(metadata, '{}'::jsonb) ?| array[
    'draft_idempotency_hash',
    'service_type',
    'draft_session_id',
    'session_id',
    'resume_url'
  ];

drop index if exists public.idx_partial_intakes_recovery;

create index idx_partial_intakes_recovery
  on public.partial_intakes (updated_at)
  where email is not null
    and converted_to_intake_id is null
    and recovery_email_sent_at is null
    and recovery_email_suppressed_at is null;

comment on index public.idx_partial_intakes_recovery is
  'Eligible partial-intake recovery queue only: unconverted, unsent, and not policy-suppressed drafts ordered by age.';

create index if not exists idx_email_outbox_partial_recovery_tracking
  on public.email_outbox ((metadata ->> 'recovery_tracking_id'))
  where email_type = 'partial_intake_recovery'
    and status = 'sent';

create or replace function public.get_unmarked_sent_partial_recoveries(
  p_limit integer default 50
)
returns table (recovery_tracking_id uuid)
language sql
stable
security invoker
set search_path = ''
as $$
  select partial.recovery_tracking_id
  from public.partial_intakes as partial
  where partial.recovery_email_sent_at is null
    and partial.recovery_email_suppressed_at is null
    and exists (
      select 1
      from public.email_outbox as outbox
      where outbox.email_type = 'partial_intake_recovery'
        and outbox.status = 'sent'
        and outbox.metadata ->> 'recovery_tracking_id' =
          partial.recovery_tracking_id::text
    )
  order by partial.recovery_tracking_id
  limit greatest(1, least(coalesce(p_limit, 50), 50));
$$;

comment on function public.get_unmarked_sent_partial_recoveries(integer) is
  'Returns only partial drafts with confirmed sent outbox proof and no terminal recovery marker.';

revoke execute on function public.get_unmarked_sent_partial_recoveries(integer)
  from public, anon, authenticated;
grant execute on function public.get_unmarked_sent_partial_recoveries(integer)
  to service_role;
