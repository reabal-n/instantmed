-- AI Auto-Approval tracking columns on intakes
-- Supports the auto-approval pipeline for medical certificates

ALTER TABLE intakes
  ADD COLUMN IF NOT EXISTS ai_approved BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ai_approval_reason TEXT;

-- Index for doctor batch review queries (find AI-approved certs quickly)
CREATE INDEX IF NOT EXISTS idx_intakes_ai_approved
  ON intakes(ai_approved, ai_approved_at DESC)
  WHERE ai_approved = true;

COMMENT ON COLUMN intakes.ai_approved IS 'Whether this intake was auto-approved by AI';
COMMENT ON COLUMN intakes.ai_approved_at IS 'When AI auto-approval occurred';
COMMENT ON COLUMN intakes.ai_approval_reason IS 'Reason/summary for AI auto-approval decision';
