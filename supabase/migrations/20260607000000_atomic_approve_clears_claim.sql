-- Migration: atomic_approve_certificate clears the intake claim on approval,
-- and backfill residual / phantom claims left by the prior behaviour.
--
-- Context (2026-06-07 incident follow-up): the approval RPC's STEP 5 UPDATE set
-- status='approved' but never cleared claimed_by/claimed_at. Combined with the
-- auto-approval pipeline setting claimed_by=SYSTEM_AUTO_APPROVE_ID (with a NULL
-- claimed_at), this left:
--   * ~80 terminal (approved) intakes still showing claimed_by = the doctor, and
--   * intakes that failed/needed-doctor still "claimed by System (Auto-Approve)",
--     which release_stale_intake_claims can never clear (it filters
--     claimed_at IS NOT NULL) and which made the doctor cockpit render a phantom
--     "Auto-approval check is running on this case" lock on terminal cases.
--
-- Fix: make the terminal approval claim-clean at the single source of truth (the
-- RPC, which both the manual and auto paths call), and backfill existing rows.
-- The code-side companion (lib/clinical/auto-approval-state.ts) sets claimed_at
-- on claim and clears the claim on every relinquish so new rows never get stuck.

-- ---------------------------------------------------------------------------
-- 1. Re-create atomic_approve_certificate with STEP 5 clearing the claim.
--    Body is identical to the live definition except for the two added columns
--    in the STEP 5 UPDATE. Clearing happens AFTER all validation/insert steps,
--    inside the same transaction, so the claim-ownership guard is unaffected.
-- ---------------------------------------------------------------------------
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
  p_certificate_ref text DEFAULT NULL::text,
  p_patient_name_enc jsonb DEFAULT NULL::jsonb
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
  -- Also release the review claim — an approved intake is terminal, so any
  -- claimed_by/claimed_at (doctor's manual claim OR the System auto-approve
  -- claim) must be cleared so no phantom lock survives on the cockpit.
  -- ============================================
  UPDATE intakes
  SET
    status = 'approved',
    reviewed_by = p_doctor_id,
    reviewed_at = NOW(),
    decided_at = NOW(),
    decision = 'approved',
    approved_at = NOW(),
    claimed_by = NULL,
    claimed_at = NULL,
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
$function$;

-- ---------------------------------------------------------------------------
-- 2. Backfill: clear residual claims left by the prior behaviour.
-- ---------------------------------------------------------------------------

-- 2a. Terminal intakes (moved past the review window) that still carry a claim.
UPDATE public.intakes
SET claimed_by = NULL, claimed_at = NULL, updated_at = NOW()
WHERE claimed_by IS NOT NULL
  AND status NOT IN ('paid', 'in_review', 'pending_info', 'awaiting_script');

-- 2b. Phantom "System (Auto-Approve)" locks (claimed_by = system id) on any
--     intake the system is no longer actively processing. Never touch a row
--     mid-attempt (auto_approval_state = 'attempting').
UPDATE public.intakes
SET claimed_by = NULL, claimed_at = NULL, updated_at = NOW()
WHERE claimed_by = '00000000-0000-0000-0000-000000000000'
  AND (auto_approval_state IS NULL OR auto_approval_state <> 'attempting');
