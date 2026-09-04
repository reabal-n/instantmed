-- Recovery links for signed guest resume and authenticated patient retry live
-- on telemetry-excluded routes. Preserve a PHI-free server-side engagement
-- marker on the durable intake without overwriting acquisition attribution.
-- The application requires a domain-separated signed proof, and this trigger
-- independently prevents authenticated clients from forging the marker.

alter table public.intakes
  add column if not exists recovery_email_engaged_at timestamptz;

comment on column public.intakes.recovery_email_engaged_at is
  'First server-confirmed use of an allowlisted recovery-email path for an unpaid intake; contains no patient, clinical, capability, or acquisition-click data.';

create or replace function public.preserve_intake_recovery_email_engagement()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.recovery_email_engaged_at is not null
      and current_user not in ('postgres', 'service_role') then
      raise insufficient_privilege
        using message = 'recovery_email_engaged_at is server-managed';
    end if;
    return new;
  end if;

  if new.recovery_email_engaged_at is distinct from old.recovery_email_engaged_at
    and current_user not in ('postgres', 'service_role') then
    raise insufficient_privilege
      using message = 'recovery_email_engaged_at is server-managed';
  end if;

  -- First non-null wins so later retries cannot erase or rewrite the original
  -- engagement boundary used by aggregate recovery reporting.
  new.recovery_email_engaged_at := coalesce(
    old.recovery_email_engaged_at,
    new.recovery_email_engaged_at
  );
  return new;
end;
$$;

revoke all on function public.preserve_intake_recovery_email_engagement()
  from public, anon, authenticated;

drop trigger if exists trg_intakes_preserve_recovery_email_engagement
  on public.intakes;
create trigger trg_intakes_preserve_recovery_email_engagement
  before insert or update of recovery_email_engaged_at on public.intakes
  for each row execute function public.preserve_intake_recovery_email_engagement();
