-- Separate confirmed delivery from terminal policy suppression. Existing sent
-- markers are intentionally not backfilled into the new suppression columns.

alter table public.intakes
  add column if not exists review_email_suppressed_at timestamptz;

alter table public.partial_intakes
  add column if not exists recovery_email_suppressed_at timestamptz;

alter table public.partial_intakes
  add column if not exists recovery_tracking_id uuid;

update public.partial_intakes
set recovery_tracking_id = gen_random_uuid()
where recovery_tracking_id is null;

alter table public.partial_intakes
  alter column recovery_tracking_id set default gen_random_uuid();

alter table public.partial_intakes
  alter column recovery_tracking_id set not null;

create unique index if not exists idx_partial_intakes_recovery_tracking_id
  on public.partial_intakes (recovery_tracking_id);

comment on column public.intakes.review_email_suppressed_at is
  'Terminal policy-suppression marker for review requests. Never inferred from review_email_sent_at.';

comment on column public.partial_intakes.recovery_email_suppressed_at is
  'Terminal policy-suppression marker for draft recovery. Never inferred from recovery_email_sent_at.';

comment on column public.partial_intakes.recovery_tracking_id is
  'Non-bearer correlation ID for recovery delivery records. session_id remains a secret bearer token and must not be logged or queued.';

drop index if exists public.idx_partial_intakes_recovery;

create index idx_partial_intakes_recovery
  on public.partial_intakes (updated_at)
  where email is not null
    and converted_to_intake_id is null
    and recovery_email_sent_at is null
    and recovery_email_suppressed_at is null;

comment on index public.idx_partial_intakes_recovery is
  'Eligible partial-intake recovery queue only: unconverted, unsent, and not policy-suppressed drafts ordered by age.';
