-- Fix 1: Drop the OLD payment_status CHECK constraint that conflicts with the new one.
-- The migration 20250118000003 created 'valid_intake_payment_status' with a limited set.
-- The migration 20260212000001 created 'intakes_payment_status_check' with the expanded set.
-- Both constraints must pass simultaneously, blocking statuses like 'disputed', 'partially_refunded', etc.
-- Solution: Drop the old one and add 'expired' to the new one (it was in the old but missing from the new).

ALTER TABLE public.intakes DROP CONSTRAINT IF EXISTS valid_intake_payment_status;

-- Also recreate the new constraint to include 'expired' (was in old constraint but missing from new)
ALTER TABLE public.intakes DROP CONSTRAINT IF EXISTS intakes_payment_status_check;
ALTER TABLE public.intakes
  ADD CONSTRAINT intakes_payment_status_check
  CHECK (payment_status IN (
    'unpaid',
    'pending',
    'paid',
    'refunded',
    'failed',
    'expired',
    'disputed',
    'partially_refunded',
    'refund_processing',
    'refund_failed'
  ));

-- Fix 2: Update the state machine trigger to allow pending_payment -> checkout_failed.
-- Currently, when Stripe checkout session creation fails, the code tries to set
-- status = 'checkout_failed' to preserve audit trail, but the trigger blocks it.
CREATE OR REPLACE FUNCTION validate_intake_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow setting same status (idempotent updates)
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- draft -> pending_payment (after intake submission)
  IF OLD.status = 'draft' THEN
    IF NEW.status NOT IN ('pending_payment', 'cancelled') THEN
      RAISE EXCEPTION 'Invalid transition from draft to %', NEW.status;
    END IF;
  END IF;

  -- pending_payment -> paid, expired, checkout_failed
  IF OLD.status = 'pending_payment' THEN
    IF NEW.status NOT IN ('paid', 'expired', 'pending_payment', 'checkout_failed') THEN
      RAISE EXCEPTION 'Invalid transition from pending_payment to %', NEW.status;
    END IF;
  END IF;

  -- paid -> in_review, approved, declined, pending_info, escalated
  IF OLD.status = 'paid' THEN
    IF NEW.status NOT IN ('in_review', 'approved', 'declined', 'pending_info', 'escalated') THEN
      RAISE EXCEPTION 'Invalid transition from paid to %', NEW.status;
    END IF;
  END IF;

  -- in_review -> approved, declined, pending_info, escalated
  IF OLD.status = 'in_review' THEN
    IF NEW.status NOT IN ('approved', 'declined', 'pending_info', 'escalated') THEN
      RAISE EXCEPTION 'Invalid transition from in_review to %', NEW.status;
    END IF;
  END IF;

  -- pending_info -> in_review, approved, declined
  IF OLD.status = 'pending_info' THEN
    IF NEW.status NOT IN ('in_review', 'approved', 'declined') THEN
      RAISE EXCEPTION 'Invalid transition from pending_info to %', NEW.status;
    END IF;
  END IF;

  -- approved -> completed
  IF OLD.status = 'approved' THEN
    IF NEW.status NOT IN ('completed') THEN
      RAISE EXCEPTION 'Invalid transition from approved to %', NEW.status;
    END IF;
  END IF;

  -- escalated -> in_review, approved, declined
  IF OLD.status = 'escalated' THEN
    IF NEW.status NOT IN ('in_review', 'approved', 'declined') THEN
      RAISE EXCEPTION 'Invalid transition from escalated to %', NEW.status;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
