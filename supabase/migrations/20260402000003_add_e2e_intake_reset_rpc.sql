-- ============================================================================
-- E2E TEST: Add intake status force-reset RPC for test infrastructure
--
-- The validate_intake_status_transition trigger blocks terminal-state resets
-- (e.g., cancelled → paid, approved → paid). This breaks E2E test cleanup
-- because the test intake can't be returned to "paid" without going through
-- the state machine.
--
-- Fix: add a transaction-local bypass flag to the trigger, and an RPC that
-- sets the flag and does the force-reset. The flag expires at transaction end.
--
-- SECURITY: The RPC is granted only to service_role (test infrastructure).
--           authenticated and anon roles cannot call it.
--           current_setting('app.e2e_reset', TRUE) is transaction-local —
--           no cross-request contamination is possible.
-- ============================================================================

-- Modify the status transition trigger to honour the E2E bypass flag
CREATE OR REPLACE FUNCTION public.validate_intake_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  valid_transitions jsonb := '{
    "draft": ["pending_payment", "cancelled"],
    "pending_payment": ["paid", "checkout_failed", "cancelled", "expired"],
    "checkout_failed": ["pending_payment", "cancelled"],
    "paid": ["in_review", "approved", "cancelled"],
    "in_review": ["approved", "declined", "pending_info", "escalated", "cancelled"],
    "pending_info": ["in_review", "paid", "cancelled", "expired"],
    "approved": ["completed", "awaiting_script", "cancelled"],
    "awaiting_script": ["completed", "cancelled"],
    "escalated": ["in_review", "declined", "cancelled"],
    "declined": [],
    "completed": [],
    "cancelled": [],
    "expired": []
  }'::jsonb;
  valid_initial_states jsonb := '["draft", "pending_payment"]'::jsonb;
  allowed_next jsonb;
  old_status TEXT;
  new_status TEXT;
BEGIN
  -- E2E TEST BYPASS: Skip validation when the transaction-local flag is set.
  -- Only reachable via e2e_reset_intake_status() which is service_role-only.
  IF current_setting('app.e2e_reset', TRUE) = 'true' THEN
    RETURN NEW;
  END IF;

  -- On INSERT, OLD is NULL — validate the initial status instead
  IF TG_OP = 'INSERT' THEN
    new_status := NEW.status::TEXT;
    IF NOT valid_initial_states ? new_status THEN
      RAISE EXCEPTION 'Invalid initial status: %. Must be draft or pending_payment.', new_status;
    END IF;
    RETURN NEW;
  END IF;

  -- Cast enum values to TEXT for JSONB operations
  old_status := OLD.status::TEXT;
  new_status := NEW.status::TEXT;

  -- Skip validation if status hasn't changed
  IF old_status = new_status THEN
    RETURN NEW;
  END IF;

  allowed_next := valid_transitions -> old_status;

  IF allowed_next IS NULL OR NOT allowed_next ? new_status THEN
    RAISE EXCEPTION 'Invalid status transition from % to %', old_status, new_status;
  END IF;

  RETURN NEW;
END;
$function$;

-- ============================================================================
-- E2E force-reset RPC
-- ============================================================================
CREATE OR REPLACE FUNCTION public.e2e_reset_intake_status(
  p_intake_id UUID,
  p_status TEXT DEFAULT 'paid'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Set transaction-local bypass so the trigger allows any status transition
  PERFORM set_config('app.e2e_reset', 'true', TRUE);

  UPDATE public.intakes
  SET
    status     = p_status::intake_status,
    claimed_by = NULL,
    claimed_at = NULL,
    updated_at = NOW()
  WHERE id = p_intake_id;

  -- Clear flag (expires at transaction end regardless, but explicit is cleaner)
  PERFORM set_config('app.e2e_reset', 'false', TRUE);
END;
$$;

-- SECURITY: service_role only
GRANT EXECUTE ON FUNCTION public.e2e_reset_intake_status TO service_role;
REVOKE EXECUTE ON FUNCTION public.e2e_reset_intake_status FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.e2e_reset_intake_status FROM authenticated;

COMMENT ON FUNCTION public.e2e_reset_intake_status IS
'E2E TEST ONLY: Force-reset intake to any status, bypassing the state machine trigger.
Uses a transaction-local flag (app.e2e_reset) to bypass validate_intake_status_transition.
SECURITY: service_role-only. Flag expires at transaction end — no cross-request leakage.';

-- Audit log
INSERT INTO public.audit_logs (action, actor_type, metadata, created_at)
VALUES (
  'settings_changed',
  'system',
  jsonb_build_object(
    'settingType', 'e2e_intake_reset_rpc',
    'changes', ARRAY[
      'validate_intake_status_transition: added app.e2e_reset bypass',
      'e2e_reset_intake_status: new RPC for test infrastructure'
    ],
    'reason', 'E2E test cleanup blocked by status transition trigger on terminal states'
  ),
  NOW()
);
