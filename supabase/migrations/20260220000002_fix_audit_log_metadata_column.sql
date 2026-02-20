-- Fix: atomic_approve_certificate references 'metadata' column on certificate_audit_log
-- but the actual column name is 'event_data'. This caused approval to fail with:
-- "column metadata of relation certificate_audit_log does not exist"

CREATE OR REPLACE FUNCTION public.atomic_approve_certificate(
  p_intake_id uuid,
  p_certificate_number text,
  p_verification_code text,
  p_idempotency_key text,
  p_certificate_type text,
  p_issue_date date,
  p_start_date date,
  p_end_date date,
  p_patient_id uuid,
  p_patient_name text,
  p_patient_dob date,
  p_doctor_id uuid,
  p_doctor_name text,
  p_doctor_nominals text,
  p_doctor_provider_number text,
  p_doctor_ahpra_number text,
  p_template_config_snapshot jsonb,
  p_clinic_identity_snapshot jsonb,
  p_storage_path text,
  p_file_size_bytes integer,
  p_filename text,
  p_pdf_hash text DEFAULT NULL::text,
  p_certificate_ref text DEFAULT NULL::text
)
RETURNS TABLE(certificate_id uuid, intake_document_id uuid, success boolean, error_message text, is_duplicate boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_certificate_id UUID;
  v_intake_document_id UUID;
  v_current_status TEXT;
  v_existing_cert_id UUID;
BEGIN
  -- 1. Idempotency check
  SELECT id INTO v_existing_cert_id
  FROM issued_certificates
  WHERE idempotency_key = p_idempotency_key;

  IF v_existing_cert_id IS NOT NULL THEN
    RETURN QUERY SELECT v_existing_cert_id, NULL::UUID, TRUE, NULL::TEXT, TRUE;
    RETURN;
  END IF;

  -- 2. Lock intake and validate status
  SELECT status INTO v_current_status
  FROM intakes
  WHERE id = p_intake_id
  FOR UPDATE;

  IF v_current_status IS NULL THEN
    RETURN QUERY SELECT NULL::UUID, NULL::UUID, FALSE, 'Intake not found'::TEXT, FALSE;
    RETURN;
  END IF;

  IF v_current_status NOT IN ('paid', 'in_review', 'approved') THEN
    RETURN QUERY SELECT NULL::UUID, NULL::UUID, FALSE,
      ('Invalid intake status for approval: ' || v_current_status || '. Expected: paid, in_review, or approved.')::TEXT, FALSE;
    RETURN;
  END IF;

  -- 3. Re-approval guard
  IF v_current_status = 'approved' THEN
    SELECT id INTO v_existing_cert_id
    FROM issued_certificates
    WHERE intake_id = p_intake_id AND status = 'valid'
    LIMIT 1;

    IF v_existing_cert_id IS NOT NULL THEN
      RETURN QUERY SELECT v_existing_cert_id, NULL::UUID, TRUE, NULL::TEXT, TRUE;
      RETURN;
    END IF;
  END IF;

  -- 4. Insert issued certificate
  INSERT INTO issued_certificates (
    intake_id, certificate_number, verification_code, idempotency_key,
    certificate_type, status, issue_date, start_date, end_date,
    patient_id, patient_name, patient_dob,
    doctor_id, doctor_name, doctor_nominals,
    doctor_provider_number, doctor_ahpra_number,
    template_config_snapshot, clinic_identity_snapshot,
    storage_path, file_size_bytes, pdf_hash, certificate_ref
  )
  VALUES (
    p_intake_id, p_certificate_number, p_verification_code, p_idempotency_key,
    p_certificate_type, 'valid', p_issue_date, p_start_date, p_end_date,
    p_patient_id, p_patient_name, p_patient_dob,
    p_doctor_id, p_doctor_name, p_doctor_nominals,
    p_doctor_provider_number, p_doctor_ahpra_number,
    p_template_config_snapshot, p_clinic_identity_snapshot,
    p_storage_path, p_file_size_bytes, p_pdf_hash, p_certificate_ref
  )
  RETURNING id INTO v_certificate_id;

  -- 5. Insert intake document record
  INSERT INTO intake_documents (
    intake_id, document_type, filename, storage_path,
    mime_type, file_size_bytes, certificate_number,
    created_by, metadata
  )
  VALUES (
    p_intake_id, 'med_cert', p_filename, p_storage_path,
    'application/pdf', p_file_size_bytes, p_certificate_number,
    p_doctor_id,
    jsonb_build_object(
      'patient_name', p_patient_name,
      'certificate_type', p_certificate_type,
      'start_date', p_start_date,
      'end_date', p_end_date,
      'pdf_hash', p_pdf_hash,
      'certificate_ref', p_certificate_ref
    )
  )
  RETURNING id INTO v_intake_document_id;

  -- 6. Update intake status
  UPDATE intakes
  SET
    status = 'approved',
    reviewed_by = p_doctor_id,
    reviewed_at = NOW(),
    decided_at = NOW(),
    decision = 'approved',
    approved_at = NOW(),
    updated_at = NOW()
  WHERE id = p_intake_id
  AND status IN ('paid', 'in_review', 'approved');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Failed to update intake status - concurrent modification detected';
  END IF;

  -- 7. Audit log — FIX: use event_data (not metadata)
  INSERT INTO certificate_audit_log (
    certificate_id, event_type, actor_id, actor_role, event_data
  )
  VALUES (
    v_certificate_id, 'issued', p_doctor_id, 'doctor',
    jsonb_build_object(
      'intake_id', p_intake_id,
      'certificate_type', p_certificate_type,
      'storage_path', p_storage_path,
      'pdf_hash', p_pdf_hash,
      'certificate_ref', p_certificate_ref
    )
  );

  -- 8. Return success
  RETURN QUERY SELECT v_certificate_id, v_intake_document_id, TRUE, NULL::TEXT, FALSE;

EXCEPTION
  WHEN unique_violation THEN
    SELECT id INTO v_existing_cert_id
    FROM issued_certificates
    WHERE idempotency_key = p_idempotency_key;

    IF v_existing_cert_id IS NOT NULL THEN
      RETURN QUERY SELECT v_existing_cert_id, NULL::UUID, TRUE, NULL::TEXT, TRUE;
    ELSE
      RETURN QUERY SELECT NULL::UUID, NULL::UUID, FALSE, 'Unique constraint violation'::TEXT, FALSE;
    END IF;

  WHEN OTHERS THEN
    RETURN QUERY SELECT NULL::UUID, NULL::UUID, FALSE, SQLERRM::TEXT, FALSE;
END;
$function$;
