-- Forbid new general consult intakes after the 2026-05-20 public retirement.
--
-- The general consult subtype was retired from the marketing surface on
-- 2026-05-20, then from the application code on 2026-05-25. This constraint
-- locks the DB so a future regression (or a manual SQL fix) cannot resurrect
-- it without an explicit migration.
--
-- 3 historical rows exist with category='consult' AND subtype='general':
--   - 2 approved+paid (2026-04-29 and 2026-05-18)
--   - 1 declined+refunded (2026-05-20)
-- All terminal-state. Constraint uses NOT VALID then VALIDATE to skip the
-- existing rows during the ADD CONSTRAINT (avoids a lock + a failure on
-- legacy data), then validates only new + updated rows going forward.

ALTER TABLE intakes
  ADD CONSTRAINT intakes_consult_subtype_not_general
  CHECK (NOT (category = 'consult' AND subtype = 'general'))
  NOT VALID;

-- Don't run VALIDATE — that would fail on the 3 historical rows. The NOT
-- VALID form still enforces the constraint for all new INSERTs and UPDATEs
-- (Postgres only skips validation of pre-existing data). If we ever want to
-- backfill / re-categorize the 3 legacy rows, run VALIDATE afterwards as a
-- separate migration.

COMMENT ON CONSTRAINT intakes_consult_subtype_not_general ON intakes IS
  'General consult subtype retired 2026-05-25. 3 legacy rows pre-date this constraint and are exempt via NOT VALID.';
