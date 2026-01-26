-- Migration: Add synced_clinical_note_draft_id to intakes
-- Purpose: Store reference to approved clinical_note draft separately from doctor_notes text
-- This keeps the doctor_notes field clean (no footer/metadata mutation)

-- Add column to track which draft was synced to doctor_notes
ALTER TABLE public.intakes
  ADD COLUMN IF NOT EXISTS synced_clinical_note_draft_id UUID REFERENCES public.document_drafts(id) ON DELETE SET NULL;

-- Index for querying which intakes have synced drafts
CREATE INDEX IF NOT EXISTS idx_intakes_synced_draft 
  ON public.intakes(synced_clinical_note_draft_id) 
  WHERE synced_clinical_note_draft_id IS NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN public.intakes.synced_clinical_note_draft_id IS 'Reference to the approved clinical_note draft that was synced to doctor_notes. Null if doctor_notes was written manually or no draft exists.';
