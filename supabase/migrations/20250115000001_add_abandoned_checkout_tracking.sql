-- Add column to track abandoned checkout email sends
ALTER TABLE public.intakes 
ADD COLUMN IF NOT EXISTS abandoned_email_sent_at TIMESTAMPTZ;

-- Index for efficiently finding abandoned checkouts
CREATE INDEX IF NOT EXISTS idx_intakes_abandoned_checkout 
ON public.intakes(created_at, status, payment_status, abandoned_email_sent_at) 
WHERE status = 'pending_payment' AND payment_status = 'pending' AND abandoned_email_sent_at IS NULL;

COMMENT ON COLUMN public.intakes.abandoned_email_sent_at IS 'Timestamp when abandoned checkout recovery email was sent';
