-- Add checkout_error column to intakes for soft-delete audit trail
-- This stores the error message when checkout session creation fails

ALTER TABLE intakes ADD COLUMN IF NOT EXISTS checkout_error TEXT;

COMMENT ON COLUMN intakes.checkout_error IS 
  'Error message from Stripe when checkout session creation fails - preserves audit trail';

-- Add checkout_failed to status enum if not exists
-- (Note: If enum already has this value, this will be a no-op)
DO $$
BEGIN
  ALTER TYPE intake_status ADD VALUE IF NOT EXISTS 'checkout_failed';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
