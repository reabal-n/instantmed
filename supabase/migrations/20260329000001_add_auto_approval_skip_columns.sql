-- Add columns to skip deterministic auto-approval failures
-- Prevents retry cron from re-evaluating intakes that will always fail
-- (e.g., emergency keywords, under 18, sole mental health symptom)

ALTER TABLE intakes
  ADD COLUMN IF NOT EXISTS auto_approval_skipped boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_approval_skip_reason text;

COMMENT ON COLUMN intakes.auto_approval_skipped IS 'Set to true when auto-approval fails with a deterministic reason (emergency, under 18, sole mental health symptom). Prevents retry cron from re-evaluating.';
COMMENT ON COLUMN intakes.auto_approval_skip_reason IS 'Human-readable reason why auto-approval was skipped. Null if not skipped.';

CREATE INDEX IF NOT EXISTS idx_intakes_auto_approval_skip
  ON intakes (auto_approval_skipped)
  WHERE status = 'paid' AND auto_approval_skipped = false;
