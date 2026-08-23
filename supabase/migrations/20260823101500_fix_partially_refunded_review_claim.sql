-- The 20260819055501 partial-refund fulfilment migration created a new
-- two-argument overload, but every application caller uses the canonical
-- three-argument RPC with p_force. The older canonical overload therefore
-- continued rejecting partially_refunded requests even though they remained
-- fulfilment-entitled and visible in the doctor queue.

DROP FUNCTION IF EXISTS public.claim_intake_for_review(uuid, uuid);

CREATE OR REPLACE FUNCTION public.claim_intake_for_review(
  p_intake_id uuid,
  p_doctor_id uuid,
  p_force boolean DEFAULT false
)
RETURNS TABLE (
  success boolean,
  error_message text,
  current_claimant text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_intake record;
  v_timeout_minutes integer := 10;
BEGIN
  SELECT i.*, p.full_name AS claimant_name
  INTO v_intake
  FROM public.intakes i
  LEFT JOIN public.profiles p ON i.claimed_by = p.id
  WHERE i.id = p_intake_id
  FOR UPDATE OF i;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Intake not found'::text, NULL::text;
    RETURN;
  END IF;

  IF v_intake.payment_status IS NULL
     OR v_intake.payment_status NOT IN ('paid', 'partially_refunded') THEN
    RETURN QUERY SELECT false, 'Cannot claim intake before payment is confirmed'::text, NULL::text;
    RETURN;
  END IF;

  IF v_intake.status NOT IN ('paid', 'in_review', 'pending_info', 'awaiting_script') THEN
    RETURN QUERY SELECT false,
      format('Cannot claim intake in ''%s'' status', v_intake.status)::text,
      NULL::text;
    RETURN;
  END IF;

  IF v_intake.claimed_by IS NOT NULL AND v_intake.claimed_by != p_doctor_id THEN
    IF v_intake.claimed_at IS NULL
       OR v_intake.claimed_at < now() - (v_timeout_minutes || ' minutes')::interval
       OR p_force THEN
      UPDATE public.intakes
      SET claimed_by = p_doctor_id,
          claimed_at = now(),
          updated_at = now()
      WHERE id = p_intake_id
        AND payment_status IN ('paid', 'partially_refunded')
        AND status IN ('paid', 'in_review', 'pending_info', 'awaiting_script')
        AND claimed_by = v_intake.claimed_by;

      IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Intake status changed during takeover'::text, v_intake.claimant_name;
        RETURN;
      END IF;

      RETURN QUERY SELECT true, NULL::text, v_intake.claimant_name;
      RETURN;
    END IF;

    RETURN QUERY SELECT false,
      format(
        'Already claimed by %s (%s minutes remaining)',
        COALESCE(v_intake.claimant_name, 'another doctor'),
        GREATEST(
          1,
          CEIL(EXTRACT(EPOCH FROM (
            v_intake.claimed_at
            + (v_timeout_minutes || ' minutes')::interval
            - now()
          )) / 60)::integer
        )
      )::text,
      v_intake.claimant_name;
    RETURN;
  END IF;

  UPDATE public.intakes
  SET claimed_by = p_doctor_id,
      claimed_at = now(),
      updated_at = now()
  WHERE id = p_intake_id
    AND payment_status IN ('paid', 'partially_refunded')
    AND status IN ('paid', 'in_review', 'pending_info', 'awaiting_script')
    AND (claimed_by IS NULL OR claimed_by = p_doctor_id);

  IF NOT FOUND THEN
    RETURN QUERY SELECT false,
      'Intake claim changed; refresh and try again'::text,
      NULL::text;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, NULL::text, NULL::text;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_intake_for_review(uuid, uuid, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_intake_for_review(uuid, uuid, boolean) TO service_role;

COMMENT ON FUNCTION public.claim_intake_for_review(uuid, uuid, boolean) IS
  'Atomically claims actionable paid or partially refunded intakes for doctor review. Uses a 10-minute soft lock and permits explicit forced takeover.';
