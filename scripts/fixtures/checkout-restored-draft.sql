-- Disposable fixture schema: actual PostgreSQL uniqueness + CAS semantics.
-- It intentionally contains no patient answers, provider secrets, or production data.
create role checkout_fixture nologin;
create table public.intakes (
 id uuid primary key default gen_random_uuid(), patient_id text, service_id text,
 status text, payment_status text, payment_id text, checkout_error text, guest_email text,
 amount_cents integer, category text, subtype text, is_priority boolean,
 idempotency_key text unique, flow_instance_id uuid,
 growth_experience_version text, stripe_price_id text, updated_at timestamptz,
 utm_source text, utm_medium text, utm_id text, utm_campaign text, utm_content text,
 utm_term text, referrer text, landing_page text, attribution_captured_at text,
 gclid text, gbraid text, wbraid text, campaignid text, adgroupid text, keyword text,
 creative text, matchtype text, device text, network text
);
-- The index below is appended directly from the canonical migration by the harness.
create table public.intake_answers (intake_id uuid primary key, answers jsonb);
grant usage on schema public to checkout_fixture;
grant all on public.intakes, public.intake_answers to checkout_fixture;

-- Minimal columns required by the exact canonical draft-claim function.
create table public.partial_intakes (
 session_id uuid primary key, flow_instance_id uuid, service_type text,
 email text, converted_to_intake_id uuid, expires_at timestamptz,
 growth_experience_version text
);
create table public.partial_intake_discard_tombstones (session_id uuid primary key, expires_at timestamptz);
grant all on public.partial_intakes, public.partial_intake_discard_tombstones to checkout_fixture;
