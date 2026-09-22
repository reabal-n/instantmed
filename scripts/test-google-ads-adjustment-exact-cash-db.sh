#!/usr/bin/env bash
set -euo pipefail

readonly REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
readonly DB_CONTAINER="instantmed-ads-exact-cash-${$}-${RANDOM}"
DB_CONTAINER_STARTED=false
cleanup() {
  if [[ "$DB_CONTAINER_STARTED" == true ]] &&
    [[ "$(docker inspect --format '{{ index .Config.Labels "instantmed.test" }}' "$DB_CONTAINER" 2>/dev/null || true)" == google-ads-exact-cash ]]; then
    docker rm -f "$DB_CONTAINER" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT INT TERM
docker run --detach --rm --name "$DB_CONTAINER" \
  --label instantmed.test=google-ads-exact-cash \
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
  intake_id integer, id integer, generation integer, adjustment_type text,
  target_net_value_cents integer, adjustment_at timestamptz, state text
);
CREATE TABLE public.stripe_payment_adjustment_targets (
  intake_id integer PRIMARY KEY, amount_cents integer, refund_amount_cents integer,
  payment_status text, paid_at timestamptz, adjustment_at timestamptz,
  target_net_value_cents integer, exact_target_net_value_cents integer
);
CREATE TABLE public.audit_logs (intake_id integer, action text, metadata jsonb);
GRANT SELECT ON ALL TABLES IN SCHEMA public TO service_role;
SQL
# First install the deployed view to verify an additive, compatible replacement.
sed -n '/^CREATE VIEW public.google_ads_conversion_adjustment_due$/,/^CREATE VIEW public.google_ads_conversion_adjustment_claim_health$/p' \
  "$REPO_ROOT/supabase/migrations/20260814186000_correct_stripe_dispute_aggregation.sql" | sed '$d' | run_psql -q
run_psql -q < "$REPO_ROOT/supabase/migrations/20260922081547_google_ads_adjustment_exact_cash.sql"
run_psql -q <<'SQL'
INSERT INTO public.stripe_payment_adjustment_targets VALUES
  (1,2995,2995,'refunded',now()-interval '1 day',now()-interval '1 hour',1,0),
  (2,2995,1995,'partially_refunded',now()-interval '1 day',now()-interval '1 hour',1000,1000),
  (3,2995,2995,'refunded',now()-interval '1 day',now()-interval '1 hour',1,0),
  (4,2995,2495,'partially_refunded',now()-interval '1 day',now()-interval '1 hour',500,500);
INSERT INTO public.google_ads_conversion_adjustment_claims VALUES
  (1,1,1,'RESTATEMENT',1,now()-interval '1 hour','retryable_failed'),
  (2,2,1,'RESTATEMENT',1000,now()-interval '1 hour','retryable_failed'),
  (4,4,1,'RESTATEMENT',0,now()-interval '1 hour','succeeded');
INSERT INTO public.audit_logs VALUES
  (1,'google_ads_conversion_upload','{"status":"success"}'),
  (2,'google_ads_conversion_upload','{"status":"success"}'),
  (3,'google_ads_conversion_upload','{"status":"success"}'),
  (4,'google_ads_conversion_upload','{"status":"success"}');
SET ROLE service_role;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.google_ads_conversion_adjustment_due
      WHERE intake_id=1 AND exact_target_net_value_cents=0 AND target_net_value_cents=1)
    OR NOT EXISTS (SELECT 1 FROM public.google_ads_conversion_adjustment_due
      WHERE intake_id=2 AND exact_target_net_value_cents=1000 AND target_net_value_cents=1000)
    OR NOT EXISTS (SELECT 1 FROM public.google_ads_conversion_adjustment_due WHERE intake_id=3) THEN
    RAISE EXCEPTION 'Exact cash and Ads floor must remain distinct';
  END IF;
END $$;
RESET ROLE;
UPDATE public.google_ads_conversion_adjustment_claims SET state='succeeded' WHERE intake_id=1;
UPDATE public.google_ads_conversion_adjustment_claims SET state='unknown_outcome' WHERE intake_id=2;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.google_ads_conversion_adjustment_due WHERE intake_id IN (1,2,4)) THEN
    RAISE EXCEPTION 'Resolved and uncertain outcomes must not retry';
  END IF;
  IF has_table_privilege('anon','public.google_ads_conversion_adjustment_due','SELECT')
    OR has_table_privilege('authenticated','public.google_ads_conversion_adjustment_due','SELECT') THEN
    RAISE EXCEPTION 'Adjustment data must remain private';
  END IF;
END $$;
SQL
echo "Google Ads exact-cash database checks passed."
