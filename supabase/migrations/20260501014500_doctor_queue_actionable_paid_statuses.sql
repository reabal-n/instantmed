-- Doctor queue production-readiness hardening.
-- Keep actionable queue work paid-only, include awaiting_script, and give the
-- hot-path query an index that matches its operational ordering.

CREATE INDEX IF NOT EXISTS idx_intakes_doctor_queue_paid_order
ON public.intakes (
  is_priority DESC,
  sla_deadline ASC NULLS LAST,
  paid_at ASC NULLS LAST,
  submitted_at ASC NULLS LAST,
  created_at ASC
)
WHERE payment_status = 'paid'
  AND status IN ('paid', 'in_review', 'pending_info', 'awaiting_script');

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
  v_timeout_minutes integer := 30;
BEGIN
  SELECT i.*, p.full_name AS claimant_name
  INTO v_intake
  FROM public.intakes i
  LEFT JOIN public.profiles p ON i.claimed_by = p.id
  WHERE i.id = p_intake_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Intake not found'::text, NULL::text;
    RETURN;
  END IF;

  IF v_intake.payment_status IS DISTINCT FROM 'paid' THEN
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
    IF v_intake.claimed_at < now() - (v_timeout_minutes || ' minutes')::interval OR p_force THEN
      UPDATE public.intakes
      SET claimed_by = p_doctor_id,
          claimed_at = now(),
          updated_at = now()
      WHERE id = p_intake_id
        AND payment_status = 'paid'
        AND status IN ('paid', 'in_review', 'pending_info', 'awaiting_script');

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
        CEIL(EXTRACT(EPOCH FROM (v_intake.claimed_at + (v_timeout_minutes || ' minutes')::interval - now())) / 60)::integer
      )::text,
      v_intake.claimant_name;
    RETURN;
  END IF;

  UPDATE public.intakes
  SET claimed_by = p_doctor_id,
      claimed_at = now(),
      updated_at = now()
  WHERE id = p_intake_id
    AND payment_status = 'paid'
    AND status IN ('paid', 'in_review', 'pending_info', 'awaiting_script');

  IF NOT FOUND THEN
    RETURN QUERY SELECT false,
      format('Cannot claim intake in ''%s'' status', v_intake.status)::text,
      NULL::text;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, NULL::text, NULL::text;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_intake_for_review(uuid, uuid, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_intake_for_review(uuid, uuid, boolean) FROM anon;
REVOKE ALL ON FUNCTION public.claim_intake_for_review(uuid, uuid, boolean) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.claim_intake_for_review(uuid, uuid, boolean) TO service_role;

COMMENT ON FUNCTION public.claim_intake_for_review(uuid, uuid, boolean) IS
  'Claim an actionable paid intake for doctor review, including awaiting_script cases. Blocks unpaid/refunded/non-actionable states.';
