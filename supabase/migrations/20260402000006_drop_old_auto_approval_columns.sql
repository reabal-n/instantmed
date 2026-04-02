-- Phase 3: Drop old auto-approval boolean columns
-- Prerequisites: new pipeline code deployed and verified
-- ai_approved, ai_approved_at, claimed_by, claimed_at, auto_approval_attempts are KEPT

ALTER TABLE intakes DROP COLUMN IF EXISTS auto_approval_skipped;
ALTER TABLE intakes DROP COLUMN IF EXISTS auto_approval_skip_reason;
