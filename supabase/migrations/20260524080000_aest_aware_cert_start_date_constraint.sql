-- AEST-aware "not in the future" guard for issued certificate start dates.
--
-- Previously this constraint used `CURRENT_DATE`, which resolves in the
-- database session's timezone (UTC on Supabase by default). The application
-- code that determines "today" for a medical certificate always uses
-- Australian Eastern Time (see `getSydneyDateOnly` and `todayAEST` in
-- `lib/medical-certificates/date-policy.ts` and `lib/data/documents.ts`).
--
-- These two views of "today" disagree for ~10 hours every UTC day. Between
-- 14:00 UTC and 23:59 UTC (which is 00:00-09:59 AEST the *next* day), the
-- application's AEST today is one day ahead of the database's UTC today.
-- A doctor approving a "today" certificate during that window submits
-- start_date = AEST today, which the UTC constraint rejects as "future".
--
-- This bug also failed the e2e suite consistently after every 14:00 UTC
-- mark, because the auto-created document_draft seeds dateFrom = AEST today.
-- See `app/doctor/intakes/[id]/document/document-builder-client.tsx` and
-- the e2e traces from CI run 26334774903 (PR 56 evening).
--
-- The fix: anchor the constraint to AEST so it agrees with the application.
-- We keep `NOT VALID` to avoid scanning existing rows on deploy; new rows
-- still get the check on insert.

ALTER TABLE public.issued_certificates
  DROP CONSTRAINT IF EXISTS issued_certificates_start_date_not_future;

ALTER TABLE public.issued_certificates
  ADD CONSTRAINT issued_certificates_start_date_not_future
  CHECK (start_date <= ((now() AT TIME ZONE 'Australia/Sydney')::date))
  NOT VALID;
