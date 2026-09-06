#!/usr/bin/env bash
set -euo pipefail
readonly REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
readonly DB_CONTAINER="instantmed-monitor-${$}-${RANDOM}"
cleanup() {
  if [[ "$(docker inspect --format '{{ index .Config.Labels "instantmed.test" }}' "$DB_CONTAINER" 2>/dev/null || true)" == "monitor-state" ]]; then
    docker rm -f "$DB_CONTAINER" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT INT TERM
docker run --detach --rm --name "$DB_CONTAINER" --label instantmed.test=monitor-state --env POSTGRES_PASSWORD=fixture-only postgres:15-alpine >/dev/null
for _attempt in $(seq 1 80); do
  if docker exec "$DB_CONTAINER" pg_isready -h 127.0.0.1 -U postgres >/dev/null 2>&1; then break; fi
  sleep 0.25
done
run_psql() { docker exec -i "$DB_CONTAINER" psql -h 127.0.0.1 -U postgres -v ON_ERROR_STOP=1 "$@"; }
# Filter only the expected notices from these deliberately repeated migration
# statements. Unexpected notices and every error retain their original stderr.
run_migration() {
  run_psql < "$1" >/dev/null 2> >(sed -E '/^NOTICE:  (column "(dimensions|recorded_at)" of relation "operational_metrics" already exists, skipping|policy "operational_metrics_admin" for relation "public.operational_metrics" does not exist, skipping|relation "operational_metrics_monitor_version_unique" already exists, skipping)$/d' >&2)
}
run_psql <<'SQL' >/dev/null
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
SQL
run_migration "$REPO_ROOT/supabase/migrations/20260723170000_create_operational_metrics.sql"
if [[ "${1:-}" != "--baseline" ]]; then
  run_migration "$REPO_ROOT/supabase/migrations/20260906100000_monitor_observation_state.sql"
  run_migration "$REPO_ROOT/supabase/migrations/20260906100000_monitor_observation_state.sql"
fi
run_psql < "$REPO_ROOT/scripts/sql/monitor-observation-state-db.test.sql" >/dev/null
# A held transaction owns version 1. A competing identical CAS blocks and then
# returns false after the winner commits. Both connections use service_role.
run_psql <<'SQL' >/dev/null &
begin;
set local role service_role;
select public.append_monitor_state('business_incident_state',1,
 (select dimensions || '{"checkedAt":100,"incidents":[{"metric":0,"severity":1,"count":5,"at":100,"active":true}]}'::jsonb
 from public.operational_metrics where metric_name='business_incident_state' and metric_value=1));
select pg_sleep(1);
commit;
SQL
winner_pid=$!
sleep 0.2
run_psql <<'SQL' >/dev/null
set role service_role;
do $test$
declare claimed boolean;
begin
 select public.append_monitor_state('business_incident_state',1,
 (select dimensions || '{"checkedAt":100,"incidents":[]}'::jsonb
 from public.operational_metrics where metric_name='business_incident_state' and metric_value=1)) into claimed;
 if claimed then raise exception 'concurrent stale CAS unexpectedly claimed'; end if;
end;
$test$;
SQL
wait "$winner_pid"
run_psql <<'SQL' >/dev/null
do $test$
declare latest jsonb;
begin
 if (select count(*) from public.operational_metrics where metric_name='business_incident_state') <> 2 then
 raise exception 'concurrent claims duplicated snapshot'; end if;
 select dimensions into latest from public.operational_metrics where metric_name='business_incident_state' order by metric_value desc limit 1;
 if latest->'incidents'->0->>'count' <> '5' then raise exception 'loser overwrote winner'; end if;
 -- Retention may remove history, but current snapshot remains readable by
 -- metric_value even if recorded_at ties. Never delete all state rows.
 delete from public.operational_metrics where metric_name='business_incident_state' and metric_value=1;
 if not public.append_monitor_state('business_incident_state',2,latest || '{"checkedAt":101}'::jsonb) then raise exception 'retained current state unavailable'; end if;
 delete from public.operational_metrics where metric_name='business_incident_state';
 begin
 perform public.append_monitor_state('business_incident_state',3,latest || '{"checkedAt":102}'::jsonb);
 raise exception 'missing state created fresh grace';
 exception when others then if sqlerrm='missing state created fresh grace' then raise; end if; end;
end;
$test$;
SQL
printf 'Monitor database checks passed: ACL, validation, immutable source ordering, CAS winner/loser, retained-current and missing-state behavior.\n'
