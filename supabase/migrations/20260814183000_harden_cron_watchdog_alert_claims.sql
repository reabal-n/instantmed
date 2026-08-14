-- Make cron outcomes truthful and watchdog alerts race-safe.
--
-- `last_run_at` remains the latest attempt. `last_success_at` is the stable
-- recovery boundary used to identify one continuous failed-outcome outage.
-- Alert claims and deployment grace markers are aggregate-only operational
-- evidence; they contain no patient, intake, email, or clinical identifiers.

alter table public.cron_heartbeats
  add column if not exists last_success_at timestamptz;

update public.cron_heartbeats
set last_success_at = last_run_at
where last_status = 'ok'
  and last_success_at is null;

comment on column public.cron_heartbeats.last_success_at is
  'Latest successful cron outcome. Failed attempts preserve this recovery boundary for outage deduplication.';

create unique index if not exists operational_metrics_cron_watchdog_deployment_unique
  on public.operational_metrics ((dimensions ->> 'deployment_key'))
  where metric_name = 'cron_watchdog_deployment';

create unique index if not exists operational_metrics_cron_heartbeat_alert_unique
  on public.operational_metrics (
    (dimensions ->> 'job_name'),
    (dimensions ->> 'outage_key')
  )
  where metric_name = 'cron_heartbeat_alert';

create or replace function public.get_or_create_cron_watchdog_deployment(
  p_deployment_key text
)
returns timestamptz
language plpgsql
volatile
security invoker
set search_path = ''
as $function$
declare
  deployment_started_at timestamptz;
begin
  if p_deployment_key is null
    or pg_catalog.length(p_deployment_key) < 1
    or pg_catalog.length(p_deployment_key) > 200
    or p_deployment_key !~ '^[A-Za-z0-9._:-]+$'
  then
    raise exception 'invalid cron watchdog deployment key';
  end if;

  insert into public.operational_metrics (
    metric_name,
    metric_value,
    dimensions
  )
  values (
    'cron_watchdog_deployment',
    1,
    pg_catalog.jsonb_build_object('deployment_key', p_deployment_key)
  )
  on conflict ((dimensions ->> 'deployment_key'))
    where metric_name = 'cron_watchdog_deployment'
    do nothing;

  select metric.recorded_at
  into deployment_started_at
  from public.operational_metrics as metric
  where metric.metric_name = 'cron_watchdog_deployment'
    and metric.dimensions ->> 'deployment_key' = p_deployment_key
  limit 1;

  if deployment_started_at is null then
    raise exception 'cron watchdog deployment marker unavailable';
  end if;

  return deployment_started_at;
end;
$function$;

comment on function public.get_or_create_cron_watchdog_deployment(text) is
  'Returns the first watchdog observation for one deployment so never-run jobs receive one 30-minute startup grace.';

revoke all on function public.get_or_create_cron_watchdog_deployment(text)
  from public, anon, authenticated, service_role;
grant execute on function public.get_or_create_cron_watchdog_deployment(text)
  to service_role;

create or replace function public.claim_cron_heartbeat_alerts(
  p_outages jsonb
)
returns table (
  job_name text,
  outage_key text
)
language plpgsql
volatile
security invoker
set search_path = ''
as $function$
begin
  if p_outages is null or pg_catalog.jsonb_typeof(p_outages) <> 'array' then
    raise exception 'cron heartbeat outage claims must be a JSON array';
  end if;

  if pg_catalog.jsonb_array_length(p_outages) > 100 then
    raise exception 'cron heartbeat outage claim batch exceeds 100 rows';
  end if;

  return query
  with requested as (
    select
      outage.value ->> 'job_name' as requested_job_name,
      outage.value ->> 'outage_key' as requested_outage_key,
      case
        when outage.value ->> 'minutes_overdue' ~ '^[0-9]+$'
          then (outage.value ->> 'minutes_overdue')::numeric
        else 0::numeric
      end as requested_minutes_overdue
    from pg_catalog.jsonb_array_elements(p_outages) as outage(value)
  ),
  validated as (
    select distinct on (requested_job_name, requested_outage_key)
      requested_job_name,
      requested_outage_key,
      requested_minutes_overdue
    from requested
    where requested_job_name ~ '^[a-z0-9-]{1,100}$'
      and pg_catalog.length(requested_outage_key) between 1 and 300
      and requested_outage_key ~ '^[A-Za-z0-9._:+-]+$'
    order by requested_job_name, requested_outage_key
  ),
  claimed as (
    insert into public.operational_metrics as metric (
      metric_name,
      metric_value,
      dimensions
    )
    select
      'cron_heartbeat_alert',
      greatest(validated.requested_minutes_overdue, 0),
      pg_catalog.jsonb_build_object(
        'job_name', validated.requested_job_name,
        'outage_key', validated.requested_outage_key
      )
    from validated
    on conflict (
      (dimensions ->> 'job_name'),
      (dimensions ->> 'outage_key')
    ) where metric_name = 'cron_heartbeat_alert'
    do nothing
    returning
      metric.dimensions ->> 'job_name' as claimed_job_name,
      metric.dimensions ->> 'outage_key' as claimed_outage_key
  )
  select
    claimed.claimed_job_name,
    claimed.claimed_outage_key
  from claimed;
end;
$function$;

comment on function public.claim_cron_heartbeat_alerts(jsonb) is
  'Atomically claims aggregate cron outage generations. Concurrent watchdogs receive only rows they newly own.';

revoke all on function public.claim_cron_heartbeat_alerts(jsonb)
  from public, anon, authenticated, service_role;
grant execute on function public.claim_cron_heartbeat_alerts(jsonb)
  to service_role;
