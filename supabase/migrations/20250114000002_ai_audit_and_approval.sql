-- Migration: AI Audit Log and Draft Approval System
-- Purpose: Add audit logging for AI generations and explicit approval workflow for drafts

-- ============================================
-- 1. AI AUDIT LOG TABLE
-- ============================================

-- Create enum for draft types (if not exists from earlier migration)
DO $$ BEGIN
  CREATE TYPE draft_type AS ENUM ('clinical_note', 'med_cert');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create enum for audit actions
DO $$ BEGIN
  CREATE TYPE ai_audit_action AS ENUM ('generate', 'approve', 'reject', 'regenerate', 'edit');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create enum for actor types
DO $$ BEGIN
  CREATE TYPE ai_actor_type AS ENUM ('system', 'doctor', 'patient');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create the ai_audit_log table
CREATE TABLE IF NOT EXISTS ai_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Reference to the intake (nullable for system-level events)
  intake_id UUID REFERENCES intakes(id) ON DELETE SET NULL,
  
  -- Action details
  action ai_audit_action NOT NULL,
  draft_type draft_type, -- 'clinical_note' or 'med_cert' (uses existing enum)
  draft_id UUID REFERENCES document_drafts(id) ON DELETE SET NULL,
  
  -- Actor information
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  actor_type ai_actor_type NOT NULL,
  
  -- Content hashes for diff detection
  input_hash VARCHAR(64), -- SHA256 of intake answers at time of generation
  output_hash VARCHAR(64), -- SHA256 of AI output
  
  -- Model and token tracking
  model VARCHAR(50),
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  generation_duration_ms INTEGER,
  
  -- Validation results
  validation_passed BOOLEAN,
  ground_truth_passed BOOLEAN,
  validation_errors JSONB,
  ground_truth_errors JSONB,
  
  -- Additional context
  metadata JSONB DEFAULT '{}',
  reason TEXT, -- For reject/edit actions
  
  -- Timestamps (immutable - no updated_at)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_ai_audit_log_intake_id ON ai_audit_log(intake_id);
CREATE INDEX IF NOT EXISTS idx_ai_audit_log_draft_id ON ai_audit_log(draft_id);
CREATE INDEX IF NOT EXISTS idx_ai_audit_log_actor_id ON ai_audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_ai_audit_log_action ON ai_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_ai_audit_log_created_at ON ai_audit_log(created_at DESC);

-- RLS Policies
ALTER TABLE ai_audit_log ENABLE ROW LEVEL SECURITY;

-- Doctors and admins can read audit logs
CREATE POLICY "Doctors can read audit logs"
  ON ai_audit_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role IN ('doctor', 'admin')
    )
  );

-- Service role has full access
CREATE POLICY "Service role full access to audit logs"
  ON ai_audit_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 2. DOCUMENT_DRAFTS TABLE UPDATES
-- ============================================

-- Add approval tracking columns
ALTER TABLE document_drafts 
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS edited_content JSONB,
  ADD COLUMN IF NOT EXISTS input_hash VARCHAR(64);

-- Create index for approval queries
CREATE INDEX IF NOT EXISTS idx_document_drafts_approved_by ON document_drafts(approved_by);
CREATE INDEX IF NOT EXISTS idx_document_drafts_approved_at ON document_drafts(approved_at);

-- Add check constraint for approval state
-- A draft cannot be both approved and rejected
ALTER TABLE document_drafts DROP CONSTRAINT IF EXISTS check_approval_state;
ALTER TABLE document_drafts ADD CONSTRAINT check_approval_state 
  CHECK (NOT (approved_at IS NOT NULL AND rejected_at IS NOT NULL));

-- ============================================
-- 3. HELPER FUNCTIONS
-- ============================================

-- Function to log AI audit events
CREATE OR REPLACE FUNCTION log_ai_audit(
  p_intake_id UUID,
  p_action ai_audit_action,
  p_draft_type draft_type,
  p_draft_id UUID,
  p_actor_id UUID,
  p_actor_type ai_actor_type,
  p_input_hash VARCHAR(64) DEFAULT NULL,
  p_output_hash VARCHAR(64) DEFAULT NULL,
  p_model VARCHAR(50) DEFAULT NULL,
  p_prompt_tokens INTEGER DEFAULT NULL,
  p_completion_tokens INTEGER DEFAULT NULL,
  p_generation_duration_ms INTEGER DEFAULT NULL,
  p_validation_passed BOOLEAN DEFAULT NULL,
  p_ground_truth_passed BOOLEAN DEFAULT NULL,
  p_validation_errors JSONB DEFAULT NULL,
  p_ground_truth_errors JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}',
  p_reason TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_audit_id UUID;
