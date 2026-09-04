#!/usr/bin/env bash
set -euo pipefail

readonly REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
readonly MIGRATION="$REPO_ROOT/supabase/migrations/20260905120000_refill_reminder_funnel.sql"
readonly PREFERENCE_MIGRATION="$REPO_ROOT/supabase/migrations/20260905110000_email_preference_ordering.sql"
readonly PREFERENCE_SQL_TEST="$REPO_ROOT/scripts/sql/email-preference-ordering-db.test.sql"
readonly SQL_TEST="$REPO_ROOT/scripts/sql/resend-webhook-mirrors-db.test.sql"
readonly RUN_TOKEN="${$}-${RANDOM}"
readonly DB_CONTAINER="instantmed-resend-mirror-${RUN_TOKEN}"
DB_CONTAINER_STARTED=false

cleanup() {
  if [[ "$DB_CONTAINER_STARTED" == "true" ]] \
    && [[ "$(docker inspect --format '{{ index .Config.Labels "instantmed.test" }}' "$DB_CONTAINER" 2>/dev/null || true)" == "resend-webhook-mirrors" ]]
  then
    docker rm -f "$DB_CONTAINER" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT INT TERM

docker run --detach --rm \
  --name "$DB_CONTAINER" \
  --label "instantmed.test=resend-webhook-mirrors" \
  --env POSTGRES_PASSWORD=instantmed-test \
  postgres:15-alpine >/dev/null
DB_CONTAINER_STARTED=true

for _attempt in $(seq 1 80); do
  if docker exec "$DB_CONTAINER" pg_isready -U postgres -d postgres >/dev/null 2>&1; then
    break
  fi
  sleep 0.25
done
docker exec "$DB_CONTAINER" pg_isready -U postgres -d postgres >/dev/null

run_psql() {
  docker exec -i "$DB_CONTAINER" psql -v ON_ERROR_STOP=1 -U postgres -d postgres "$@"
}

run_psql <<'SQL'
create role anon nologin;
create role authenticated nologin;
create role service_role nologin;
create schema extensions;
create extension pgcrypto with schema extensions;

create table public.profiles (
  id uuid primary key,
  role text not null,
  email text,
  phone text,
  normalized_email text,
  normalized_phone text,
  merged_into_profile_id uuid,
  email_bounced boolean default false,
  email_bounce_reason text,
  email_bounced_at timestamptz,
  email_delivery_failures integer default 0
);
create or replace function public.normalize_au_phone(value text)
returns text
language sql
immutable
as $$ select nullif(regexp_replace(value, '\\D', '', 'g'), '') $$;
create or replace function public.tg_profiles_identity_normalize()
returns trigger
language plpgsql
as $$
begin
  new.normalized_email := nullif(lower(btrim(new.email)), '');
  new.normalized_phone := public.normalize_au_phone(new.phone);
  return new;
end;
$$;
create trigger profiles_identity_normalize
  before insert or update of email, phone on public.profiles
  for each row execute function public.tg_profiles_identity_normalize();
create table public.issued_certificates (
  id uuid primary key,
  status text not null default 'valid',
  storage_path text not null default 'certificates/current-test.pdf',
  email_delivery_id text,
  email_sent_at timestamptz,
  email_failed_at timestamptz,
  email_failure_reason text,
  email_retry_count integer not null default 0,
  email_opened_at timestamptz,
  updated_at timestamptz not null default now()
);
create table public.certificate_resend_attempts (
  id uuid primary key,
  certificate_id uuid not null references public.issued_certificates(id) on delete restrict,
  certificate_storage_path text not null,
  actor_id uuid not null references public.profiles(id) on delete restrict,
  actor_role text not null check (actor_role in ('patient', 'doctor', 'admin', 'support')),
  resend_reason text not null,
  count_toward_staff_limit boolean not null default false,
  status text not null default 'reserved' check (status in ('reserved', 'sent', 'failed')),
  email_outbox_id text,
  provider_message_id text,
  failure_reason text,
  created_at timestamptz not null default now(),
  finalized_at timestamptz
);
create table public.email_preferences (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id),
  marketing_emails boolean not null default true,
  abandoned_checkout_emails boolean not null default true,
  transactional_emails boolean not null default true,
  unsubscribed_at timestamptz,
  unsubscribe_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Match the production baseline trigger, which always rewrites updated_at.
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE OR REPLACE TRIGGER email_preferences_updated_at
  BEFORE UPDATE ON public.email_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
create table public.auth_email_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  action_type text not null,
  status text not null,
  recipient_hash text not null,
  recipient_domain text,
  provider text not null default 'resend',
  provider_message_id text,
  http_status integer,
  error_message text,
  metadata jsonb not null default '{}'::jsonb
);
create table public.email_outbox (
  id uuid primary key,
  email_type text not null,
  to_email text not null,
  subject text not null,
  status text not null default 'pending',
  provider text not null default 'resend',
  provider_message_id text,
  error_message text,
  retry_count integer not null default 0,
  intake_id uuid,
  patient_id uuid references public.profiles(id),
  certificate_id uuid references public.issued_certificates(id),
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  delivery_status text,
  delivery_status_updated_at timestamptz
);
create table public.delivery_tracking (
  id uuid primary key default gen_random_uuid(),
  message_id text not null unique,
  intake_id uuid,
  patient_id uuid,
  channel text not null check (channel in ('email', 'sms')),
  template_type text not null,
  provider_id text not null,
  recipient text not null,
  status text default 'sent' check (status in ('sent', 'delivered', 'bounced', 'failed', 'opened')),
  sent_at timestamptz,
  delivered_at timestamptz,
  bounced_at timestamptz,
  opened_at timestamptz,
  bounce_type text check (bounce_type in ('hard', 'soft')),
  bounce_reason text,
  error_code text,
  error_message text,
  attempt_number integer default 1
);
create table public.intakes (
  id uuid primary key,
  patient_id uuid references public.profiles(id),
  category text,
  subtype text,
  paid_at timestamptz,
  payment_status text,
  utm_source text,
  exclude_from_reporting boolean
);
create table public.prescriptions (
  id uuid primary key,
  patient_id uuid references public.profiles(id),
  intake_id uuid references public.intakes(id)
);

