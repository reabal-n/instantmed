-- Add clinical_note column to requests table for doctor's internal notes
-- This is visible only to doctors and acts as an EMR-lite note field

ALTER TABLE public.requests
  ADD COLUMN IF NOT EXISTS clinical_note text DEFAULT NULL;

-- Add index for searching notes (optional, useful for future search functionality)
CREATE INDEX IF NOT EXISTS requests_clinical_note_idx ON public.requests USING gin(to_tsvector('english', clinical_note))
WHERE clinical_note IS NOT NULL;
