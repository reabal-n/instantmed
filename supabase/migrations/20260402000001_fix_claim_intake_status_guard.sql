-- ============================================================================
-- FIX: Add status guard to claim_intake_for_review
--
-- Without this guard, a doctor could claim an already-approved intake.
-- The downstream atomicApproveCertificate RPC handles it correctly (returns
-- the existing cert idempotently), but claimed_by would be set on an approved
-- intake, polluting state and causing spurious stale-claim releases.
--
-- This re-creates claim_intake_for_review with AND status IN ('paid', 'in_review')
-- on the claim UPDATE, ensuring claims are only placed on actionable intakes.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.claim_intake_for_review(
  p_intake_id UUID,
  p_doctor_id UUID,
  p_force BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  success BOOLEAN,
  error_message TEXT,
  current_claimant TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_intake RECORD;
  v_claimant_name TEXT;
  v_timeout_minutes INTEGER := 30;
BEGIN
  -- Fetch current intake state
  SELECT i.*, p.full_name AS claimant_name
  INTO v_intake
  FROM public.intakes i
  LEFT JOIN public.profiles p ON i.claimed_by = p.id
  WHERE i.id = p_intake_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Intake not found'::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  -- Guard: only claim intakes that are in a reviewable state.
  -- approved/declined/refunded intakes should not be claimable.
  IF v_intake.status NOT IN ('paid', 'in_review') THEN
    RETURN QUERY SELECT FALSE,
      format('Cannot claim intake in ''%s'' status', v_intake.status)::TEXT,
      NULL::TEXT;
    RETURN;
  END IF;

  -- Check if already claimed by someone else
  IF v_intake.claimed_by IS NOT NULL AND v_intake.claimed_by != p_doctor_id THEN
    -- Allow takeover of stale claim (older than timeout) or forced takeover
    IF v_intake.claimed_at < NOW() - (v_timeout_minutes || ' minutes')::INTERVAL OR p_force THEN
      UPDATE public.intakes
      SET claimed_by  = p_doctor_id,
          claimed_at  = NOW(),
          updated_at  = NOW()
      WHERE id = p_intake_id
        AND status IN ('paid', 'in_review'); -- re-check status atomically

      IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'Intake status changed during takeover'::TEXT, v_intake.claimant_name;
        RETURN;
      END IF;

      RETURN QUERY SELECT TRUE, NULL::TEXT, v_intake.claimant_name;
      RETURN;
    ELSE
      RETURN QUERY SELECT FALSE,
        format('Already claimed by %s (%s minutes remaining)',
          v_intake.claimant_name,
          CEIL(EXTRACT(EPOCH FROM (v_intake.claimed_at + (v_timeout_minutes || ' minutes')::INTERVAL - NOW())) / 60)::INTEGER
        )::TEXT,
        v_intake.claimant_name;
      RETURN;
    END IF;
  END IF;

  -- Claim or refresh existing claim (doctor reclaiming their own)
  UPDATE public.intakes
  SET claimed_by = p_doctor_id,
      claimed_at = NOW(),
      updated_at = NOW()
  WHERE id = p_intake_id
    AND status IN ('paid', 'in_review'); -- status guard on the actual UPDATE

  IF NOT FOUND THEN
    -- Status changed between SELECT and UPDATE (race condition)
    RETURN QUERY SELECT FALSE,
      format('Cannot claim intake in ''%s'' status', v_intake.status)::TEXT,
      NULL::TEXT;
    RETURN;
  END IF;

  RETURN QUERY SELECT TRUE, NULL::TEXT, NULL::TEXT;
END;
$$;

-- Permissions unchanged: service_role only
GRANT EXECUTE ON FUNCTION public.claim_intake_for_review TO service_role;

COMMENT ON FUNCTION public.claim_intake_for_review IS
'Claim an intake for doctor review. Only claimable from paid or in_review status.
Supports 30-minute stale-claim takeover and forced takeover (p_force=true).
Status guard added in 20260402000001 to prevent claiming already-approved intakes.';

-- Audit log
INSERT INTO public.audit_logs (action, actor_type, metadata, created_at)
VALUES (
  'settings_changed',
  'system',
  jsonb_build_object(
    'settingType', 'claim_intake_status_guard',
    'changes', ARRAY['claim_intake_for_review: added AND status IN (paid, in_review) guard on UPDATE'],
    'reason', 'Prevent claiming already-approved/declined intakes — pollutes claimed_by state'
  ),
  NOW()
);
