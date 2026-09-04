#!/usr/bin/env bash
set -euo pipefail

readonly REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
readonly MIGRATION="$REPO_ROOT/supabase/migrations/20260905120000_refill_reminder_funnel.sql"
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

create table public.profiles (
  id uuid primary key,
  role text not null,
  email_bounced boolean default false,
  email_bounce_reason text,
  email_bounced_at timestamptz,
  email_delivery_failures integer default 0
);
create table public.issued_certificates (
  id uuid primary key,
  email_opened_at timestamptz
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
SQL

run_psql < "$MIGRATION" >/dev/null
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
      and profile.email_delivery_failures = 1
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
    select profile.email_bounced
      and profile.email_delivery_failures = 1
      and outbox.delivery_status = 'complained'
      and tracking.status = 'failed'
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

echo "Resend webhook transactional mirror database invariants passed."