-- Pre-migration legacy state: the retired route marked a single soft bounce
-- and a complaint as permanent profile defects. The forward migration must
-- release those address flags without erasing genuine hard evidence or the
-- separate sticky complaint preference.
insert into public.profiles (
  id, role, email, email_bounced, email_bounce_reason, email_bounced_at,
  email_delivery_failures
) values
  (
    '10000000-0000-4000-8000-000000000090', 'patient',
    'legacy-soft@example.test', true, 'soft: Mailbox busy',
    '2026-09-04T01:00:00Z', 1
  ),
  (
    '10000000-0000-4000-8000-000000000091', 'patient',
    'legacy-complaint-cleanup@example.test', true,
    'complaint: Spam complaint', '2026-09-04T02:00:00Z', 1
  ),
  (
    '10000000-0000-4000-8000-000000000092', 'patient',
    'legacy-hard@example.test', true, 'hard: Invalid mailbox',
    '2026-09-04T03:00:00Z', 1
  ),
  (
    '10000000-0000-4000-8000-000000000093', 'patient',
    'legacy-permanent@example.test', true, 'soft: Misclassified permanent',
    '2026-09-04T04:00:00Z', 1
  );
insert into public.email_preferences (
  profile_id, marketing_emails, abandoned_checkout_emails,
  unsubscribed_at, unsubscribe_reason, updated_at
) values (
  '10000000-0000-4000-8000-000000000091', false, false,
  '2026-09-04T02:00:00Z', 'spam_complaint', '2026-09-04T02:00:00Z'
);
insert into public.email_outbox (
  id, email_type, to_email, subject, status, provider_message_id, patient_id,
  metadata, created_at, sent_at, delivery_status, delivery_status_updated_at
) values (
  '30000000-0000-4000-8000-000000000093', 'generic',
  'legacy-permanent@example.test', 'Legacy permanent bounce', 'failed',
  'resend-legacy-permanent-pre-migration',
  '10000000-0000-4000-8000-000000000093',
  '{"bounce_type":"soft","bounce":{"type":"Permanent"}}'::jsonb,
  '2026-09-04T04:00:00Z', '2026-09-04T04:00:00Z', 'bounced',
  '2026-09-04T04:01:00Z'
);
SQL

run_psql < "$PREFERENCE_MIGRATION" >/dev/null
run_psql < "$PREFERENCE_SQL_TEST" >/dev/null
if [[ "${1:-}" == "--preferences-only" ]]; then
  printf 'Preference ordering database tests passed with the production updated_at trigger.\n'
  exit 0
