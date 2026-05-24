-- Allow medical certificates to be dated up to 14 days in the future.
--
-- Med certs commonly cover an upcoming absence the patient already knows
-- about: tomorrow's procedure, planned recovery window, a scheduled day off.
-- The previous constraint (start_date <= today) blocked every forward-dated
-- cert at the DB layer and was killing conversion on the primary paid
-- product. CLAUDE.md never restricted cert start dates to today or earlier;
-- this was an over-tight defence-in-depth check.
--
-- The application validator at lib/medical-certificates/date-policy.ts
-- enforces the same +14-day window with the matching constant
-- CERTIFICATE_MAX_FORWARD_DAYS_DEFAULT. Backdating remains capped at 7 days
-- in the validator.
--
-- This migration supersedes 20260524080000_aest_aware_cert_start_date_constraint.sql.
-- The previous AEST-aware version is preserved in history but immediately
-- replaced here. NOT VALID skips existing-row validation; new rows still
-- get the check on insert.

ALTER TABLE public.issued_certificates
  DROP CONSTRAINT IF EXISTS issued_certificates_start_date_not_future;

ALTER TABLE public.issued_certificates
  ADD CONSTRAINT issued_certificates_start_date_not_future
  CHECK (start_date <= (((now() AT TIME ZONE 'Australia/Sydney')::date) + 14))
  NOT VALID;
