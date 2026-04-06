-- State Machine Enforcement at Database Level
-- This migration adds database-level constraints to enforce valid request state transitions

-- Create a function to validate state transitions
CREATE OR REPLACE FUNCTION validate_request_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow initial creation
  IF TG_OP = 'INSERT' THEN
    -- New requests must start in pending_payment or pending status
    IF NEW.status NOT IN ('pending_payment', 'pending') THEN
      RAISE EXCEPTION 'New requests must start in pending_payment or pending status, got: %', NEW.status;
    END IF;
    RETURN NEW;
  END IF;

  -- Allow updates if status hasn't changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Define valid state transitions
  -- pending_payment -> (payment fails/expires, stays pending_payment or can be manually deleted)
  -- pending_payment -> pending (after payment)
  IF OLD.status = 'pending_payment' THEN
    IF NEW.status NOT IN ('pending', 'pending_payment') THEN
      RAISE EXCEPTION 'Invalid transition from pending_payment to %', NEW.status;
    END IF;
  END IF;

  -- pending -> approved, declined, needs_follow_up
  IF OLD.status = 'pending' THEN
    IF NEW.status NOT IN ('approved', 'declined', 'needs_follow_up', 'under_review') THEN
      RAISE EXCEPTION 'Invalid transition from pending to %', NEW.status;
    END IF;

    -- Can only approve if payment_status is 'paid'
    IF NEW.status = 'approved' AND NEW.payment_status != 'paid' THEN
      RAISE EXCEPTION 'Cannot approve request without confirmed payment';
    END IF;
  END IF;

  -- needs_follow_up -> approved, declined, pending (after patient response)
  IF OLD.status = 'needs_follow_up' THEN
    IF NEW.status NOT IN ('approved', 'declined', 'pending', 'under_review') THEN
      RAISE EXCEPTION 'Invalid transition from needs_follow_up to %', NEW.status;
    END IF;

    -- Can only approve if payment_status is 'paid'
    IF NEW.status = 'approved' AND NEW.payment_status != 'paid' THEN
      RAISE EXCEPTION 'Cannot approve request without confirmed payment';
    END IF;
  END IF;

  -- under_review -> approved, declined, needs_follow_up
  IF OLD.status = 'under_review' THEN
    IF NEW.status NOT IN ('approved', 'declined', 'needs_follow_up') THEN
      RAISE EXCEPTION 'Invalid transition from under_review to %', NEW.status;
    END IF;

    -- Can only approve if payment_status is 'paid'
    IF NEW.status = 'approved' AND NEW.payment_status != 'paid' THEN
      RAISE EXCEPTION 'Cannot approve request without confirmed payment';
    END IF;
  END IF;

  -- approved and declined are terminal states - no transitions allowed
  IF OLD.status IN ('approved', 'declined') THEN
    RAISE EXCEPTION 'Cannot transition from terminal state % to %', OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS enforce_request_status_transitions ON requests;

-- Create the trigger
CREATE TRIGGER enforce_request_status_transitions
  BEFORE INSERT OR UPDATE OF status
  ON requests
  FOR EACH ROW
  EXECUTE FUNCTION validate_request_status_transition();

-- Add a check constraint for payment_status values
ALTER TABLE requests DROP CONSTRAINT IF EXISTS valid_payment_status;
ALTER TABLE requests ADD CONSTRAINT valid_payment_status
  CHECK (payment_status IN ('pending_payment', 'paid', 'failed', 'refunded', 'expired'));

-- Add a check constraint for status values
ALTER TABLE requests DROP CONSTRAINT IF EXISTS valid_status;
ALTER TABLE requests ADD CONSTRAINT valid_status
  CHECK (status IN ('pending_payment', 'pending', 'under_review', 'needs_follow_up', 'approved', 'declined'));

-- Add index on status and payment_status for better query performance
CREATE INDEX IF NOT EXISTS idx_requests_status_payment ON requests(status, payment_status);

-- Add index for common doctor queue queries
CREATE INDEX IF NOT EXISTS idx_requests_paid_created ON requests(payment_status, created_at DESC)
  WHERE payment_status = 'paid';
