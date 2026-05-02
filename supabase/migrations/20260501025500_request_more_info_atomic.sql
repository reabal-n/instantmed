-- Make doctor request-more-info mutation atomic.
-- The patient-facing message and pending_info status must not split across
-- separate writes; otherwise doctors can create hidden patient blockers.

CREATE OR REPLACE FUNCTION public.request_more_info_atomic(
  p_intake_id uuid,
  p_doctor_id uuid,
  p_template_code text,
  p_message text,
  p_requested_at timestamptz DEFAULT now()
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_intake record;
  v_message text;
  v_requested_at timestamptz;
BEGIN
  v_message := NULLIF(btrim(p_message), '');
  IF v_message IS NULL THEN
    RAISE EXCEPTION 'request_more_info_message_required'
      USING ERRCODE = '22023';
  END IF;

  v_requested_at := COALESCE(p_requested_at, now());

  SELECT id, status, patient_id
  INTO v_intake
  FROM public.intakes
  WHERE id = p_intake_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'request_more_info_not_found'
      USING ERRCODE = 'P0002';
  END IF;

  IF v_intake.status NOT IN ('paid', 'in_review', 'pending_info') THEN
    RAISE EXCEPTION 'request_more_info_status_not_allowed'
      USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.patient_messages (
    patient_id,
    intake_id,
    sender_type,
    sender_id,
    content
  )
  VALUES (
    v_intake.patient_id,
    p_intake_id,
    'doctor',
    p_doctor_id,
    v_message
  );

  UPDATE public.intakes
  SET
    status = 'pending_info'::public.intake_status,
    previous_status = v_intake.status,
    info_request_code = p_template_code,
    info_request_message = v_message,
    info_requested_at = v_requested_at,
    info_requested_by = p_doctor_id,
    updated_at = v_requested_at
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
    p_doctor_id,
    'doctor',
    'request_more_info',
    p_intake_id,
    v_intake.status::text,
    'pending_info',
    jsonb_build_object(
      'template_code', p_template_code,
      'message_length', length(v_message)
    ),
    v_requested_at
  );
END;
$$;
