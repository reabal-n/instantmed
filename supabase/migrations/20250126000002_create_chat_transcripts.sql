-- Migration: Create ai_chat_transcripts table for full conversation storage
-- Purpose: Store complete chat transcripts for doctor review and audit compliance
-- Decision: Separate from ai_chat_audit_log (per-turn) because transcripts are per-session

CREATE TABLE IF NOT EXISTS ai_chat_transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Session and user references
  session_id TEXT NOT NULL UNIQUE, -- One transcript per session
  patient_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  intake_id UUID REFERENCES intakes(id) ON DELETE SET NULL, -- Linked after intake submission
  
  -- Transcript content (JSONB array of messages)
  -- Format: [{ "role": "user"|"assistant", "content": "...", "timestamp": "..." }]
  messages JSONB NOT NULL DEFAULT '[]',
  
  -- Metadata for audit
  service_type TEXT,
  model_version TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  total_turns INTEGER NOT NULL DEFAULT 0,
  
  -- Completion tracking
  is_complete BOOLEAN DEFAULT FALSE,
  completion_status TEXT, -- 'submitted', 'abandoned', 'blocked'
  
  -- Safety/compliance flags
  had_safety_flags BOOLEAN DEFAULT FALSE,
  safety_flags TEXT[] DEFAULT '{}',
  was_blocked BOOLEAN DEFAULT FALSE,
  block_reason TEXT,
  
  -- Timestamps
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  -- Redaction tracking (for future use)
  is_redacted BOOLEAN DEFAULT FALSE,
  redacted_at TIMESTAMPTZ,
  redacted_by UUID REFERENCES auth.users(id)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_chat_transcripts_session ON ai_chat_transcripts(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_transcripts_patient ON ai_chat_transcripts(patient_id);
CREATE INDEX IF NOT EXISTS idx_chat_transcripts_intake ON ai_chat_transcripts(intake_id) WHERE intake_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_chat_transcripts_started ON ai_chat_transcripts(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_transcripts_complete ON ai_chat_transcripts(is_complete, last_activity_at DESC);

-- RLS Policies
ALTER TABLE ai_chat_transcripts ENABLE ROW LEVEL SECURITY;

-- Service role full access (for API routes)
CREATE POLICY "Service role full access to chat transcripts"
  ON ai_chat_transcripts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Doctors can read all transcripts (for review)
CREATE POLICY "Doctors can read chat transcripts"
  ON ai_chat_transcripts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role IN ('doctor', 'admin')
    )
  );

-- Patients can read their own transcripts
CREATE POLICY "Patients can read own transcripts"
  ON ai_chat_transcripts
  FOR SELECT
  TO authenticated
  USING (patient_id = auth.uid());

-- Comments
COMMENT ON TABLE ai_chat_transcripts IS 'Full chat transcripts for AI intake conversations - supports doctor review and compliance audit';
COMMENT ON COLUMN ai_chat_transcripts.messages IS 'JSONB array of messages: [{ role, content, timestamp }]';
COMMENT ON COLUMN ai_chat_transcripts.is_redacted IS 'Flag indicating if transcript has been redacted for privacy/legal reasons';
