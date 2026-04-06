-- Fix payment_status CHECK constraint to include all values the application writes
-- The original constraint only allowed: 'unpaid', 'pending', 'paid', 'refunded', 'failed'
-- But the application also writes: 'disputed', 'partially_refunded', 'refund_processing', 'refund_failed'
-- This caused constraint violations when processing disputes, refunds, etc.

-- Drop the old CHECK constraint
ALTER TABLE public.intakes
  DROP CONSTRAINT IF EXISTS intakes_payment_status_check;

-- Add the expanded CHECK constraint with all valid statuses
ALTER TABLE public.intakes
  ADD CONSTRAINT intakes_payment_status_check
  CHECK (payment_status IN (
    'unpaid',
    'pending',
    'paid',
    'refunded',
    'failed',
    'disputed',
    'partially_refunded',
    'refund_processing',
    'refund_failed'
  ));

-- Also fix email_outbox status CHECK constraint to allow delivery tracking values
-- The webhook handler maps 'delivered' -> 'sent' and 'bounced' -> 'failed' now,
-- but ensure the delivery_status column (if it has a constraint) allows those values
