-- A partial-draft conversion marker is a best-effort follow-up to creating the
-- real intake. If that update transiently fails, flow_instance_id is the
-- privacy-safe authoritative link that must still suppress recovery outreach.

create unique index if not exists idx_intakes_flow_instance_id
  on public.intakes (flow_instance_id)
  where flow_instance_id is not null;

comment on index public.idx_intakes_flow_instance_id is
  'One privacy-safe browser attempt may materialise at most one real intake.';

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
    and (
      partial.flow_instance_id is null
      or not exists (
        select 1
        from public.intakes as realized
        where realized.flow_instance_id = partial.flow_instance_id
      )
    )
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
  'Returns oldest eligible partial drafts with no real intake and no durable recovery outbox owner.';

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
