-- ============================================================================
-- REPEAT PRESCRIPTION: ADD SCRIPT SENT TRACKING
-- 
-- Tracks when a doctor sends a repeat prescription via Parchment
-- Used to mark repeat_rx intakes as completed
-- ============================================================================

-- Add prescription sent fields to intakes
ALTER TABLE public.intakes
ADD COLUMN IF NOT EXISTS prescription_sent_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS prescription_sent_by UUID DEFAULT NULL REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS prescription_sent_channel TEXT DEFAULT 'parchment';

-- Index for efficient queries on sent prescriptions
CREATE INDEX IF NOT EXISTS idx_intakes_prescription_sent 
ON public.intakes (prescription_sent_at DESC) 
WHERE prescription_sent_at IS NOT NULL;

-- Comments for documentation
COMMENT ON COLUMN public.intakes.prescription_sent_at IS 
'Timestamp when repeat prescription was sent via external system (e.g., Parchment)';

COMMENT ON COLUMN public.intakes.prescription_sent_by IS 
'Doctor profile ID who sent the prescription';

COMMENT ON COLUMN public.intakes.prescription_sent_channel IS 
'Channel used to send prescription: parchment, email, sms, other';

-- RLS is already enabled on intakes table
-- Existing doctor policies allow update on assigned intakes
-- No additional RLS needed as doctors can already update their assigned intakes
