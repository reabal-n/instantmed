-- AI Chat Audit Trail Tables
-- For TGA compliance and incident investigation

-- Main audit log for AI chat interactions (separate from ai_audit_log used for drafts)
CREATE TABLE IF NOT EXISTS ai_chat_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  patient_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  service_type TEXT,
  turn_number INTEGER NOT NULL DEFAULT 1,
  user_input_preview TEXT, -- Truncated for privacy
  ai_output_preview TEXT,  -- Truncated for privacy
  user_input_length INTEGER,
  ai_output_length INTEGER,
  input_tokens INTEGER,
  output_tokens INTEGER,
  response_time_ms INTEGER,
  model_version TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  safety_flags TEXT[] DEFAULT '{}',
  had_flags BOOLEAN DEFAULT FALSE,
  was_blocked BOOLEAN DEFAULT FALSE,
  block_reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for efficient querying
CREATE INDEX IF NOT EXISTS idx_ai_chat_audit_log_session ON ai_chat_audit_log(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_audit_log_patient ON ai_chat_audit_log(patient_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_audit_log_created ON ai_chat_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_chat_audit_log_flags ON ai_chat_audit_log(had_flags) WHERE had_flags = TRUE;
CREATE INDEX IF NOT EXISTS idx_ai_chat_audit_log_blocked ON ai_chat_audit_log(was_blocked) WHERE was_blocked = TRUE;

-- Safety blocks table (separate for quick incident review)
CREATE TABLE IF NOT EXISTS ai_safety_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  patient_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  block_type TEXT NOT NULL, -- 'emergency', 'crisis', 'controlled_substance', 'injection'
  trigger_preview TEXT,     -- Truncated content that triggered block
  model_version TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_safety_blocks_type ON ai_safety_blocks(block_type);
CREATE INDEX IF NOT EXISTS idx_ai_safety_blocks_created ON ai_safety_blocks(created_at DESC);

-- Intake completions (successful submissions)
CREATE TABLE IF NOT EXISTS ai_intake_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  patient_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  service_type TEXT NOT NULL,
  total_turns INTEGER NOT NULL,
  total_time_ms INTEGER,
  collected_fields TEXT[] DEFAULT '{}',
  flags TEXT[] DEFAULT '{}',
  had_flags BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_intake_completions_patient ON ai_intake_completions(patient_id);
CREATE INDEX IF NOT EXISTS idx_ai_intake_completions_service ON ai_intake_completions(service_type);
CREATE INDEX IF NOT EXISTS idx_ai_intake_completions_created ON ai_intake_completions(created_at DESC);

-- RLS Policies
ALTER TABLE ai_chat_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_safety_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_intake_completions ENABLE ROW LEVEL SECURITY;

-- Service role can read/write all (for API routes)
CREATE POLICY "Service role full access to ai_chat_audit_log"
  ON ai_chat_audit_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access to ai_safety_blocks"
  ON ai_safety_blocks
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access to ai_intake_completions"
  ON ai_intake_completions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Patients can only read their own data
CREATE POLICY "Patients can view own chat audit log"
  ON ai_chat_audit_log
  FOR SELECT
  TO authenticated
  USING (patient_id = auth.uid());

CREATE POLICY "Patients can view own completions"
  ON ai_intake_completions
  FOR SELECT
  TO authenticated
  USING (patient_id = auth.uid());

-- Add comment for documentation
COMMENT ON TABLE ai_chat_audit_log IS 'Audit trail for all AI chat interactions - TGA compliance requirement';
COMMENT ON TABLE ai_safety_blocks IS 'Records of safety-blocked AI interactions for incident review';
COMMENT ON TABLE ai_intake_completions IS 'Successful intake completions through AI chat';
