-- ============================================
-- MIGRATION: Add explicit refund tracking fields
-- ============================================
-- 
-- Purpose: Enable consistent tracking of refund status separate from payment_status
-- This allows for better reconciliation and audit trail of refund operations.
--
-- Fields added:
-- - refund_status: explicit status of refund attempt
-- - refund_error: error message if refund failed
-- - refund_stripe_id: Stripe refund ID for traceability
-- - refunded_at: timestamp when refund completed
-- - refunded_by: who initiated the refund

-- ============================================
-- 1. ADD REFUND STATUS ENUM
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'refund_status') THEN
    CREATE TYPE refund_status AS ENUM (
      'not_applicable',  -- No refund needed (e.g., approved, not paid)
      'not_eligible',    -- Category not eligible for refund
      'pending',         -- Refund initiated, awaiting Stripe
      'succeeded',       -- Refund completed successfully
      'failed',          -- Refund attempt failed
      'skipped_e2e'      -- Skipped in E2E test mode
    );
  END IF;
END$$;

-- ============================================
-- 2. ADD REFUND TRACKING COLUMNS TO INTAKES
-- ============================================

ALTER TABLE public.intakes
ADD COLUMN IF NOT EXISTS refund_status refund_status DEFAULT 'not_applicable';

ALTER TABLE public.intakes
ADD COLUMN IF NOT EXISTS refund_error TEXT;

ALTER TABLE public.intakes
ADD COLUMN IF NOT EXISTS refund_stripe_id TEXT;

-- refunded_at and refunded_by may already exist, add if not
ALTER TABLE public.intakes
ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ;

ALTER TABLE public.intakes
ADD COLUMN IF NOT EXISTS refunded_by UUID REFERENCES public.profiles(id);

-- ============================================
-- 3. ADD INDEX FOR REFUND RECONCILIATION
-- ============================================

CREATE INDEX IF NOT EXISTS idx_intakes_refund_status 
ON public.intakes(refund_status) 
WHERE refund_status IN ('pending', 'failed');

-- Index for finding intakes with failed refunds for reconciliation
CREATE INDEX IF NOT EXISTS idx_intakes_refund_failed
ON public.intakes(refund_status, declined_at)
WHERE refund_status = 'failed';

-- ============================================
-- 4. COMMENT ON COLUMNS
-- ============================================

COMMENT ON COLUMN public.intakes.refund_status IS 'Explicit refund status: not_applicable, not_eligible, pending, succeeded, failed, skipped_e2e';
COMMENT ON COLUMN public.intakes.refund_error IS 'Error message if refund failed (for debugging)';
COMMENT ON COLUMN public.intakes.refund_stripe_id IS 'Stripe refund ID for traceability';
COMMENT ON COLUMN public.intakes.refunded_at IS 'Timestamp when refund was completed';
COMMENT ON COLUMN public.intakes.refunded_by IS 'Profile ID of who initiated the refund';

-- ============================================
-- 5. MIGRATION COMPLETE
-- ============================================
-- 
-- New fields added to intakes:
-- - refund_status (enum)
-- - refund_error (text)
-- - refund_stripe_id (text)
-- - refunded_at (timestamptz) - may already exist
-- - refunded_by (uuid) - may already exist
--
-- Indexes added for reconciliation queries
