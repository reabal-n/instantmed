#!/usr/bin/env bash
set -euo pipefail
readonly REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
readonly DB_CONTAINER="instantmed-consent-${$}-${RANDOM}"
cleanup() {
  if [[ "$(docker inspect --format '{{ index .Config.Labels "instantmed.test" }}' "$DB_CONTAINER" 2>/dev/null || true)" == "checkout-consent" ]]; then
    docker rm -f "$DB_CONTAINER" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT INT TERM
docker run --detach --rm --name "$DB_CONTAINER" --label instantmed.test=checkout-consent --env POSTGRES_PASSWORD=fixture-only postgres:15-alpine >/dev/null
for _attempt in $(seq 1 80); do
  if docker exec "$DB_CONTAINER" pg_isready -h 127.0.0.1 -U postgres >/dev/null 2>&1; then break; fi
  sleep 0.25
done
run_psql() { docker exec -i "$DB_CONTAINER" psql -h 127.0.0.1 -U postgres -v ON_ERROR_STOP=1 "$@"; }
run_psql <<'SQL' >/dev/null
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE TYPE public.compliance_event_type AS ENUM ('terms_consent_given','telehealth_consent_given','accuracy_attestation_given');
CREATE TABLE public.profiles(id uuid PRIMARY KEY,full_name text, date_of_birth date,phone text,email text,address_line1 text, stripe_customer_id text);
CREATE TABLE public.intakes(id uuid PRIMARY KEY,patient_id uuid REFERENCES public.profiles(id),category text,subtype text,service_id uuid,status text,payment_status text,payment_id text);
CREATE TABLE public.intake_answers(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),intake_id uuid REFERENCES public.intakes(id) ON DELETE CASCADE,answers jsonb,updated_at timestamptz);
CREATE TABLE public.compliance_audit_log(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),event_type public.compliance_event_type,intake_id uuid,request_type text,actor_id uuid,actor_role text,is_human_action boolean,event_data jsonb);
INSERT INTO public.profiles VALUES('00000000-0000-0000-0000-000000000001','Synthetic', '1990-01-01',NULL,'fixture@example.test',NULL,NULL);
INSERT INTO public.intakes VALUES('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','medical_certificate','work',NULL,'pending_payment','unpaid',NULL);
INSERT INTO public.intake_answers(intake_id,answers) VALUES('00000000-0000-0000-0000-000000000002','{"synthetic":true}');
SQL
run_psql < "$REPO_ROOT/supabase/migrations/20260915131638_checkout_consent_receipts.sql" >/dev/null
run_psql < "$REPO_ROOT/supabase/migrations/20260915131638_checkout_consent_receipts.sql" >/dev/null
run_psql < "$REPO_ROOT/scripts/sql/checkout-consent-db.test.sql" >/dev/null
# A competing answer change holds the row; a writer using the old revision must
# wait, then fail instead of recording stale consent after the winner commits.
revision="$(run_psql -Atc "SELECT consent_revision FROM public.intakes WHERE id='00000000-0000-0000-0000-000000000002'")"
run_psql <<'SQL' >/dev/null &
BEGIN;
UPDATE public.intake_answers SET answers='{"synthetic":"concurrent"}' WHERE intake_id='00000000-0000-0000-0000-000000000002';
SELECT pg_sleep(1);
COMMIT;
SQL
winner_pid=$!
sleep 0.2
result="$(run_psql -Atc "SELECT public.record_checkout_consent('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','$revision','2026-09-15') IS NULL")"
wait "$winner_pid"
[[ "$result" == "t" ]]
echo "Checkout consent SQL replay, ACL, atomicity, revision and concurrency checks passed."
