-- Keep the service-role-only E2E reset helper from leaving terminal timestamp
-- fields stale when test intakes are moved into or out of terminal statuses.

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
  -- Set transaction-local bypass so the trigger allows any status transition.
  -- This function remains service_role-only.
  PERFORM set_config('app.e2e_reset', 'true', TRUE);

  UPDATE public.intakes
  SET
    status = p_status::intake_status,
    claimed_by = NULL,
    claimed_at = NULL,
    approved_at = CASE
      WHEN p_status IN ('paid', 'in_review', 'pending_info', 'awaiting_script', 'cancelled', 'expired') THEN NULL
      ELSE approved_at
    END,
    declined_at = CASE
      WHEN p_status IN ('paid', 'in_review', 'pending_info', 'awaiting_script', 'cancelled', 'expired') THEN NULL
      ELSE declined_at
    END,
    completed_at = CASE
      WHEN p_status = 'completed' THEN COALESCE(completed_at, NOW())
      WHEN p_status <> 'completed' THEN NULL
      ELSE completed_at
    END,
    cancelled_at = CASE
      WHEN p_status = 'cancelled' THEN COALESCE(cancelled_at, NOW())
      WHEN p_status <> 'cancelled' THEN NULL
      ELSE cancelled_at
    END,
    updated_at = NOW()
  WHERE id = p_intake_id;

  -- Clear flag explicitly; it is transaction-local and expires regardless.
  PERFORM set_config('app.e2e_reset', 'false', TRUE);
END;
$$;

GRANT EXECUTE ON FUNCTION public.e2e_reset_intake_status TO service_role;
REVOKE EXECUTE ON FUNCTION public.e2e_reset_intake_status FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.e2e_reset_intake_status FROM authenticated;

COMMENT ON FUNCTION public.e2e_reset_intake_status IS
'E2E TEST ONLY: Force-reset intake status with coherent terminal timestamps, bypassing validate_intake_status_transition through a transaction-local service_role-only flag.';

UPDATE public.intakes
SET
  cancelled_at = COALESCE(cancelled_at, updated_at, NOW()),
  updated_at = NOW()
WHERE patient_id = 'e2e00000-0000-0000-0000-000000000002'
  AND status = 'cancelled'
  AND cancelled_at IS NULL;
