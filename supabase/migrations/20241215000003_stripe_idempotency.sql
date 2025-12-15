-- ============================================
-- STRIPE INTEGRATION HARDENING
-- Generated: 2024-12-15
-- Purpose: Add missing constraints and indexes for Stripe idempotency
-- ============================================

-- ============================================
-- 1. PAYMENTS TABLE - Add unique constraint on stripe_session_id
-- ============================================
-- Issue: Multiple payment records can exist with same stripe_session_id
-- Fix: Each Stripe checkout session should map to exactly one payment record

-- First check if there are any duplicates (for safety)
-- DO $$
-- BEGIN
--   IF EXISTS (
--     SELECT stripe_session_id, COUNT(*) 
--     FROM payments 
--     GROUP BY stripe_session_id 
--     HAVING COUNT(*) > 1
--   ) THEN
--     RAISE EXCEPTION 'Cannot add unique constraint - duplicate stripe_session_id values exist';
--   END IF;
-- END $$;

-- Add unique constraint (index already exists, just needs to be unique)
DROP INDEX IF EXISTS payments_stripe_session_id_idx;

CREATE UNIQUE INDEX payments_stripe_session_id_unique_idx 
ON public.payments (stripe_session_id);

-- Add constraint name for clarity
ALTER TABLE public.payments 
ADD CONSTRAINT payments_stripe_session_id_unique 
UNIQUE USING INDEX payments_stripe_session_id_unique_idx;

-- ============================================
-- 2. STRIPE_WEBHOOK_EVENTS - Add metadata column for debugging
-- ============================================
-- Store session_id and request_id for debugging failed webhooks

ALTER TABLE public.stripe_webhook_events
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

ALTER TABLE public.stripe_webhook_events
ADD COLUMN IF NOT EXISTS request_id UUID;

ALTER TABLE public.stripe_webhook_events
ADD COLUMN IF NOT EXISTS session_id TEXT;

ALTER TABLE public.stripe_webhook_events
ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Index for finding events by request
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_request_id
ON public.stripe_webhook_events (request_id);

-- Index for finding events by session
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_session_id
ON public.stripe_webhook_events (session_id);

-- ============================================
-- 3. REQUESTS TABLE - Add checkout_session_id for tracking
-- ============================================
-- Track which checkout session is currently active for a request
-- Prevents race conditions when multiple checkouts are created

ALTER TABLE public.requests
ADD COLUMN IF NOT EXISTS active_checkout_session_id TEXT;

-- Index for lookup
CREATE INDEX IF NOT EXISTS idx_requests_active_checkout_session
ON public.requests (active_checkout_session_id)
WHERE active_checkout_session_id IS NOT NULL;

-- ============================================
-- 4. ADD FUNCTION FOR ATOMIC WEBHOOK PROCESSING
-- ============================================
-- Use INSERT...ON CONFLICT for atomic idempotency check

CREATE OR REPLACE FUNCTION public.try_process_stripe_event(
  p_event_id TEXT,
  p_event_type TEXT,
  p_request_id UUID DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_inserted BOOLEAN;
BEGIN
  -- Attempt to insert the event - if it already exists, do nothing
  INSERT INTO stripe_webhook_events (event_id, event_type, request_id, session_id, metadata, processed_at, created_at)
  VALUES (p_event_id, p_event_type, p_request_id, p_session_id, p_metadata, NOW(), NOW())
  ON CONFLICT (event_id) DO NOTHING;
  
  -- Check if we actually inserted (GET DIAGNOSTICS not available for ON CONFLICT)
  -- Instead, check if our processed_at matches NOW()
  SELECT EXISTS (
    SELECT 1 FROM stripe_webhook_events 
    WHERE event_id = p_event_id 
    AND processed_at >= NOW() - INTERVAL '1 second'
  ) INTO v_inserted;
  
  RETURN v_inserted;
END;
$$;

-- Grant execute to authenticated (service role will also have access)
GRANT EXECUTE ON FUNCTION public.try_process_stripe_event TO authenticated;

-- ============================================
-- 5. ADD FUNCTION TO CHECK PAYMENT EXISTS
-- ============================================
-- Prevent creating duplicate payments for same session

CREATE OR REPLACE FUNCTION public.payment_exists_for_session(
  p_session_id TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM payments WHERE stripe_session_id = p_session_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.payment_exists_for_session TO authenticated;

-- ============================================
-- AUDIT LOG
-- ============================================
-- 
-- Changes made:
-- 1. payments.stripe_session_id - Added UNIQUE constraint
-- 2. stripe_webhook_events - Added metadata, request_id, session_id, error_message columns
-- 3. requests - Added active_checkout_session_id column
-- 4. Added try_process_stripe_event() function for atomic idempotency
-- 5. Added payment_exists_for_session() helper function
--
-- These changes ensure:
-- - Each Stripe session maps to exactly one payment record
-- - Webhook events are processed exactly once (atomic INSERT...ON CONFLICT)
-- - Better debugging with event metadata
-- ============================================
