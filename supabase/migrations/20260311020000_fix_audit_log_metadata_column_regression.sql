-- ============================================================================
-- FIX: Revert metadata→event_data regression in atomic_approve_certificate
--
-- 20260311014239_add_phi_enc_to_atomic_approval.sql introduced a regression:
-- the INSERT into certificate_audit_log used column "metadata" instead of
-- the correct column "event_data".
--
-- This migration re-applies the full function with the correct column name.
-- ============================================================================

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

  -- PDF integrity verification
  p_pdf_hash TEXT DEFAULT NULL,

  -- Certificate reference (template-based: IM-TYPE-DATE-XXXXX)
  p_certificate_ref TEXT DEFAULT NULL,

  -- PHI encryption: AES-256-GCM envelope for patient_name (dual-write)
  p_patient_name_enc JSONB DEFAULT NULL
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

  -- Accept paid/in_review (claim mechanism provides lock) or approved (idempotent)
  IF v_current_status NOT IN ('paid', 'in_review', 'approved') THEN
    RETURN QUERY SELECT NULL::UUID, NULL::UUID, FALSE,
      ('Invalid intake status for approval: ' || v_current_status || '. Expected: paid, in_review, or approved.')::TEXT, FALSE;
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
  -- Now includes patient_name_enc (PHI dual-write)
  -- and certificate_ref
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
    patient_name_enc,
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
    pdf_hash,
    certificate_ref
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
    p_patient_name_enc,
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
    p_pdf_hash,
    p_certificate_ref
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
  AND status IN ('paid', 'in_review', 'approved'); -- Safety: only update from expected states

  IF NOT FOUND THEN
    -- This shouldn't happen due to the FOR UPDATE lock, but handle it gracefully
    RAISE EXCEPTION 'Failed to update intake status - concurrent modification detected';
  END IF;

  -- ============================================
  -- STEP 6: Log certificate issuance event
  -- FIX: Use event_data (not metadata) — correct column name for certificate_audit_log
  -- ============================================
  INSERT INTO certificate_audit_log (
    certificate_id,
    event_type,
    actor_id,
    actor_role,
    event_data
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
      'pdf_hash', p_pdf_hash,
      'phi_encrypted', (p_patient_name_enc IS NOT NULL)
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

-- service_role only (authenticated revoked per 20260125000001)
GRANT EXECUTE ON FUNCTION public.atomic_approve_certificate TO service_role;

COMMENT ON FUNCTION public.atomic_approve_certificate IS
'Atomic certificate approval with PHI encryption support. Accepts paid/in_review/approved states.
Writes patient_name_enc (AES-256-GCM envelope) alongside patient_name (dual-write pattern).
SECURITY DEFINER - service_role only.
Canonical path: app/actions/approve-cert.ts -> approveAndSendCert()
Fix: 20260311020000 corrected metadata->event_data regression in certificate_audit_log INSERT.';

-- Audit log
INSERT INTO public.audit_logs (action, actor_type, metadata, created_at)
VALUES (
  'settings_changed',
  'system',
  jsonb_build_object(
    'settingType', 'atomic_approval_audit_log_column_fix',
    'changes', ARRAY['certificate_audit_log: metadata -> event_data'],
    'reason', 'Fix regression introduced by 20260311014239_add_phi_enc_to_atomic_approval.sql'
  ),
  NOW()
);
