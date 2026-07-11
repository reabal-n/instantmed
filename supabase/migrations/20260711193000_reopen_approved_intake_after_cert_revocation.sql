-- Widen the guarded approved -> in_review reversal to the real safety invariant:
-- the issued certificate has been revoked.
--
-- 20260711071506 first cracked `approved` (otherwise one-way) to let a doctor
-- reopen an AI-approved med cert during batch review, but guarded it on the
-- batch-review receipt (ai_approved + batch_reviewed_at/by + a revoked cert).
-- That over-constrained the exception and broke the 30s approval-undo path:
--   * undo applies to MANUAL approvals too (ai_approved = false), and
--   * undo is not a batch review, so it never stamps batch_reviewed_at/by.
-- The undo revokes the certificate, then its status flip to in_review was
-- rejected by this trigger and swallowed — leaving the patient with a revoked
-- certificate and an intake stuck in `approved` that no queue surfaces.
--
-- The property that actually makes reopening safe is simply that no live
-- certificate is dangling, i.e. the cert is revoked. Both legitimate reversals
-- (batch-review revoke and approval-undo) revoke the certificate first, so gate
-- the reopen on exactly that. Ordinary callers still cannot move approved work
-- backwards (they have no revoked certificate). The batch-review action keeps
-- stamping its receipt in the same update; the trigger no longer requires it.

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
      -- Guarded reversal: only when the issued certificate has been revoked, so
      -- no live document is dangling. Covers both batch-review revocation and
      -- the 30s approval undo (manual or AI approval); ordinary callers have no
      -- revoked certificate and still cannot move approved work backwards.
      IF NOT EXISTS (
        SELECT 1
        FROM public.issued_certificates certificate
        WHERE certificate.intake_id = OLD.id
          AND certificate.status = 'revoked'
      ) THEN
        RAISE EXCEPTION 'Cannot reopen approved intake without a revoked certificate';
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
  'Validates intake lifecycle transitions. approved to in_review is permitted only after the issued certificate is revoked (batch-review revocation or the 30s approval undo); ordinary callers cannot move approved work backwards.';
