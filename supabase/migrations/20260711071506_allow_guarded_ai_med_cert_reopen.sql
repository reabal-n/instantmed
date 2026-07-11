-- Allow one narrowly guarded reversal for post-auto-approval oversight.
--
-- A doctor may revoke an issued AI-approved medical certificate during the
-- required individual batch review. That outcome must return the intake to
-- manual review, but the generic state machine intentionally treats approved
-- as one-way. Keep the exception inside the trigger and require all of the
-- clinical receipt fields plus a revoked certificate row; ordinary callers
-- still cannot move approved work backwards.

CREATE OR REPLACE FUNCTION public.validate_intake_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
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
    IF NEW.status = 'in_review' THEN
      IF OLD.ai_approved IS NOT TRUE
        OR NEW.batch_reviewed_at IS NULL
        OR NEW.batch_reviewed_by IS NULL
        OR NOT EXISTS (
          SELECT 1
          FROM public.issued_certificates certificate
          WHERE certificate.intake_id = OLD.id
            AND certificate.status = 'revoked'
        )
      THEN
        RAISE EXCEPTION 'Cannot reopen approved intake without a revoked AI-approved certificate and batch-review receipt';
      END IF;
    ELSIF NEW.status NOT IN ('completed', 'awaiting_script', 'cancelled') THEN
      RAISE EXCEPTION 'Cannot transition from approved to %', NEW.status;
    END IF;
  END IF;

  IF OLD.status = 'awaiting_script' THEN
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

COMMENT ON FUNCTION public.validate_intake_status_transition() IS
  'Validates intake lifecycle transitions. approved to in_review is permitted only after an AI-approved certificate is revoked and the individual batch-review receipt is stamped.';
