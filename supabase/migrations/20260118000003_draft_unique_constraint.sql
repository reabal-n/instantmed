-- Add unique constraint for intake_drafts to prevent race conditions
-- This ensures only one in-progress draft per session + service combination

-- Create unique partial index for active drafts
CREATE UNIQUE INDEX IF NOT EXISTS idx_intake_drafts_session_service_active 
ON public.intake_drafts(session_id, service_slug) 
WHERE status = 'in_progress';

COMMENT ON INDEX idx_intake_drafts_session_service_active IS 
  'Ensures only one in-progress draft exists per session and service combination';
