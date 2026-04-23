-- Restore app.e2e_reset bypass in validate_intake_status_transition.
-- Migration 20260419102642_allow_paid_to_awaiting_script.sql rewrote the
-- trigger function without the bypass that was added in
-- 20260402000003_add_e2e_intake_reset_rpc.sql, breaking e2e_reset_intake_status().

CREATE OR REPLACE FUNCTION public.validate_intake_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- E2E TEST BYPASS: service_role-only RPC sets this flag before force-updating status.
  IF current_setting('app.e2e_reset', TRUE) = 'true' THEN
    RETURN NEW;
  END IF;

  -- Allow initial creation
  IF TG_OP = 'INSERT' THEN
    IF NEW.status NOT IN ('pending_payment', 'draft') THEN
      RAISE EXCEPTION 'New intakes must start in pending_payment or draft status, got: %', NEW.status;
    END IF;
    RETURN NEW;
  END IF;

  -- Allow updates if status hasn't changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'draft' THEN
    IF NEW.status NOT IN ('pending_payment', 'expired') THEN
      RAISE EXCEPTION 'Invalid transition from draft to %', NEW.status;
    END IF;
  END IF;

  IF OLD.status = 'pending_payment' THEN
    IF NEW.status NOT IN ('paid', 'expired', 'pending_payment') THEN
      RAISE EXCEPTION 'Invalid transition from pending_payment to %', NEW.status;
    END IF;
  END IF;

  IF OLD.status = 'paid' THEN
    IF NEW.status NOT IN ('in_review', 'approved', 'awaiting_script', 'declined', 'pending_info', 'escalated') THEN
      RAISE EXCEPTION 'Invalid transition from paid to %', NEW.status;
    END IF;
  END IF;

  IF OLD.status = 'in_review' THEN
    IF NEW.status NOT IN ('approved', 'awaiting_script', 'declined', 'pending_info', 'escalated') THEN
      RAISE EXCEPTION 'Invalid transition from in_review to %', NEW.status;
    END IF;
  END IF;

  IF OLD.status = 'pending_info' THEN
    IF NEW.status NOT IN ('in_review', 'approved', 'declined') THEN
      RAISE EXCEPTION 'Invalid transition from pending_info to %', NEW.status;
    END IF;
  END IF;

  IF OLD.status = 'approved' THEN
    IF NEW.status NOT IN ('completed', 'awaiting_script') THEN
      RAISE EXCEPTION 'Cannot transition from approved to %', NEW.status;
    END IF;
  END IF;

  IF OLD.status = 'awaiting_script' THEN
    IF NEW.status NOT IN ('completed') THEN
      RAISE EXCEPTION 'Cannot transition from awaiting_script to %', NEW.status;
    END IF;
  END IF;

  IF OLD.status = 'escalated' THEN
    IF NEW.status NOT IN ('in_review', 'approved', 'declined') THEN
      RAISE EXCEPTION 'Cannot transition from escalated to %', NEW.status;
    END IF;
  END IF;

  IF OLD.status = 'declined' THEN
    RAISE EXCEPTION 'Cannot transition from terminal state declined to %', NEW.status;
  END IF;

  IF OLD.status = 'expired' THEN
    RAISE EXCEPTION 'Cannot transition from terminal state expired to %', NEW.status;
  END IF;

  IF OLD.status = 'completed' THEN
    RAISE EXCEPTION 'Cannot transition from terminal state completed to %', NEW.status;
  END IF;

  IF OLD.status = 'cancelled' THEN
    RAISE EXCEPTION 'Cannot transition from terminal state cancelled to %', NEW.status;
  END IF;

  RETURN NEW;
END;
$$;
