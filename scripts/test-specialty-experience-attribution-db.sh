#!/usr/bin/env bash
set -euo pipefail

readonly DB_CONTAINER="supabase_db_witzcrovsoumktyndqgz"
readonly REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
readonly SQL_TEST="$REPO_ROOT/scripts/sql/specialty-experience-attribution-db.test.sql"
readonly CONCURRENT_SESSION="41000000-0000-4000-8000-000000000003"

if ! docker inspect "$DB_CONTAINER" >/dev/null 2>&1; then
  echo "Local Supabase DB container $DB_CONTAINER is unavailable." >&2
  echo "Start local Supabase and apply local migrations before rerunning this test." >&2
  exit 1
fi

run_psql() {
  docker exec -i "$DB_CONTAINER" psql -v ON_ERROR_STOP=1 -U postgres -d postgres "$@"
}

cleanup() {
  run_psql <<SQL >/dev/null 2>&1 || true
begin;
delete from public.partial_intakes where session_id = '$CONCURRENT_SESSION';
delete from public.partial_intake_discard_tombstones where session_id = '$CONCURRENT_SESSION';
commit;
SQL
}
trap cleanup EXIT

run_psql < "$SQL_TEST"

cleanup
run_psql -c "insert into public.partial_intakes (session_id, service_type, growth_experience_version) values ('$CONCURRENT_SESSION', 'consult', null);" >/dev/null

run_psql <<SQL >/dev/null &
begin;
update public.partial_intakes
set growth_experience_version = 'spx_h1_20260828'
where session_id = '$CONCURRENT_SESSION';
select pg_sleep(1.5);
commit;
SQL
first_writer_pid=$!

sleep 0.25
run_psql -c "update public.partial_intakes set growth_experience_version = 'spx_h3_20260828' where session_id = '$CONCURRENT_SESSION';" >/dev/null
wait "$first_writer_pid"

actual_value="$(run_psql -Atc "select growth_experience_version from public.partial_intakes where session_id = '$CONCURRENT_SESSION';")"
if [[ "$actual_value" != "spx_h1_20260828" ]]; then
  echo "Concurrent first-non-null invariant failed: got '$actual_value'." >&2
  exit 1
fi

echo "Specialty experience attribution database invariants passed."