fi
run_psql < "$REPO_ROOT/supabase/migrations/20260905115000_resend_delivery_receipts.sql" >/dev/null
run_psql < "$MIGRATION" >/dev/null
run_psql < "$REPO_ROOT/scripts/sql/resend-delivery-order-db.test.sql" >/dev/null
if [[ "${1:-}" == "--repair-proposal" ]]; then
  {
    sed '$d' "$REPO_ROOT/scripts/sql/proposed-email-address-state-repair.sql"
    cat "$REPO_ROOT/scripts/sql/proposed-email-address-state-repair-db.test.sql"
    printf 'rollback;\n'
  } | run_psql >/dev/null
  printf 'Separate repair proposal passed synthetic rollback-only tests.\n'
  exit 0
fi
run_psql < "$SQL_TEST" >/dev/null

# Delivery owns the outbox lock first; the later bounce must win every durable
# mirror after it waits for delivery's transaction to commit.
run_psql <<'SQL' >/dev/null &
begin;
select * from public.record_resend_outbox_event(
  'resend-concurrent-delivery-first', 'email.delivered', null, null
);
select pg_sleep(1);
commit;
SQL
delivery_first_pid=$!
sleep 0.2
run_psql <<'SQL' >/dev/null
select * from public.record_resend_outbox_event(
  'resend-concurrent-delivery-first', 'email.bounced', 'hard', 'Mailbox unavailable'
);
SQL
wait "$delivery_first_pid"

run_psql <<'SQL' >/dev/null
do $function$
begin
  if not coalesce((
    select profile.email_bounced
      and profile.email_delivery_failures = 0
      and outbox.delivery_status = 'bounced'
      and tracking.status = 'bounced'
    from public.profiles as profile
    join public.email_outbox as outbox on outbox.patient_id = profile.id
    join public.delivery_tracking as tracking
      on tracking.provider_id = outbox.provider_message_id
    where outbox.provider_message_id = 'resend-concurrent-delivery-first'
  ), false) then
    raise exception 'later concurrent bounce did not win every durable mirror';
  end if;
end;
$function$;
SQL

# Complaint owns the lock first; the later delivery must observe the terminal
# winner and must not clear suppression, unsubscribe, or tracking failure.
run_psql <<'SQL' >/dev/null &
begin;
select * from public.record_resend_outbox_event(
  'resend-concurrent-complaint-first', 'email.complained', null, null
);
select pg_sleep(1);
commit;
SQL
bounce_first_pid=$!
sleep 0.2
run_psql <<'SQL' >/dev/null
select * from public.record_resend_outbox_event(
  'resend-concurrent-complaint-first', 'email.delivered', null, null
);
SQL
wait "$bounce_first_pid"

run_psql <<'SQL' >/dev/null
do $function$
begin
  if not coalesce((
    select not profile.email_bounced
      and profile.email_delivery_failures = 0
      and outbox.delivery_status = 'complained'
      and outbox.status = 'sent'
      and tracking.status = 'delivered'
      and not preferences.marketing_emails
      and not preferences.abandoned_checkout_emails
    from public.profiles as profile
    join public.email_outbox as outbox on outbox.patient_id = profile.id
    join public.delivery_tracking as tracking
      on tracking.provider_id = outbox.provider_message_id
    join public.email_preferences as preferences on preferences.profile_id = profile.id
    where outbox.provider_message_id = 'resend-concurrent-complaint-first'
  ), false) then
    raise exception 'delivery regressed a concurrent terminal complaint';
  end if;
end;
$function$;
SQL

# A newer delivery obtains the shared patient/address lock first. The delayed
# callback for the older attempt has a later provider timestamp but must wait,
# observe the newer durable success, and leave the address unsuppressed.
run_psql <<'SQL' >/dev/null &
begin;
select * from public.record_resend_outbox_event(
  'resend-concurrent-cross-newer-delivery',
  'email.delivered',
  null,
  null,
  '2026-09-05T01:10:00Z'
);
select pg_sleep(1);
commit;
SQL
cross_success_first_pid=$!
sleep 0.2
run_psql <<'SQL' >/dev/null
select * from public.record_resend_outbox_event(
  'resend-concurrent-cross-older-bounce',
  'email.bounced',
  'hard',
  'Delayed older failure',
  '2026-09-05T02:10:00Z'
);
SQL
wait "$cross_success_first_pid"

