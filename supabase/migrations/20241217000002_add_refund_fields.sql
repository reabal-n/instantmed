-- Add refund tracking fields to payments table
-- Supports deterministic, idempotent refund logic for declined requests

-- Add refund status enum-like column
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS refund_status text DEFAULT 'not_applicable'
  CHECK (refund_status IN ('not_applicable', 'eligible', 'processing', 'refunded', 'failed', 'not_eligible'));

-- Add refund tracking fields
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS refund_reason text,
ADD COLUMN IF NOT EXISTS stripe_refund_id text,
ADD COLUMN IF NOT EXISTS refunded_at timestamptz,
ADD COLUMN IF NOT EXISTS refund_amount integer;

-- Create index for refund queries
CREATE INDEX IF NOT EXISTS payments_refund_status_idx ON public.payments(refund_status);
CREATE INDEX IF NOT EXISTS payments_stripe_refund_id_idx ON public.payments(stripe_refund_id);

-- Add unique constraint on stripe_refund_id to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS payments_stripe_refund_id_unique 
ON public.payments(stripe_refund_id) WHERE stripe_refund_id IS NOT NULL;

COMMENT ON COLUMN public.payments.refund_status IS 'Refund eligibility and processing status';
COMMENT ON COLUMN public.payments.refund_reason IS 'Human-readable reason for refund decision';
COMMENT ON COLUMN public.payments.stripe_refund_id IS 'Stripe refund ID for idempotency checks';
COMMENT ON COLUMN public.payments.refunded_at IS 'Timestamp when refund was processed';
COMMENT ON COLUMN public.payments.refund_amount IS 'Amount refunded in cents';
