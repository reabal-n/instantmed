#!/usr/bin/env bash
set -euo pipefail

readonly REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
readonly DB_CONTAINER="instantmed-ads-health-${$}-${RANDOM}"
DB_CONTAINER_STARTED=false
cleanup() {
  if [[ "$DB_CONTAINER_STARTED" == true ]] &&
    [[ "$(docker inspect --format '{{ index .Config.Labels "instantmed.test" }}' "$DB_CONTAINER" 2>/dev/null || true)" == google-ads-health ]]; then
    docker rm -f "$DB_CONTAINER" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT INT TERM
docker run --detach --rm --name "$DB_CONTAINER" \
  --label instantmed.test=google-ads-health \
  --env POSTGRES_PASSWORD=instantmed-test postgres:15-alpine >/dev/null
DB_CONTAINER_STARTED=true
for _attempt in $(seq 1 80); do
  if docker exec "$DB_CONTAINER" pg_isready -h 127.0.0.1 -U postgres >/dev/null 2>&1; then
    break
  fi
  sleep 0.25
done
run_psql() {
  docker exec -i "$DB_CONTAINER" psql -h 127.0.0.1 -v ON_ERROR_STOP=1 -U postgres "$@"
}
run_psql -q <<'SQL'
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN;
CREATE TABLE public.google_ads_conversion_adjustment_claims (
  intake_id integer, generation integer, state text, target_net_value_cents integer,
  updated_at timestamptz DEFAULT now(), lease_expires_at timestamptz,
  completed_at timestamptz DEFAULT now()
);
-- The upstream cash aggregation has its own contracts. These fixtures exercise
-- the real health SQL against its exact cash and Ads-floor output separately.
CREATE TABLE public.stripe_payment_adjustment_targets (
  intake_id integer PRIMARY KEY, amount_cents integer, paid_at timestamptz,
  exact_target_net_value_cents integer, target_net_value_cents integer
);
CREATE TABLE public.audit_logs (
  id bigint GENERATED ALWAYS AS IDENTITY, intake_id integer, action text,
  metadata jsonb, created_at timestamptz
);
GRANT SELECT ON ALL TABLES IN SCHEMA public TO service_role;
-- Preserve the deployed column order/types so CREATE OR REPLACE is tested.
CREATE VIEW public.google_ads_conversion_adjustment_claim_health AS SELECT
  0::bigint AS unknown_outcome_count, 0::bigint AS irreversible_zero_count,
  0::bigint AS stale_pending_count, 0::bigint AS expired_reservation_count,
  0::bigint AS expired_conversion_target_count, NULL::timestamptz AS oldest_uncertain_at;
SQL
run_psql -q < "$REPO_ROOT/supabase/migrations/20260905130000_google_ads_adjustment_health_reconciliation.sql"
run_psql -q < "$REPO_ROOT/scripts/sql/google-ads-adjustment-health-db.test.sql" >/dev/null
echo "Google Ads adjustment health database checks passed."
