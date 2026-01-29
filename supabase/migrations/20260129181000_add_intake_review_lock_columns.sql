-- Add columns for intake review locking (soft session lock)
-- These columns track which doctor is currently reviewing an intake

ALTER TABLE public.intakes
ADD COLUMN IF NOT EXISTS reviewing_doctor_id uuid REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS reviewing_doctor_name text,
ADD COLUMN IF NOT EXISTS review_started_at timestamptz;

-- Add index for efficient lookup of active reviews
CREATE INDEX IF NOT EXISTS idx_intakes_reviewing_doctor 
ON public.intakes(reviewing_doctor_id) 
WHERE reviewing_doctor_id IS NOT NULL;

COMMENT ON COLUMN public.intakes.reviewing_doctor_id IS 'ID of doctor currently reviewing this intake (soft lock)';
COMMENT ON COLUMN public.intakes.reviewing_doctor_name IS 'Name of doctor currently reviewing (for display)';
COMMENT ON COLUMN public.intakes.review_started_at IS 'When the current review session started (for lock expiry)';
