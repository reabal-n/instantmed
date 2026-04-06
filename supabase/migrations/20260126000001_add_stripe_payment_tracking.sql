-- Migration: Add Stripe payment tracking columns to intakes
-- P0 FIX: Enable refund traceability by storing payment_intent_id and customer_id

-- Add stripe_payment_intent_id column to intakes for refund traceability
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'intakes' 
    AND column_name = 'stripe_payment_intent_id'
  ) THEN
    ALTER TABLE public.intakes ADD COLUMN stripe_payment_intent_id TEXT;
  END IF;
END $$;

-- Add stripe_customer_id column to intakes for customer reference
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'intakes' 
    AND column_name = 'stripe_customer_id'
  ) THEN
    ALTER TABLE public.intakes ADD COLUMN stripe_customer_id TEXT;
  END IF;
END $$;

-- Add index for payment_intent_id lookups (used in refund processing)
CREATE INDEX IF NOT EXISTS idx_intakes_stripe_payment_intent 
  ON public.intakes(stripe_payment_intent_id) 
  WHERE stripe_payment_intent_id IS NOT NULL;

-- Add index for customer_id lookups (used in customer history queries)
CREATE INDEX IF NOT EXISTS idx_intakes_stripe_customer 
  ON public.intakes(stripe_customer_id) 
  WHERE stripe_customer_id IS NOT NULL;

COMMENT ON COLUMN public.intakes.stripe_payment_intent_id IS 'Stripe PaymentIntent ID for refund traceability';
COMMENT ON COLUMN public.intakes.stripe_customer_id IS 'Stripe Customer ID at time of payment';
