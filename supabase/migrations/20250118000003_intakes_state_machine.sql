-- ============================================
-- INTAKES STATE MACHINE CONSTRAINTS
-- Generated: 2025-01-18
-- Purpose: Enforce valid state transitions on intakes table
-- ============================================

-- Create a function to validate intake status transitions
CREATE OR REPLACE FUNCTION validate_intake_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow initial creation
  IF TG_OP = 'INSERT' THEN
    -- New intakes must start in pending_payment or draft status
    IF NEW.status NOT IN ('pending_payment', 'draft') THEN
      RAISE EXCEPTION 'New intakes must start in pending_payment or draft status, got: %', NEW.status;
    END IF;
    RETURN NEW;
  END IF;

  -- Allow updates if status hasn't changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Define valid state transitions
  
  -- draft -> pending_payment (form completed, ready for checkout)
  IF OLD.status = 'draft' THEN
    IF NEW.status NOT IN ('pending_payment', 'expired') THEN
      RAISE EXCEPTION 'Invalid transition from draft to %', NEW.status;
    END IF;
  END IF;

  -- pending_payment -> paid (after successful payment)
  -- pending_payment -> expired (checkout session expired)
  IF OLD.status = 'pending_payment' THEN
    IF NEW.status NOT IN ('paid', 'expired', 'pending_payment') THEN
      RAISE EXCEPTION 'Invalid transition from pending_payment to %', NEW.status;
    END IF;
  END IF;

  -- paid -> in_review, approved, declined, pending_info, escalated (doctor actions)
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

  -- pending_info -> in_review, approved, declined (after patient response)
  IF OLD.status = 'pending_info' THEN
    IF NEW.status NOT IN ('in_review', 'approved', 'declined') THEN
      RAISE EXCEPTION 'Invalid transition from pending_info to %', NEW.status;
    END IF;
  END IF;

  -- approved -> completed (after document sent)
  IF OLD.status = 'approved' THEN
    IF NEW.status NOT IN ('completed') THEN
      RAISE EXCEPTION 'Cannot transition from approved to %', NEW.status;
    END IF;
  END IF;

  IF OLD.status = 'declined' THEN
    RAISE EXCEPTION 'Cannot transition from terminal state declined to %', NEW.status;
  END IF;

  -- expired is terminal
  IF OLD.status = 'expired' THEN
    RAISE EXCEPTION 'Cannot transition from terminal state expired to %', NEW.status;
  END IF;

  -- completed is terminal
  IF OLD.status = 'completed' THEN
    RAISE EXCEPTION 'Cannot transition from terminal state completed to %', NEW.status;
  END IF;

  -- cancelled is terminal
  IF OLD.status = 'cancelled' THEN
    RAISE EXCEPTION 'Cannot transition from terminal state cancelled to %', NEW.status;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS enforce_intake_status_transitions ON intakes;

-- Create the trigger
CREATE TRIGGER enforce_intake_status_transitions
  BEFORE INSERT OR UPDATE OF status
  ON intakes
  FOR EACH ROW
  EXECUTE FUNCTION validate_intake_status_transition();

-- Note: Check constraint not needed as status column uses intake_status enum type
-- The enum already enforces valid values: draft, pending_payment, paid, in_review, 
-- pending_info, approved, declined, escalated, completed, cancelled, expired

-- Add check constraint for valid payment_status values (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'valid_intake_payment_status'
  ) THEN
    ALTER TABLE intakes ADD CONSTRAINT valid_intake_payment_status
      CHECK (payment_status IN ('pending', 'unpaid', 'paid', 'failed', 'refunded', 'expired'));
  END IF;
END $$;

-- ============================================
-- PERFORMANCE INDEXES
-- ============================================

-- Index on patient_id for dashboard queries
CREATE INDEX IF NOT EXISTS idx_intakes_patient_id ON intakes(patient_id);

-- Index on status for doctor queue
CREATE INDEX IF NOT EXISTS idx_intakes_status ON intakes(status);

-- Composite index for paid intakes queue (most common doctor query)
CREATE INDEX IF NOT EXISTS idx_intakes_paid_queue ON intakes(status, created_at DESC)
  WHERE status = 'paid';

-- Index for patient + status (patient dashboard filtering)
CREATE INDEX IF NOT EXISTS idx_intakes_patient_status ON intakes(patient_id, status);