BEGIN
  INSERT INTO ai_audit_log (
    intake_id,
    action,
    draft_type,
    draft_id,
    actor_id,
    actor_type,
    input_hash,
    output_hash,
    model,
    prompt_tokens,
    completion_tokens,
    generation_duration_ms,
    validation_passed,
    ground_truth_passed,
    validation_errors,
    ground_truth_errors,
    metadata,
    reason
  ) VALUES (
    p_intake_id,
    p_action,
    p_draft_type,
    p_draft_id,
    p_actor_id,
    p_actor_type,
    p_input_hash,
    p_output_hash,
    p_model,
    p_prompt_tokens,
    p_completion_tokens,
    p_generation_duration_ms,
    p_validation_passed,
    p_ground_truth_passed,
    p_validation_errors,
    p_ground_truth_errors,
    p_metadata,
    p_reason
  ) RETURNING id INTO v_audit_id;
  
  RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to approve a draft
CREATE OR REPLACE FUNCTION approve_draft(
  p_draft_id UUID,
  p_doctor_id UUID,
  p_edited_content JSONB DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_intake_id UUID;
  v_draft_type draft_type;
BEGIN
  -- Get draft details
  SELECT intake_id, type INTO v_intake_id, v_draft_type
  FROM document_drafts
  WHERE id = p_draft_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Update draft with approval
  UPDATE document_drafts
  SET 
    approved_by = p_doctor_id,
    approved_at = now(),
    edited_content = COALESCE(p_edited_content, edited_content),
    updated_at = now()
  WHERE id = p_draft_id
    AND approved_at IS NULL
    AND rejected_at IS NULL;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Log the approval
  PERFORM log_ai_audit(
    v_intake_id,
    'approve'::ai_audit_action,
    v_draft_type,
    p_draft_id,
    p_doctor_id,
    'doctor'::ai_actor_type,
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
    jsonb_build_object('has_edits', p_edited_content IS NOT NULL),
    NULL
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reject a draft
CREATE OR REPLACE FUNCTION reject_draft(
  p_draft_id UUID,
  p_doctor_id UUID,
  p_reason TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_intake_id UUID;
  v_draft_type draft_type;
BEGIN
  -- Get draft details
  SELECT intake_id, type INTO v_intake_id, v_draft_type
  FROM document_drafts
  WHERE id = p_draft_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Update draft with rejection
  UPDATE document_drafts
  SET 
    rejected_by = p_doctor_id,
    rejected_at = now(),
    rejection_reason = p_reason,
    updated_at = now()
  WHERE id = p_draft_id
    AND approved_at IS NULL
    AND rejected_at IS NULL;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Log the rejection
  PERFORM log_ai_audit(
    v_intake_id,
    'reject'::ai_audit_action,
    v_draft_type,
    p_draft_id,
    p_doctor_id,
    'doctor'::ai_actor_type,
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
    '{}',
    p_reason
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. DOCUMENTATION
-- ============================================

COMMENT ON TABLE ai_audit_log IS 'Immutable audit log for all AI-related actions including generation, approval, rejection, and editing of drafts';
COMMENT ON COLUMN ai_audit_log.input_hash IS 'SHA256 hash of intake answers at time of AI generation - used to detect if answers changed';
COMMENT ON COLUMN ai_audit_log.output_hash IS 'SHA256 hash of AI output content - used to verify content integrity';
COMMENT ON COLUMN ai_audit_log.validation_passed IS 'Whether Zod schema validation passed';
COMMENT ON COLUMN ai_audit_log.ground_truth_passed IS 'Whether ground-truth validation (hallucination checks) passed';

COMMENT ON COLUMN document_drafts.approved_by IS 'Doctor who approved the AI-generated draft';
COMMENT ON COLUMN document_drafts.approved_at IS 'Timestamp when the draft was approved';
COMMENT ON COLUMN document_drafts.rejected_by IS 'Doctor who rejected the AI-generated draft';
COMMENT ON COLUMN document_drafts.rejected_at IS 'Timestamp when the draft was rejected';
COMMENT ON COLUMN document_drafts.rejection_reason IS 'Reason provided for rejecting the draft';
COMMENT ON COLUMN document_drafts.version IS 'Version number - increments on regeneration';
COMMENT ON COLUMN document_drafts.edited_content IS 'Doctor''s edited content before approval (if different from AI output)';
COMMENT ON COLUMN document_drafts.input_hash IS 'SHA256 hash of intake answers when draft was generated';
