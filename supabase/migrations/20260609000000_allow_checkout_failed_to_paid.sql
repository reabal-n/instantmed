-- Allow checkout_failed → paid transition in the DB trigger.
--
-- A customer can have an intake marked checkout_failed (first Stripe session
-- expired or declined) and then successfully pay on a retry session. The
-- Stripe webhook fires checkout.session.completed and needs to move the
-- intake to paid. The trigger was blocking this, causing the webhook to
-- DLQ with "Invalid transition from checkout_failed to paid" and the intake
-- to remain stuck. Application-layer state machine (intake-lifecycle.ts)
-- already updated in the same commit.
--
-- Real incident: intake 543d26d6 stuck since 2026-05-29, customer paid $29.95
-- but never received their medical certificate.

CREATE OR REPLACE FUNCTION validate_intake_status_transition()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- E2E TEST BYPASS: service_role-only RPC sets this flag before force-updating status.
  IF current_setting('app.e2e_reset', TRUE) = 'true' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status NOT IN ('pending_payment', 'draft') THEN
      RAISE EXCEPTION 'New intakes must start in pending_payment or draft status, got: %', NEW.status;
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'draft' THEN
    IF NEW.status NOT IN ('pending_payment', 'cancelled') THEN
      RAISE EXCEPTION 'Invalid transition from draft to %', NEW.status;
    END IF;
  END IF;

  IF OLD.status = 'pending_payment' THEN
    IF NEW.status NOT IN ('paid', 'checkout_failed', 'cancelled', 'expired', 'pending_payment') THEN
      RAISE EXCEPTION 'Invalid transition from pending_payment to %', NEW.status;
    END IF;
  END IF;

  IF OLD.status = 'checkout_failed' THEN
    -- Allow direct paid transition: customer retried payment after a failed
    -- session and the new Stripe session completed successfully.
    IF NEW.status NOT IN ('pending_payment', 'paid', 'cancelled') THEN
      RAISE EXCEPTION 'Invalid transition from checkout_failed to %', NEW.status;
    END IF;
  END IF;

  IF OLD.status = 'paid' THEN
    IF NEW.status NOT IN ('in_review', 'approved', 'awaiting_script', 'declined', 'pending_info', 'escalated', 'cancelled') THEN
      RAISE EXCEPTION 'Invalid transition from paid to %', NEW.status;
    END IF;
  END IF;

  IF OLD.status = 'in_review' THEN
    IF NEW.status NOT IN ('approved', 'awaiting_script', 'declined', 'pending_info', 'escalated', 'cancelled') THEN
      RAISE EXCEPTION 'Invalid transition from in_review to %', NEW.status;
    END IF;
  END IF;

  IF OLD.status = 'pending_info' THEN
    IF NEW.status NOT IN ('in_review', 'paid', 'declined', 'cancelled', 'expired') THEN
      RAISE EXCEPTION 'Invalid transition from pending_info to %', NEW.status;
    END IF;
  END IF;

  IF OLD.status = 'approved' THEN
    IF NEW.status NOT IN ('completed', 'awaiting_script', 'cancelled') THEN
      RAISE EXCEPTION 'Cannot transition from approved to %', NEW.status;
    END IF;
  END IF;

  IF OLD.status = 'awaiting_script' THEN
    -- App decline action already allows awaiting_script when the doctor decides
    -- a queued prescription cannot be safely issued after review.
    IF NEW.status NOT IN ('completed', 'declined', 'cancelled') THEN
      RAISE EXCEPTION 'Cannot transition from awaiting_script to %', NEW.status;
    END IF;
  END IF;

  IF OLD.status = 'escalated' THEN
    IF NEW.status NOT IN ('in_review', 'approved', 'declined', 'cancelled') THEN
      RAISE EXCEPTION 'Cannot transition from escalated to %', NEW.status;
    END IF;
  END IF;

  IF OLD.status IN ('declined', 'expired', 'completed', 'cancelled') THEN
    RAISE EXCEPTION 'Cannot transition from terminal state % to %', OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END;
$$;
