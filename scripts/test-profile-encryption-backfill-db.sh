#!/usr/bin/env bash
set -euo pipefail
readonly REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
readonly FIXTURE_NAME="instantmed-profile-backfill-$(date +%s)-$$"
cleanup() {
  docker rm -fv "${FIXTURE_NAME}-rest" "$FIXTURE_NAME" >/dev/null 2>&1 || true
}
trap cleanup EXIT
# Follow the restored-checkout fixture: new disposable containers only, no env loader.
docker run -d --name "$FIXTURE_NAME" -e POSTGRES_PASSWORD=fixture-only -p 127.0.0.1::3000 postgres:15-alpine >/dev/null
for attempt in {1..50}; do
  if docker exec "$FIXTURE_NAME" pg_isready -h 127.0.0.1 -U postgres >/dev/null 2>&1; then break; fi
  sleep 0.2
done
docker exec -i "$FIXTURE_NAME" psql -v ON_ERROR_STOP=1 -U postgres < "$REPO_ROOT/scripts/fixtures/profile-encryption-backfill.sql" >/dev/null
docker run -d --name "${FIXTURE_NAME}-rest" --network "container:$FIXTURE_NAME" \
  -e PGRST_DB_URI=postgres://postgres:fixture-only@127.0.0.1:5432/postgres \
  -e PGRST_DB_ANON_ROLE=profile_backfill_fixture -e PGRST_DB_SCHEMAS=public \
  public.ecr.aws/supabase/postgrest:v14.12 >/dev/null
readonly FIXTURE_PORT="$(docker port "$FIXTURE_NAME" 3000/tcp | cut -d: -f2)"
for attempt in {1..50}; do
  if curl --silent --fail "http://127.0.0.1:$FIXTURE_PORT/" >/dev/null; then break; fi
  sleep 0.2
done
cd "$REPO_ROOT"
PROFILE_BACKFILL_FIXTURE_URL="http://127.0.0.1:$FIXTURE_PORT" corepack pnpm test run lib/__tests__/profile-encryption-backfill.test.ts
