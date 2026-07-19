-- Select unowned partial-recovery candidates inside Postgres. Client-side
-- owner lists are unsafe here: PostgREST caps result sets and large `not.in`
-- filters eventually exceed practical URL limits.

create index if not exists idx_email_outbox_partial_recovery_owner
  on public.email_outbox ((metadata ->> 'recovery_tracking_id'))
  where email_type = 'partial_intake_recovery'
    and nullif(metadata ->> 'recovery_tracking_id', '') is not null;

create or replace function public.get_partial_intake_recovery_candidates(
  p_eligible_after timestamptz,
  p_eligible_before timestamptz,
  p_limit integer default 50
)
returns table (
  recovery_tracking_id uuid,
  email text,
  updated_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    partial.recovery_tracking_id,
    partial.email,
    partial.updated_at
  from public.partial_intakes as partial
  where partial.email is not null
    and partial.converted_to_intake_id is null
    and partial.recovery_email_sent_at is null
    and partial.recovery_email_suppressed_at is null
    and partial.updated_at >= p_eligible_after
    and partial.updated_at <= p_eligible_before
    and not exists (
      select 1
      from public.email_outbox as outbox
      where outbox.email_type = 'partial_intake_recovery'
        and outbox.metadata ->> 'recovery_tracking_id' =
          partial.recovery_tracking_id::text
    )
  order by partial.updated_at asc, partial.recovery_tracking_id asc
  limit greatest(0, least(coalesce(p_limit, 50), 50));
$$;

comment on function public.get_partial_intake_recovery_candidates(
  timestamptz,
  timestamptz,
  integer
) is
  'Returns oldest eligible partial drafts that have no durable recovery outbox owner.';

revoke execute on function public.get_partial_intake_recovery_candidates(
  timestamptz,
  timestamptz,
  integer
) from public, anon, authenticated;

grant execute on function public.get_partial_intake_recovery_candidates(
  timestamptz,
  timestamptz,
  integer
) to service_role;
