-- Migration: Create document_drafts table for AI-generated drafts
-- Purpose: Store AI-generated clinical notes and med cert drafts with idempotency

-- Create enum for draft types
DO $$ BEGIN
  CREATE TYPE draft_type AS ENUM ('clinical_note', 'med_cert');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create enum for draft status
DO $$ BEGIN
  CREATE TYPE draft_status AS ENUM ('ready', 'failed', 'pending');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create document_drafts table
CREATE TABLE IF NOT EXISTS document_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id UUID NOT NULL REFERENCES intakes(id) ON DELETE CASCADE,
  type draft_type NOT NULL,
  content JSONB NOT NULL DEFAULT '{}',
  model TEXT NOT NULL DEFAULT 'openai/gpt-4o-mini',
  is_ai_generated BOOLEAN NOT NULL DEFAULT true,
  status draft_status NOT NULL DEFAULT 'pending',
  error TEXT,
  -- Token usage tracking
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  generation_duration_ms INTEGER,
  -- Validation tracking
  validation_errors JSONB,
  ground_truth_errors JSONB,
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Unique constraint for idempotency: one draft per type per intake
  CONSTRAINT document_drafts_intake_type_unique UNIQUE (intake_id, type)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_document_drafts_intake_id ON document_drafts(intake_id);
CREATE INDEX IF NOT EXISTS idx_document_drafts_status ON document_drafts(status);
CREATE INDEX IF NOT EXISTS idx_document_drafts_type ON document_drafts(type);
CREATE INDEX IF NOT EXISTS idx_document_drafts_created_at ON document_drafts(created_at DESC);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_document_drafts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS document_drafts_updated_at ON document_drafts;
CREATE TRIGGER document_drafts_updated_at
  BEFORE UPDATE ON document_drafts
  FOR EACH ROW
  EXECUTE FUNCTION update_document_drafts_updated_at();

-- RLS Policies
ALTER TABLE document_drafts ENABLE ROW LEVEL SECURITY;

-- Doctors can read all drafts
CREATE POLICY "Doctors can read document drafts"
  ON document_drafts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'doctor'
    )
  );

-- Patients can read their own drafts
CREATE POLICY "Patients can read own drafts"
  ON document_drafts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM intakes
      WHERE intakes.id = document_drafts.intake_id
      AND intakes.patient_id = auth.uid()
    )
  );

-- Service role can do everything (for server actions)
CREATE POLICY "Service role full access"
  ON document_drafts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Comment for documentation
COMMENT ON TABLE document_drafts IS 'Stores AI-generated draft documents (clinical notes, med certs) for doctor review';
COMMENT ON COLUMN document_drafts.content IS 'JSONB containing the draft content, structure varies by type';
COMMENT ON COLUMN document_drafts.ground_truth_errors IS 'Validation errors from comparing AI output against intake answers';
