-- Bounded, PHI-free monitoring snapshots. No general UPDATE grant is added.
create unique index if not exists operational_metrics_monitor_version_unique
  on public.operational_metrics(metric_name, metric_value)
  where metric_name in ('browser_observer_state', 'business_incident_state');

-- Enablement grace belongs to the monitor, not a deployment. Preserve these
-- seed/current snapshots if time-series retention is introduced in future.
insert into public.operational_metrics(metric_name, metric_value, dimensions)
select key, 1, pg_catalog.jsonb_build_object(
  'enabledAt', floor(extract(epoch from statement_timestamp()) * 1000),
  'checkedAt', 0, 'incidents', '[]'::jsonb
) || case when key = 'browser_observer_state' then
  '{"cache":[],"observerOk":false,"coverageGap":false,"backoffUntil":0}'::jsonb
  else '{}'::jsonb end
from unnest(array['browser_observer_state', 'business_incident_state']) as keys(key)
where not exists (select 1 from public.operational_metrics m where m.metric_name = key)
on conflict do nothing;

create or replace function public.append_monitor_state(
  p_key text, p_expected_version bigint, p_state jsonb
) returns boolean
language plpgsql volatile security definer set search_path = ''
as $function$
declare
  old_state jsonb;
  old_version bigint;
  field text;
  prior jsonb;
  incoming jsonb;
  now_ms numeric := floor(extract(epoch from clock_timestamp()) * 1000);
