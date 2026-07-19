-- Keep confirmed provider acceptance distinct from terminal policy suppression.
-- Existing sent markers are deliberately not reclassified or backfilled into
-- the new suppression columns.

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
  'Random non-bearer correlation ID for recovery delivery records. session_id remains a secret bearer token and must not be logged or queued.';

-- Bridge durable recovery rows created before recovery_tracking_id existed.
-- The legacy hash is SHA-256(session_id) and is not a bearer secret, but it is
-- intentionally retained for one release so application code can move to the
-- new random correlation ID without orphaning frozen or retryable rows.
update public.email_outbox as outbox
set metadata = coalesce(outbox.metadata, '{}'::jsonb)
  || jsonb_build_object(
    'recovery_tracking_id',
    partial.recovery_tracking_id::text
  )
from public.partial_intakes as partial
where outbox.email_type = 'partial_intake_recovery'
  and nullif(outbox.metadata ->> 'recovery_tracking_id', '') is null
  and outbox.metadata ->> 'draft_idempotency_hash' =
    encode(
      extensions.digest(partial.session_id::text, 'sha256'),
      'hex'
    );

-- Do not silently strand a live delivery if legacy data cannot be correlated.
-- Inactive historical rows may legitimately outlive an expired partial draft;
-- they are retained for audit and handled by the later cleanup migration.
do $$
begin
  if exists (
    select 1
    from public.email_outbox as outbox
    where outbox.email_type = 'partial_intake_recovery'
      and nullif(outbox.metadata ->> 'recovery_tracking_id', '') is null
      and (
        outbox.status in ('pending', 'sending')
        or (
          outbox.status = 'failed'
          and coalesce(outbox.retry_count, 0) < 10
        )
      )
  ) then
    raise exception
      'Active partial-intake recovery outbox rows could not be mapped to recovery_tracking_id';
  end if;
end
$$;

-- Legacy metadata is deliberately not deleted here. Cleanup follows only
-- after the application tranche is live and reconciliation proves there are
-- no active rows depending on the compatibility keys.

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
