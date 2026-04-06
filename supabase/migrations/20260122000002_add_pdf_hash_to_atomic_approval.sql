-- ============================================================================
-- ADD PDF HASH TO ATOMIC CERTIFICATE APPROVAL
-- Enables integrity verification of issued certificates
-- ============================================================================

-- Drop and recreate the function with pdf_hash parameter
DROP FUNCTION IF EXISTS public.atomic_approve_certificate;

CREATE OR REPLACE FUNCTION public.atomic_approve_certificate(
  -- Intake identification
  p_intake_id UUID,

  -- Certificate data
  p_certificate_number TEXT,
  p_verification_code TEXT,
  p_idempotency_key TEXT,
  p_certificate_type TEXT,
  p_issue_date DATE,
  p_start_date DATE,
  p_end_date DATE,

  -- Patient snapshot
  p_patient_id UUID,
  p_patient_name TEXT,
  p_patient_dob DATE,

  -- Doctor snapshot
  p_doctor_id UUID,
  p_doctor_name TEXT,
  p_doctor_nominals TEXT,
  p_doctor_provider_number TEXT,
  p_doctor_ahpra_number TEXT,

  -- Template snapshots (JSONB)
  p_template_config_snapshot JSONB,
  p_clinic_identity_snapshot JSONB,

  -- Storage info
  p_storage_path TEXT,
  p_file_size_bytes INTEGER,

  -- Legacy intake_documents fields
  p_filename TEXT,

  -- PDF integrity verification (NEW)
  p_pdf_hash TEXT DEFAULT NULL
)
RETURNS TABLE (
  certificate_id UUID,
  intake_document_id UUID,
  success BOOLEAN,
  error_message TEXT,
  is_duplicate BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_certificate_id UUID;
  v_intake_document_id UUID;
  v_current_status TEXT;
  v_existing_cert_id UUID;
BEGIN
  -- ============================================
  -- STEP 1: Check for existing certificate (idempotency)
  -- ============================================
  SELECT id INTO v_existing_cert_id
  FROM issued_certificates
  WHERE idempotency_key = p_idempotency_key;

  IF v_existing_cert_id IS NOT NULL THEN
    -- Certificate already exists - return it (idempotent)
    RETURN QUERY SELECT
      v_existing_cert_id,
      NULL::UUID,
      TRUE,
      NULL::TEXT,
      TRUE;
    RETURN;
  END IF;

  -- ============================================
  -- STEP 2: Validate intake status
  -- ============================================
  SELECT status INTO v_current_status
  FROM intakes
  WHERE id = p_intake_id
  FOR UPDATE; -- Lock the row to prevent concurrent modifications

  IF v_current_status IS NULL THEN
    RETURN QUERY SELECT NULL::UUID, NULL::UUID, FALSE, 'Intake not found'::TEXT, FALSE;
    RETURN;
  END IF;

  -- Allow processing (set by optimistic lock) or already approved (idempotent)
  IF v_current_status NOT IN ('processing', 'approved') THEN
    RETURN QUERY SELECT NULL::UUID, NULL::UUID, FALSE,
      ('Invalid intake status: ' || v_current_status)::TEXT, FALSE;
    RETURN;
  END IF;

  -- If already approved, find the certificate
  IF v_current_status = 'approved' THEN
    SELECT id INTO v_existing_cert_id
    FROM issued_certificates
    WHERE intake_id = p_intake_id
    AND status = 'valid'
    LIMIT 1;

    IF v_existing_cert_id IS NOT NULL THEN
      RETURN QUERY SELECT v_existing_cert_id, NULL::UUID, TRUE, NULL::TEXT, TRUE;
      RETURN;
    END IF;
  END IF;

  -- ============================================
  -- STEP 3: Create issued_certificates record
  -- ============================================
  INSERT INTO issued_certificates (
    intake_id,
    certificate_number,
    verification_code,
    idempotency_key,
    certificate_type,
    status,
    issue_date,
    start_date,
    end_date,
    patient_id,
    patient_name,
    patient_dob,
    doctor_id,
    doctor_name,
    doctor_nominals,
    doctor_provider_number,
    doctor_ahpra_number,
    template_config_snapshot,
    clinic_identity_snapshot,
    storage_path,
    file_size_bytes,
    pdf_hash
  )
  VALUES (
    p_intake_id,
    p_certificate_number,
    p_verification_code,
    p_idempotency_key,
    p_certificate_type,
    'valid',
    p_issue_date,
    p_start_date,
    p_end_date,
    p_patient_id,
    p_patient_name,
    p_patient_dob,
    p_doctor_id,
    p_doctor_name,
    p_doctor_nominals,
    p_doctor_provider_number,
    p_doctor_ahpra_number,
    p_template_config_snapshot,
    p_clinic_identity_snapshot,
    p_storage_path,
    p_file_size_bytes,
    p_pdf_hash
  )
  RETURNING id INTO v_certificate_id;

  -- ============================================
  -- STEP 4: Create intake_documents record (legacy table)
  -- ============================================
  INSERT INTO intake_documents (
    intake_id,
    document_type,
    filename,
    storage_path,
    mime_type,
    file_size_bytes,
    certificate_number,
    created_by,
    metadata
  )
  VALUES (
    p_intake_id,
    'med_cert',
    p_filename,
    p_storage_path,
    'application/pdf',
    p_file_size_bytes,
    p_certificate_number,
    p_doctor_id,
    jsonb_build_object(
      'patient_name', p_patient_name,
      'certificate_type', p_certificate_type,
      'start_date', p_start_date,
      'end_date', p_end_date,
      'pdf_hash', p_pdf_hash
    )
  )
  RETURNING id INTO v_intake_document_id;

  -- ============================================
  -- STEP 5: Update intake status to approved
  -- ============================================
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
  AND status IN ('processing', 'approved'); -- Safety: only update from expected states

  IF NOT FOUND THEN
    -- This shouldn't happen due to the FOR UPDATE lock, but handle it gracefully
    RAISE EXCEPTION 'Failed to update intake status - concurrent modification detected';
  END IF;

  -- ============================================
  -- STEP 6: Log certificate issuance event
  -- ============================================
  INSERT INTO certificate_audit_log (
    certificate_id,
    event_type,
    actor_id,
    actor_role,
    metadata
  )
  VALUES (
    v_certificate_id,
    'issued',
    p_doctor_id,
    'doctor',
    jsonb_build_object(
      'intake_id', p_intake_id,
      'certificate_type', p_certificate_type,
      'storage_path', p_storage_path,
      'pdf_hash', p_pdf_hash
    )
  );

  -- ============================================
  -- Return success
  -- ============================================
  RETURN QUERY SELECT v_certificate_id, v_intake_document_id, TRUE, NULL::TEXT, FALSE;

EXCEPTION
  WHEN unique_violation THEN
    -- Handle race condition where another request created the certificate
    SELECT id INTO v_existing_cert_id
    FROM issued_certificates
    WHERE idempotency_key = p_idempotency_key;

    IF v_existing_cert_id IS NOT NULL THEN
      RETURN QUERY SELECT v_existing_cert_id, NULL::UUID, TRUE, NULL::TEXT, TRUE;
    ELSE
      RETURN QUERY SELECT NULL::UUID, NULL::UUID, FALSE,
        'Unique constraint violation'::TEXT, FALSE;
    END IF;

  WHEN OTHERS THEN
    RETURN QUERY SELECT NULL::UUID, NULL::UUID, FALSE, SQLERRM::TEXT, FALSE;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.atomic_approve_certificate TO authenticated;
GRANT EXECUTE ON FUNCTION public.atomic_approve_certificate TO service_role;

COMMENT ON FUNCTION public.atomic_approve_certificate IS
'Atomic function to approve a certificate: creates issued_certificates record,
intake_documents record, and updates intake status in a single transaction.
Includes idempotency handling and PDF hash for integrity verification.';
