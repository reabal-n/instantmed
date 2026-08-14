-- Persist one atomic, outcome-aware heartbeat per cron invocation.
--
-- Latest invocation status is kept separately from an unresolved failure so a
-- planned no-op can prove scheduler liveness without accidentally healing work
-- that failed earlier. All fields are aggregate operational evidence only.

alter table public.cron_heartbeats
  add column if not exists last_failure_at timestamptz,
  add column if not exists last_failure_status text;

-- Install the outcome-aware trigger before the data backfill below. Metadata-
-- only updates preserve run_count; only a new invocation timestamp increments
-- it. This keeps migration replay from being counted as a cron execution.
create or replace function public.increment_cron_run_count()
returns trigger
language plpgsql
volatile
security invoker
set search_path = ''
as $function$
begin
  new.run_count := case
    when new.last_run_at is distinct from old.last_run_at
      and old.run_count < 9223372036854775807::bigint
      then old.run_count + 1
    else old.run_count
  end;
  return new;
end;
$function$;

update public.cron_heartbeats
set
  last_failure_at = last_run_at,
  last_failure_status = last_status
where last_status not in ('ok', 'skipped', 'disabled')
  and last_failure_at is null;

comment on column public.cron_heartbeats.last_success_at is
  'Latest outcome that durably rearmed cron monitoring. Planned skipped invocations do not rearm unless the caller has separate completion evidence.';

comment on column public.cron_heartbeats.last_failure_at is
  'Latest failed cron outcome. A failure is unresolved while it is later than last_success_at.';

comment on column public.cron_heartbeats.last_failure_status is
  'Aggregate status for the latest failed cron outcome; never contains patient or request data.';

create or replace function public.record_cron_heartbeat_outcome(
  p_job_name text,
  p_status text,
  p_duration_ms integer,
  p_items_processed integer,
  p_rearm_outage boolean
)
returns void
language plpgsql
volatile
security invoker
set search_path = ''
as $function$
declare
  recorded_at timestamptz := pg_catalog.clock_timestamp();
  failed_outcome boolean;
begin
  if p_job_name is null
    or p_job_name !~ '^[a-z0-9-]{1,100}$'
  then
    raise exception 'invalid cron heartbeat job name';
  end if;

  if p_status is null
    or p_status !~ '^[a-z0-9_]{1,100}$'
  then
    raise exception 'invalid cron heartbeat status';
  end if;

  if p_duration_ms is not null
    and (p_duration_ms < 0 or p_duration_ms > 86400000)
  then
    raise exception 'invalid cron heartbeat duration';
  end if;

  if p_items_processed is not null
    and (p_items_processed < 0 or p_items_processed > 1000000000)
  then
    raise exception 'invalid cron heartbeat item count';
  end if;

  if p_rearm_outage is null then
    raise exception 'cron heartbeat rearm decision is required';
  end if;

  if p_rearm_outage and p_status not in ('ok', 'disabled', 'skipped') then
    raise exception 'failed cron outcome cannot rearm monitoring';
  end if;

  if not p_rearm_outage and p_status in ('ok', 'disabled') then
    raise exception 'healthy cron outcome must rearm monitoring';
  end if;

  failed_outcome := not p_rearm_outage and p_status <> 'skipped';

  insert into public.cron_heartbeats as heartbeat (
    job_name,
    last_run_at,
    run_count,
    last_duration_ms,
    last_items_processed,
    last_status,
    last_success_at,
    last_failure_at,
    last_failure_status
  )
  values (
    p_job_name,
    recorded_at,
    1,
    p_duration_ms,
    p_items_processed,
    p_status,
    case when p_rearm_outage then recorded_at else null end,
    case when failed_outcome then recorded_at else null end,
    case when failed_outcome then p_status else null end
  )
  on conflict (job_name) do update
  set
    last_run_at = excluded.last_run_at,
    run_count = case
      when heartbeat.run_count < 9223372036854775807::bigint
        then heartbeat.run_count + 1
      else heartbeat.run_count
    end,
    last_duration_ms = excluded.last_duration_ms,
    last_items_processed = excluded.last_items_processed,
    last_status = excluded.last_status,
    last_success_at = case
      when p_rearm_outage then excluded.last_run_at
      else heartbeat.last_success_at
    end,
    last_failure_at = case
      when failed_outcome then excluded.last_run_at
      else heartbeat.last_failure_at
    end,
    last_failure_status = case
      when failed_outcome then p_status
      else heartbeat.last_failure_status
    end;
end;
$function$;

comment on function public.record_cron_heartbeat_outcome(text, text, integer, integer, boolean) is
  'Atomically records aggregate cron invocation, recovery, and failure boundaries without patient data.';

revoke all on function public.record_cron_heartbeat_outcome(text, text, integer, integer, boolean)
  from public, anon, authenticated, service_role;
grant execute on function public.record_cron_heartbeat_outcome(text, text, integer, integer, boolean)
  to service_role;
