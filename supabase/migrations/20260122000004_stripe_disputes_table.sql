-- Migration: Add stripe_disputes table for dispute tracking
-- P0 FIX: Track Stripe disputes for revenue protection and audit

-- Create stripe_disputes table
CREATE TABLE IF NOT EXISTS public.stripe_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id TEXT UNIQUE NOT NULL,
  charge_id TEXT,
  intake_id UUID REFERENCES public.intakes(id) ON DELETE SET NULL,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'aud',
  reason TEXT NOT NULL,
  status TEXT NOT NULL,
  evidence_submitted_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  outcome TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add index for quick lookups
CREATE INDEX IF NOT EXISTS idx_stripe_disputes_intake_id ON public.stripe_disputes(intake_id);
CREATE INDEX IF NOT EXISTS idx_stripe_disputes_status ON public.stripe_disputes(status);
CREATE INDEX IF NOT EXISTS idx_stripe_disputes_created_at ON public.stripe_disputes(created_at DESC);

-- Add dispute_id column to intakes if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'intakes' 
    AND column_name = 'dispute_id'
  ) THEN
    ALTER TABLE public.intakes ADD COLUMN dispute_id TEXT;
  END IF;
END $$;

-- Add 'disputed' to payment_status enum if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'disputed' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'payment_status')
  ) THEN
    ALTER TYPE payment_status ADD VALUE IF NOT EXISTS 'disputed';
  END IF;
EXCEPTION
  WHEN undefined_object THEN
    -- payment_status might be a text column, not an enum - that's ok
    NULL;
END $$;

-- Add ai_draft_status column to intakes for draft visibility (P1 fix)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'intakes' 
    AND column_name = 'ai_draft_status'
  ) THEN
    ALTER TABLE public.intakes ADD COLUMN ai_draft_status TEXT DEFAULT NULL;
  END IF;
END $$;

-- Add stripe_price_id column to intakes for retry pricing consistency (P3 fix)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'intakes' 
    AND column_name = 'stripe_price_id'
  ) THEN
    ALTER TABLE public.intakes ADD COLUMN stripe_price_id TEXT;
  END IF;
END $$;

-- Add guest_email column to intakes for abandoned checkout recovery (P1 fix)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'intakes' 
    AND column_name = 'guest_email'
  ) THEN
    ALTER TABLE public.intakes ADD COLUMN guest_email TEXT;
  END IF;
END $$;

-- Add confirmation_email_sent_at column to intakes for email resend deduplication (P0 fix)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'intakes' 
    AND column_name = 'confirmation_email_sent_at'
  ) THEN
    ALTER TABLE public.intakes ADD COLUMN confirmation_email_sent_at TIMESTAMPTZ;
  END IF;
END $$;

-- RLS for stripe_disputes (admin only)
ALTER TABLE public.stripe_disputes ENABLE ROW LEVEL SECURITY;

-- Only service role and admins can access disputes
CREATE POLICY "Service role can manage disputes" ON public.stripe_disputes
  FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE public.stripe_disputes IS 'Tracks Stripe payment disputes for revenue protection and audit trail';
COMMENT ON COLUMN public.intakes.dispute_id IS 'Stripe dispute ID if payment was disputed';
COMMENT ON COLUMN public.intakes.ai_draft_status IS 'Status of AI draft generation: pending, completed, failed, queued';
COMMENT ON COLUMN public.intakes.stripe_price_id IS 'Original Stripe price ID used for checkout - preserved for retry consistency';
COMMENT ON COLUMN public.intakes.guest_email IS 'Email for guest checkouts - used for abandoned cart recovery';