begin
  if p_key is null or p_key not in ('browser_observer_state', 'business_incident_state')
    or p_expected_version is null or p_expected_version < 1
    or p_expected_version >= 9007199254740991
    or p_state is null or jsonb_typeof(p_state) <> 'object'
    or pg_catalog.octet_length(p_state::text) > 65536 then
    raise exception 'invalid monitor snapshot';
  end if;
  -- No string values (including prose, identifiers or URLs) are accepted.
  -- Object keys are fixed schema fields; incident categories use bounded IDs.
  if exists (
    with recursive nodes(value) as (
      select p_state
      union all
      select child.value from nodes
      cross join lateral (
        select value from pg_catalog.jsonb_each(case when jsonb_typeof(nodes.value) = 'object' then nodes.value else '{}'::jsonb end)
        union all
        select value from pg_catalog.jsonb_array_elements(case when jsonb_typeof(nodes.value) = 'array' then nodes.value else '[]'::jsonb end)
      ) child
    )
    select 1 from nodes where
      jsonb_typeof(value) in ('string', 'null')
      or (jsonb_typeof(value) = 'number' and (value::text !~ '^[0-9]+$' or (value::text)::numeric > 9007199254740991))
      or (jsonb_typeof(value) = 'array' and jsonb_array_length(value) > 100)
      or (jsonb_typeof(value) = 'object' and exists (
        select 1 from jsonb_object_keys(value) k where k not in (
          'enabledAt','checkedAt','incidents','cache','latest','success','failure','invocation','running',
          'observerOk','coverageGap','backoffUntil','completedAt','event','id','number','attempt','created','started','completed','outcome','status',
          'metric','severity','count','at','active'
        )
      ))
  ) then raise exception 'invalid monitor payload fields'; end if;
  if not p_state ?& array['enabledAt','checkedAt','incidents']
    or jsonb_typeof(p_state->'incidents') <> 'array'
    or jsonb_typeof(p_state->'enabledAt') <> 'number'
    or jsonb_typeof(p_state->'checkedAt') <> 'number'
    or (p_state->>'checkedAt')::numeric > now_ms
  then raise exception 'invalid monitor observation'; end if;
  if p_key = 'business_incident_state' and p_state - array['enabledAt','checkedAt','incidents'] <> '{}'::jsonb
    then raise exception 'invalid business snapshot fields'; end if;
  if p_key = 'browser_observer_state' then
    if not p_state ?& array['cache','observerOk','coverageGap','backoffUntil']
      or jsonb_typeof(p_state->'cache') <> 'array'
      or jsonb_array_length(p_state->'cache') > 10
      or jsonb_typeof(p_state->'observerOk') <> 'boolean'
      or jsonb_typeof(p_state->'coverageGap') <> 'boolean'
      or jsonb_typeof(p_state->'backoffUntil') <> 'number'
      or (p_state->>'backoffUntil')::numeric > now_ms + 3600000
      then raise exception 'invalid browser snapshot'; end if;
    for incoming in select value from jsonb_array_elements(p_state->'cache')
      union all select value from jsonb_each(p_state) where key in ('latest','success','failure','invocation','running')
    loop
      if jsonb_typeof(incoming) <> 'object' or not incoming ?& array['id','number','attempt','created','started','completed','outcome','status']
        or incoming - array['event','id','number','attempt','created','started','completed','outcome','status'] <> '{}'::jsonb
        or exists (select 1 from jsonb_each(incoming) where jsonb_typeof(value) <> 'number')
        or (incoming->>'completed')::numeric > now_ms
        or (incoming->>'started')::numeric > now_ms
        or (incoming->>'created')::numeric > now_ms
        or (incoming->>'outcome')::numeric > 2 or (incoming->>'status')::numeric > 2
        then raise exception 'invalid browser source evidence'; end if;
    end loop;
  end if;
  for incoming in select value from jsonb_array_elements(p_state->'incidents') loop
    if jsonb_typeof(incoming) <> 'object' or not incoming ?& array['metric','severity','count','at','active']
      or incoming - array['metric','severity','count','at','active'] <> '{}'::jsonb
      or jsonb_typeof(incoming->'active') <> 'boolean'
      or exists (select 1 from jsonb_each(incoming - 'active') where jsonb_typeof(value) <> 'number')
      or (incoming->>'metric')::numeric > 99 or (incoming->>'severity')::numeric > 2
      or (incoming->>'at')::numeric > now_ms
      then raise exception 'invalid incident observation'; end if;
  end loop;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_key, 6080601));
  select metric_value::bigint, dimensions into old_version, old_state
  from public.operational_metrics where metric_name = p_key order by metric_value desc limit 1;
  -- Missing state is unavailable, never a new enablement grace/all-clear.
  if old_version is null then raise exception 'monitor snapshot unavailable'; end if;
  if old_version <> p_expected_version then return false; end if;
  if p_state->'enabledAt' <> old_state->'enabledAt'
    or (p_state->>'checkedAt')::numeric <= (old_state->>'checkedAt')::numeric
    then raise exception 'monitor observation regressed'; end if;
  if p_key = 'browser_observer_state' then
    if p_state ? 'completedAt' and (
      jsonb_typeof(p_state->'completedAt') <> 'number'
      or (p_state->>'completedAt')::numeric > now_ms
      or (p_state->>'completedAt')::numeric < coalesce((old_state->>'completedAt')::numeric,0)
    ) then raise exception 'browser completion time regressed'; end if;
    foreach field in array array['latest','success','failure','invocation'] loop
      prior := old_state->field; incoming := p_state->field;
      if prior is not null and (incoming is null or
        row((incoming->>'number')::numeric,(incoming->>'attempt')::numeric) < row((prior->>'number')::numeric,(prior->>'attempt')::numeric))
        then raise exception 'browser source order regressed'; end if;
    end loop;
    if exists (select 1 from jsonb_array_elements(old_state->'cache') a, jsonb_array_elements(p_state->'cache') b
      where a->'id'=b->'id' and a->'attempt'=b->'attempt' and a <> b)
      then raise exception 'immutable browser evidence changed'; end if;
  end if;
  insert into public.operational_metrics(metric_name, metric_value, dimensions)
  values(p_key, old_version + 1, p_state);
  return true;
end;
$function$;
revoke all on function public.append_monitor_state(text,bigint,jsonb) from public, anon, authenticated, service_role;
grant execute on function public.append_monitor_state(text,bigint,jsonb) to service_role;
comment on function public.append_monitor_state(text,bigint,jsonb) is
  'Service-role-only expected-version append of two fixed PHI-free monitoring snapshots. No exactly-once notification guarantee.';
