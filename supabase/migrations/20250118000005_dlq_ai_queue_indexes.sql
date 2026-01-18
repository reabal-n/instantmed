-- ============================================================================
-- DLQ AND AI QUEUE PERFORMANCE INDEXES
-- Migration: 20250118000005
-- Purpose: Add missing indexes for dead letter queue and AI draft retry queue
-- ============================================================================

-- Stripe webhook dead letter queue indexes
-- Used by dlq-monitor cron job and manual resolution queries
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_dlq_intake 
ON stripe_webhook_dead_letter(intake_id) WHERE intake_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_dlq_unresolved 
ON stripe_webhook_dead_letter(created_at) WHERE resolved_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_dlq_event_id
ON stripe_webhook_dead_letter(event_id);

-- AI draft retry queue indexes
-- Used by retry-drafts cron job
CREATE INDEX IF NOT EXISTS idx_ai_draft_retry_pending
ON ai_draft_retry_queue(next_retry_at) 
WHERE completed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_ai_draft_retry_intake
ON ai_draft_retry_queue(intake_id);

-- Stripe webhook events - improve idempotency check performance
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_event_id
ON stripe_webhook_events(event_id);
