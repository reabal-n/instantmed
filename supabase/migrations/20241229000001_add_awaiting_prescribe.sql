-- Add awaiting_prescribe status for prescription workflow
-- This status is used when a doctor approves a prescription clinically but hasn't yet
-- entered the script in Parchment (external eScript system)

-- Step 1: Drop existing constraints
ALTER TABLE requests DROP CONSTRAINT IF EXISTS valid_status;

-- Step 2: Add new constraint with awaiting_prescribe
ALTER TABLE requests ADD CONSTRAINT valid_status
  CHECK (status IN ('pending_payment', 'pending', 'under_review', 'needs_follow_up', 'awaiting_prescribe', 'approved', 'declined'));

-- Step 3: Add parchment_reference and sent_via columns
ALTER TABLE requests 
  ADD COLUMN IF NOT EXISTS parchment_reference TEXT,
  ADD COLUMN IF NOT EXISTS sent_via TEXT CHECK (sent_via IS NULL OR sent_via IN ('parchment', 'paper'));

-- Step 4: Comment on new columns
COMMENT ON COLUMN requests.parchment_reference IS 'Reference ID from Parchment eScript system';
COMMENT ON COLUMN requests.sent_via IS 'How the prescription was sent: parchment (eScript) or paper';

-- Step 5: Update state machine trigger to handle awaiting_prescribe
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

  -- pending -> approved, declined, needs_follow_up, awaiting_prescribe
  IF OLD.status = 'pending' THEN
    IF NEW.status NOT IN ('approved', 'declined', 'needs_follow_up', 'under_review', 'awaiting_prescribe') THEN
      RAISE EXCEPTION 'Invalid transition from pending to %', NEW.status;
    END IF;

    -- Can only approve/awaiting_prescribe if payment_status is 'paid'
    IF NEW.status IN ('approved', 'awaiting_prescribe') AND NEW.payment_status != 'paid' THEN
      RAISE EXCEPTION 'Cannot approve request without confirmed payment';
    END IF;
  END IF;

  -- awaiting_prescribe -> approved (doctor marks eScript as sent)
  IF OLD.status = 'awaiting_prescribe' THEN
    IF NEW.status NOT IN ('approved') THEN
      RAISE EXCEPTION 'Invalid transition from awaiting_prescribe to %. Only approved is allowed.', NEW.status;
    END IF;
  END IF;

  -- needs_follow_up -> approved, declined, pending, awaiting_prescribe (after patient response)
  IF OLD.status = 'needs_follow_up' THEN
    IF NEW.status NOT IN ('approved', 'declined', 'pending', 'under_review', 'awaiting_prescribe') THEN
      RAISE EXCEPTION 'Invalid transition from needs_follow_up to %', NEW.status;
    END IF;

    -- Can only approve if payment_status is 'paid'
    IF NEW.status IN ('approved', 'awaiting_prescribe') AND NEW.payment_status != 'paid' THEN
      RAISE EXCEPTION 'Cannot approve request without confirmed payment';
    END IF;
  END IF;

  -- under_review -> approved, declined, needs_follow_up, awaiting_prescribe
  IF OLD.status = 'under_review' THEN
    IF NEW.status NOT IN ('approved', 'declined', 'needs_follow_up', 'awaiting_prescribe') THEN
      RAISE EXCEPTION 'Invalid transition from under_review to %', NEW.status;
    END IF;

    -- Can only approve if payment_status is 'paid'
    IF NEW.status IN ('approved', 'awaiting_prescribe') AND NEW.payment_status != 'paid' THEN
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

-- Step 6: Add index for awaiting_prescribe queries
CREATE INDEX IF NOT EXISTS idx_requests_awaiting_prescribe 
  ON requests(status, created_at DESC) 
  WHERE status = 'awaiting_prescribe';
