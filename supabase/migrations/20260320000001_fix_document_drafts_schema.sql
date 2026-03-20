-- Fix document_drafts table schema
-- The table is missing columns that the AI draft generation code expects.
-- This caused all draft generation (auto-draft on payment + manual generate button) to fail silently.

-- Add missing columns for AI draft generation
ALTER TABLE public.document_drafts
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS content JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS model TEXT DEFAULT 'claude-sonnet-4-20250514',
  ADD COLUMN IF NOT EXISTS error TEXT,
  ADD COLUMN IF NOT EXISTS prompt_tokens INTEGER,
  ADD COLUMN IF NOT EXISTS completion_tokens INTEGER,
  ADD COLUMN IF NOT EXISTS generation_duration_ms INTEGER,
  ADD COLUMN IF NOT EXISTS validation_errors JSONB,
  ADD COLUMN IF NOT EXISTS ground_truth_errors JSONB;

-- Add unique constraint on (intake_id, type) for upsert idempotency
-- The code uses onConflict: "intake_id,type" but only (request_id, type) exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'document_drafts_intake_id_type_unique'
  ) THEN
    ALTER TABLE public.document_drafts
      ADD CONSTRAINT document_drafts_intake_id_type_unique UNIQUE (intake_id, type);
  END IF;
END $$;

-- Add check constraint for valid status values
ALTER TABLE public.document_drafts
  DROP CONSTRAINT IF EXISTS document_drafts_status_check;
ALTER TABLE public.document_drafts
  ADD CONSTRAINT document_drafts_status_check
  CHECK (status IN ('pending', 'ready', 'failed'));

-- Add index on status for filtering ready drafts
CREATE INDEX IF NOT EXISTS idx_document_drafts_status
  ON public.document_drafts (status);

-- Add index on (intake_id, is_ai_generated) for the common query pattern
CREATE INDEX IF NOT EXISTS idx_document_drafts_intake_ai
  ON public.document_drafts (intake_id, is_ai_generated);

-- Column comments
COMMENT ON COLUMN public.document_drafts.status IS 'Draft status: pending, ready, or failed';
COMMENT ON COLUMN public.document_drafts.content IS 'AI-generated draft content (JSON)';
COMMENT ON COLUMN public.document_drafts.model IS 'AI model used for generation';
COMMENT ON COLUMN public.document_drafts.error IS 'Error message if generation failed';
COMMENT ON COLUMN public.document_drafts.prompt_tokens IS 'Number of prompt tokens used';
COMMENT ON COLUMN public.document_drafts.completion_tokens IS 'Number of completion tokens used';
COMMENT ON COLUMN public.document_drafts.generation_duration_ms IS 'Time taken to generate draft in ms';
COMMENT ON COLUMN public.document_drafts.validation_errors IS 'Schema validation errors if any';
COMMENT ON COLUMN public.document_drafts.ground_truth_errors IS 'Ground-truth validation errors if any';
