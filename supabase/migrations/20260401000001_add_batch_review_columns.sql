-- Add batch review tracking columns to intakes
-- Used to enforce that auto-approved certificates are reviewed by a doctor within 24h
-- Part of AHPRA compliance: every auto-approved cert must be doctor-reviewed

ALTER TABLE intakes ADD COLUMN IF NOT EXISTS batch_reviewed_at TIMESTAMPTZ;
ALTER TABLE intakes ADD COLUMN IF NOT EXISTS batch_reviewed_by UUID REFERENCES profiles(id);

-- Add auto_approval_attempts counter for retry cap
ALTER TABLE intakes ADD COLUMN IF NOT EXISTS auto_approval_attempts INT NOT NULL DEFAULT 0;

-- Index for efficient batch review queries (un-reviewed auto-approved certs)
CREATE INDEX IF NOT EXISTS idx_intakes_batch_review_pending
  ON intakes (ai_approved_at)
  WHERE ai_approved = true AND batch_reviewed_at IS NULL;
