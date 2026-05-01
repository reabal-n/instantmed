-- Make patient replies to doctor info requests operationally visible.
-- A patient response must not only append a message; it must also restore the
-- paid clinical work item to the doctor queue in the same transaction.

CREATE OR REPLACE FUNCTION public.respond_to_info_request_atomic(
  p_intake_id uuid,
  p_patient_id uuid,
  p_message text,
  p_responded_at timestamptz DEFAULT now()
)
RETURNS TABLE (
  message_id uuid,
  created_at timestamptz,
  restored_status public.intake_status
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_intake record;
  v_message text;
  v_responded_at timestamptz;
  v_target_status public.intake_status;
BEGIN
  v_message := NULLIF(btrim(p_message), '');
  IF v_message IS NULL THEN
    RAISE EXCEPTION 'patient_info_response_message_required'
      USING ERRCODE = '22023';
  END IF;

  v_responded_at := COALESCE(p_responded_at, now());

  SELECT id, status, previous_status, patient_id, payment_status
  INTO v_intake
  FROM public.intakes
  WHERE id = p_intake_id
  FOR UPDATE;

  IF NOT FOUND OR v_intake.patient_id <> p_patient_id THEN
    RAISE EXCEPTION 'patient_info_response_not_found'
      USING ERRCODE = 'P0002';
  END IF;

  IF v_intake.status <> 'pending_info'::public.intake_status THEN
    RAISE EXCEPTION 'patient_info_response_status_not_allowed'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_intake.payment_status <> 'paid' THEN
    RAISE EXCEPTION 'patient_info_response_payment_required'
      USING ERRCODE = 'P0001';
  END IF;

  v_target_status := CASE
    WHEN v_intake.previous_status = 'in_review'::public.intake_status THEN 'in_review'::public.intake_status
    ELSE 'paid'::public.intake_status
  END;

  INSERT INTO public.patient_messages (
    patient_id,
    intake_id,
    sender_type,
    sender_id,
    content,
    created_at,
    updated_at
  )
  VALUES (
    p_patient_id,
    p_intake_id,
    'patient',
    p_patient_id,
    v_message,
    v_responded_at,
    v_responded_at
  )
  RETURNING id, public.patient_messages.created_at
  INTO message_id, created_at;

  UPDATE public.intakes
  SET
    status = v_target_status,
    previous_status = 'pending_info'::public.intake_status,
    updated_at = v_responded_at
  WHERE id = p_intake_id;

  INSERT INTO public.audit_logs (
    actor_id,
    actor_type,
    action,
    intake_id,
    from_state,
    to_state,
    metadata,
    created_at
  )
  VALUES (
    p_patient_id,
    'patient',
    'patient_info_response',
    p_intake_id,
    'pending_info',
    v_target_status::text,
    jsonb_build_object(
      'message_length', length(v_message)
    ),
    v_responded_at
  );

  restored_status := v_target_status;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.respond_to_info_request_atomic(uuid, uuid, text, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.respond_to_info_request_atomic(uuid, uuid, text, timestamptz) FROM anon;
REVOKE ALL ON FUNCTION public.respond_to_info_request_atomic(uuid, uuid, text, timestamptz) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.respond_to_info_request_atomic(uuid, uuid, text, timestamptz) TO service_role;

COMMENT ON FUNCTION public.respond_to_info_request_atomic(uuid, uuid, text, timestamptz) IS
  'Atomically writes a patient info-response message and restores the paid intake to the clinical queue.';

CREATE INDEX IF NOT EXISTS idx_patient_messages_intake_created_at
  ON public.patient_messages(intake_id, created_at);
