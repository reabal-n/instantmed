-- A partial refund can return the Priority review fee or another service-recovery
-- amount while the underlying clinical request remains paid. Keep those
-- requests in the doctor queue and claimable for fulfilment without widening
-- access to fully refunded, disputed, pending, or failed payments.

DROP INDEX IF EXISTS public.idx_intakes_doctor_queue_actionable;

CREATE INDEX idx_intakes_doctor_queue_actionable
ON public.intakes (is_priority DESC, sla_deadline ASC, paid_at ASC, created_at ASC)
WHERE payment_status IN ('paid', 'partially_refunded')
  AND status IN ('paid', 'in_review', 'pending_info', 'awaiting_script');

CREATE OR REPLACE FUNCTION public.claim_intake_for_review(
  p_intake_id UUID,
  p_doctor_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_intake public.intakes%ROWTYPE;
  v_old_claimed_by UUID;
  v_claim_expired BOOLEAN;
BEGIN
  IF p_intake_id IS NULL OR p_doctor_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid parameters');
  END IF;

  SELECT * INTO v_intake
  FROM public.intakes
  WHERE id = p_intake_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Intake not found');
  END IF;

  IF v_intake.payment_status IS NULL
     OR v_intake.payment_status NOT IN ('paid', 'partially_refunded') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Intake is not paid');
  END IF;

  IF v_intake.status NOT IN ('paid', 'in_review', 'pending_info', 'awaiting_script') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Intake is not actionable');
  END IF;

  v_old_claimed_by := v_intake.claimed_by;
  v_claim_expired := v_intake.claimed_at IS NULL
    OR v_intake.claimed_at < NOW() - INTERVAL '10 minutes';

  IF v_old_claimed_by = p_doctor_id THEN
    UPDATE public.intakes
    SET claimed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_intake_id
      AND payment_status IN ('paid', 'partially_refunded')
      AND status IN ('paid', 'in_review', 'pending_info', 'awaiting_script')
      AND claimed_by = p_doctor_id;

    RETURN jsonb_build_object('success', true, 'claimed', true, 'renewed', true);
  END IF;

  IF v_old_claimed_by IS NOT NULL AND NOT v_claim_expired THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Intake is already being reviewed',
      'claimed_by', v_old_claimed_by,
      'claimed_at', v_intake.claimed_at
    );
  END IF;

  UPDATE public.intakes
  SET claimed_by = p_doctor_id,
      claimed_at = NOW(),
      updated_at = NOW()
  WHERE id = p_intake_id
    AND payment_status IN ('paid', 'partially_refunded')
    AND status IN ('paid', 'in_review', 'pending_info', 'awaiting_script')
    AND (
      claimed_by IS NULL
      OR claimed_at IS NULL
      OR claimed_at < NOW() - INTERVAL '10 minutes'
    );

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Intake claim changed; refresh and try again');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'claimed', true,
    'reclaimed', v_old_claimed_by IS NOT NULL
  );
END;
$$;

REVOKE ALL ON FUNCTION public.claim_intake_for_review(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_intake_for_review(UUID, UUID) TO service_role;

COMMENT ON FUNCTION public.claim_intake_for_review(UUID, UUID) IS
  'Atomically claims active fulfilment-entitled intakes for doctor review with a 10-minute soft lock.';
