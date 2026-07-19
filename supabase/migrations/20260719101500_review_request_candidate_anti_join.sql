-- Select unowned review-request candidates inside Postgres. Client-side owner
-- lists are unsafe here: PostgREST caps result sets and large `not.in` filters
-- eventually exceed practical URL limits.

create index if not exists idx_email_outbox_review_request_intake
  on public.email_outbox (intake_id)
  where email_type = 'review_request'
    and intake_id is not null;

create or replace function public.get_review_request_candidates(
  p_catch_up_floor timestamptz,
  p_eligible_before timestamptz,
  p_limit integer default 50,
  p_excluded_patient_id uuid default null
)
returns table (
  id uuid,
  patient_id uuid,
  category text,
  status text,
  payment_status text,
  document_sent_at timestamptz,
  script_sent_at timestamptz,
  review_email_sent_at timestamptz,
  review_email_suppressed_at timestamptz,
  patient_email text,
  patient_first_name text,
  patient_email_bounced boolean
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    intake.id,
    intake.patient_id,
    intake.category::text,
    intake.status::text,
    intake.payment_status::text,
    intake.document_sent_at,
    intake.script_sent_at,
    intake.review_email_sent_at,
    intake.review_email_suppressed_at,
    patient.email,
    patient.first_name,
    patient.email_bounced
  from public.intakes as intake
  join public.profiles as patient
    on patient.id = intake.patient_id
  where intake.status in ('approved', 'completed')
    and intake.payment_status = 'paid'
    and intake.review_email_sent_at is null
    and intake.review_email_suppressed_at is null
    and (
      p_excluded_patient_id is null
      or intake.patient_id <> p_excluded_patient_id
    )
    and (
      (
        intake.category = 'medical_certificate'
        and intake.document_sent_at >= p_catch_up_floor
        and intake.document_sent_at <= p_eligible_before
      )
      or (
        intake.category in ('prescription', 'consult')
        and intake.script_sent_at >= p_catch_up_floor
        and intake.script_sent_at <= p_eligible_before
      )
    )
    and not exists (
      select 1
      from public.email_outbox as outbox
      where outbox.email_type = 'review_request'
        and outbox.intake_id = intake.id
    )
  order by
    case
      when intake.category = 'medical_certificate'
        then intake.document_sent_at
      else intake.script_sent_at
    end asc,
    intake.id asc
  limit greatest(0, least(coalesce(p_limit, 50), 500));
$$;

comment on function public.get_review_request_candidates(
  timestamptz,
  timestamptz,
  integer,
  uuid
) is
  'Returns oldest eligible review-request candidates that have no durable outbox owner.';

revoke execute on function public.get_review_request_candidates(
  timestamptz,
  timestamptz,
  integer,
  uuid
) from public, anon, authenticated;

grant execute on function public.get_review_request_candidates(
  timestamptz,
  timestamptz,
  integer,
  uuid
) to service_role;
