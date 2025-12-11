-- Add idempotency table for Stripe webhook events
-- This prevents duplicate processing of the same webhook event

CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookups by event_id
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_event_id ON stripe_webhook_events(event_id);

-- Add amount_paid column to payments table for audit trail
ALTER TABLE payments ADD COLUMN IF NOT EXISTS amount_paid INTEGER;

-- RLS: Only service role can access this table (used in webhook)
ALTER TABLE stripe_webhook_events ENABLE ROW LEVEL SECURITY;

-- No policies needed - service role bypasses RLS