run_psql <<'SQL' >/dev/null
do $function$
begin
  if not coalesce((
    select not profile.email_bounced
      and profile.email_delivery_failures = 0
      and older.delivery_status = 'bounced'
      and newer.delivery_status = 'delivered'
      and older_tracking.status = 'bounced'
      and newer_tracking.status = 'delivered'
    from public.profiles as profile
    join public.email_outbox as older
      on older.patient_id = profile.id
      and older.provider_message_id = 'resend-concurrent-cross-older-bounce'
    join public.email_outbox as newer
      on newer.patient_id = profile.id
      and newer.provider_message_id = 'resend-concurrent-cross-newer-delivery'
    join public.delivery_tracking as older_tracking
      on older_tracking.provider_id = older.provider_message_id
    join public.delivery_tracking as newer_tracking
      on newer_tracking.provider_id = newer.provider_message_id
    where profile.id = '10000000-0000-4000-8000-000000000022'
  ), false) then
    raise exception 'concurrent older bounce re-suppressed after newer delivery';
  end if;
end;
$function$;
SQL

# In the opposite lock order, an older complaint commits first and a newer open
# then clears address suppression. The valid complaint opt-out remains sticky.
run_psql <<'SQL' >/dev/null &
begin;
select * from public.record_resend_outbox_event(
  'resend-concurrent-cross-older-complaint',
  'email.complained',
  null,
  null,
  '2026-09-05T00:10:00Z'
);
select pg_sleep(1);
commit;
SQL
cross_complaint_first_pid=$!
sleep 0.2
run_psql <<'SQL' >/dev/null
select * from public.record_resend_outbox_event(
  'resend-concurrent-cross-newer-open',
  'email.opened',
  null,
  null,
  '2026-09-05T01:10:00Z'
);
SQL
wait "$cross_complaint_first_pid"

run_psql <<'SQL' >/dev/null
do $function$
begin
  if not coalesce((
    select not profile.email_bounced
      and profile.email_delivery_failures = 0
      and not preferences.marketing_emails
      and not preferences.abandoned_checkout_emails
      and preferences.unsubscribe_reason = 'spam_complaint'
      and older.delivery_status = 'complained'
      and newer.delivery_status = 'opened'
    from public.profiles as profile
    join public.email_preferences as preferences
      on preferences.profile_id = profile.id
    join public.email_outbox as older
      on older.patient_id = profile.id
      and older.provider_message_id = 'resend-concurrent-cross-older-complaint'
    join public.email_outbox as newer
      on newer.patient_id = profile.id
      and newer.provider_message_id = 'resend-concurrent-cross-newer-open'
    where profile.id = '10000000-0000-4000-8000-000000000023'
  ), false) then
    raise exception 'concurrent newer open did not win address state after complaint';
  end if;
end;
$function$;
SQL

# Attempt C's bounce owns the patient lock first while attempt B's middle
# delivery arrives concurrently. B must recompute the suffix after C commits:
# hard-bounce C owns address suppression but is not soft-bounce threshold evidence.
run_psql <<'SQL' >/dev/null &
begin;
select * from public.record_resend_outbox_event(
  'resend-concurrent-consecutive-c',
  'email.bounced',
  'hard',
  'Attempt C failed',
  '2026-09-05T02:10:00Z'
);
select pg_sleep(1);
commit;
SQL
consecutive_terminal_first_pid=$!
sleep 0.2
run_psql <<'SQL' >/dev/null
select * from public.record_resend_outbox_event(
  'resend-concurrent-consecutive-b',
  'email.delivered',
  null,
  null,
  '2026-09-05T01:10:00Z'
);
SQL
wait "$consecutive_terminal_first_pid"

run_psql <<'SQL' >/dev/null
do $function$
begin
  if not coalesce((
    select profile.email_bounced
      and profile.email_bounce_reason = 'hard: Attempt C failed'
      and profile.email_bounced_at = '2026-09-05T02:10:00Z'
      and profile.email_delivery_failures = 0
    from public.profiles as profile
    where profile.id = '10000000-0000-4000-8000-000000000025'
  ), false) then
    raise exception 'concurrent A-C-B failure suffix did not converge';
  end if;
end;
$function$;
SQL

echo "Resend webhook transactional mirror database invariants passed."
