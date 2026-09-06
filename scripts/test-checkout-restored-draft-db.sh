#!/usr/bin/env bash
set -euo pipefail
readonly REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
readonly FIXTURE_NAME="instantmed-checkout-fixture-$(date +%s)-$$"
cleanup() {
  docker rm -fv "${FIXTURE_NAME}-rest" "$FIXTURE_NAME" >/dev/null 2>&1 || true
}
trap cleanup EXIT
# No env loader, Supabase project, or existing container is used.
docker run -d --name "$FIXTURE_NAME" -e POSTGRES_PASSWORD=fixture-only -p 127.0.0.1::3000 postgres:15-alpine >/dev/null
# The initialization postmaster accepts sockets before restarting; wait for
# TCP, which is enabled only on the final server.
for attempt in {1..50}; do
  if docker exec "$FIXTURE_NAME" pg_isready -h 127.0.0.1 -U postgres >/dev/null 2>&1; then break; fi
  sleep 0.2
done
docker exec -i "$FIXTURE_NAME" psql -v ON_ERROR_STOP=1 -U postgres < "$REPO_ROOT/scripts/fixtures/checkout-restored-draft.sql" >/dev/null
sed -n '/^create unique index if not exists idx_intakes_flow_instance_id/,/where flow_instance_id is not null;/p' \
  "$REPO_ROOT/supabase/migrations/20260723063000_suppress_recovery_after_intake_creation.sql" \
  | docker exec -i "$FIXTURE_NAME" psql -v ON_ERROR_STOP=1 -U postgres >/dev/null
# Exercise the production bearer claim logic without copying/reimplementing it.
sed -n '/^create or replace function public.claim_partial_intake_draft_for_checkout(/,/^\$\$;/p' \
  "$REPO_ROOT/supabase/migrations/20260722231500_fence_discarded_partial_intake_drafts.sql" \
  | docker exec -i "$FIXTURE_NAME" psql -v ON_ERROR_STOP=1 -U postgres >/dev/null
docker run -d --name "${FIXTURE_NAME}-rest" --network "container:$FIXTURE_NAME" \
  -e PGRST_DB_URI=postgres://postgres:fixture-only@127.0.0.1:5432/postgres \
  -e PGRST_DB_ANON_ROLE=checkout_fixture -e PGRST_DB_SCHEMAS=public \
  public.ecr.aws/supabase/postgrest:v14.12 >/dev/null
readonly FIXTURE_PORT="$(docker port "$FIXTURE_NAME" 3000/tcp | cut -d: -f2)"
for attempt in {1..50}; do
  if curl --silent --fail "http://127.0.0.1:$FIXTURE_PORT/" >/dev/null; then break; fi
  sleep 0.2
done
cd "$REPO_ROOT"
CHECKOUT_FIXTURE_URL="http://127.0.0.1:$FIXTURE_PORT" corepack pnpm test run lib/__tests__/checkout-restored-draft-db.test.ts
