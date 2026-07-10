/**
 * Issued Certificates Data Layer
 * Production-grade certificate management with idempotency and audit trail
 */

import crypto from "crypto"

import { SYSTEM_AUTO_APPROVE_ID } from "@/lib/constants"
import { createLogger } from "@/lib/observability/logger"
import { getPatientCertificateDownloadHref } from "@/lib/patient/certificate-download"
import {
  type CertificatePatientNameWriteResult,
  prepareCertificatePatientNameWrite,
  readCertificatePatientName,
} from "@/lib/security/phi-field-wrappers"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import type { ClinicIdentity, TemplateConfig } from "@/types/certificate-template"

const log = createLogger("issued-certificates")

// ============================================================================
// TYPES
// ============================================================================

export type CertificateStatus = "valid" | "revoked" | "superseded" | "expired"
export type CertificateEventType = 
  | "issued" 
  | "email_sent" 
  | "email_failed" 
  | "email_retry"
  | "downloaded" 
  | "verified" 
  | "revoked" 
  | "superseded"

export interface IssuedCertificate {
  id: string
  intake_id: string
  certificate_number: string
  verification_code: string
  idempotency_key: string
  certificate_type: "work" | "study" | "carer"
  status: CertificateStatus
  issue_date: string
  start_date: string
  end_date: string
  patient_id: string
  patient_name: string
  patient_dob: string | null
  doctor_id: string
  doctor_name: string
  doctor_nominals: string | null
  doctor_provider_number: string
  doctor_ahpra_number: string
  template_id: string | null
  template_version: number | null
  template_config_snapshot: TemplateConfig
  clinic_identity_snapshot: ClinicIdentity
  storage_path: string
  pdf_hash: string | null
  file_size_bytes: number | null
  email_sent_at: string | null
  email_delivery_id: string | null
  email_failed_at: string | null
  email_failure_reason: string | null
  email_retry_count: number
  email_opened_at: string | null
  resend_count: number
  revoked_at: string | null
  revoked_by: string | null
  revocation_reason: string | null
  certificate_ref: string | null
  created_at: string
  updated_at: string
}

export interface CreateCertificateInput {
  intake_id: string
  certificate_number: string
  verification_code: string
  certificate_type: "work" | "study" | "carer"
  issue_date: string
  start_date: string
  end_date: string
  patient_id: string
  patient_name: string
  patient_dob: string | null
  doctor_id: string
  doctor_name: string
  doctor_nominals: string | null
  doctor_provider_number: string
  doctor_ahpra_number: string
  template_id?: string | null
  template_version?: number | null
  template_config_snapshot: TemplateConfig
  clinic_identity_snapshot: ClinicIdentity
  storage_path: string
  pdf_hash?: string | null
  file_size_bytes?: number | null
}

export interface CommitCertificateCorrectionInput {
  certificateId: string
  expectedStoragePath: string
  newStoragePath: string
  patientName: string
  patientNameEnc: CertificatePatientNameWriteResult["patient_name_enc"]
  patientDob: string | null
  certificateType: "work" | "study" | "carer"
  startDate: string
  endDate: string
  pdfHash: string
  fileSizeBytes: number
  actorId: string
  actorRole: "doctor" | "admin"
  pendingCorrectionEventId?: string | null
}

export interface ReserveCertificateResendInput {
  attemptId: string
  certificateId: string
  actorId: string
  actorRole: "patient" | "doctor" | "admin" | "support"
  resendReason: string
  countTowardStaffLimit: boolean
}

export interface FinalizeCertificateResendInput {
  attemptId: string
  deliverySucceeded: boolean
  emailOutboxId?: string | null
  providerMessageId?: string | null
  failureReason?: string | null
}

// ============================================================================
// IDEMPOTENCY
// ============================================================================

/**
 * Generate idempotency key for certificate issuance
 * Key is based on intake_id + doctor_id + issue_date to prevent duplicates
 */
export function generateIdempotencyKey(
  intakeId: string,
  doctorId: string,
  issueDate: string
): string {
  const data = `${intakeId}:${doctorId}:${issueDate}`
  return crypto.createHash("sha256").update(data).digest("hex").slice(0, 32)
}

/**
 * Check if a valid certificate already exists for this intake
 */
export async function findExistingCertificate(
  intakeId: string
): Promise<IssuedCertificate | null> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from("issued_certificates")
    .select("id, intake_id, certificate_number, verification_code, idempotency_key, certificate_type, status, issue_date, start_date, end_date, patient_id, patient_name, patient_name_enc, patient_dob, doctor_id, doctor_name, doctor_nominals, doctor_provider_number, doctor_ahpra_number, template_id, template_version, template_config_snapshot, clinic_identity_snapshot, storage_path, pdf_hash, file_size_bytes, email_sent_at, email_delivery_id, email_failed_at, email_failure_reason, email_retry_count, email_opened_at, resend_count, revoked_at, revoked_by, revocation_reason, certificate_ref, created_at, updated_at")
    .eq("intake_id", intakeId)
    .eq("status", "valid")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    log.error("Failed to check existing certificate", { intakeId }, error)
    return null
  }

  if (!data) return null

  // Decrypt patient_name from encrypted column
  const decryptedName = await readCertificatePatientName(data)
  const { patient_name_enc: _enc, ...certWithoutEnc } = data
  return { ...certWithoutEnc, patient_name: decryptedName || certWithoutEnc.patient_name } as IssuedCertificate
}

/**
 * Check if certificate exists by idempotency key
 */
export async function findByIdempotencyKey(
  idempotencyKey: string
): Promise<IssuedCertificate | null> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from("issued_certificates")
    .select("id, intake_id, certificate_number, verification_code, idempotency_key, certificate_type, status, issue_date, start_date, end_date, patient_id, patient_name, patient_name_enc, patient_dob, doctor_id, doctor_name, doctor_nominals, doctor_provider_number, doctor_ahpra_number, template_id, template_version, template_config_snapshot, clinic_identity_snapshot, storage_path, pdf_hash, file_size_bytes, email_sent_at, email_delivery_id, email_failed_at, email_failure_reason, email_retry_count, email_opened_at, resend_count, revoked_at, revoked_by, revocation_reason, certificate_ref, created_at, updated_at")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle()

  if (error) {
    log.error("Failed to check idempotency key", { idempotencyKey }, error)
    return null
  }

  if (!data) return null

  const decryptedName = await readCertificatePatientName(data)
  const { patient_name_enc: _enc, ...certWithoutEnc } = data
  return { ...certWithoutEnc, patient_name: decryptedName || certWithoutEnc.patient_name } as IssuedCertificate
}

const MAX_CERTIFICATE_IDEMPOTENCY_REPLACEMENTS = 10

function generateReplacementIdempotencyKey(
  previousKey: string,
  invalidCertificateId: string,
): string {
  return crypto
    .createHash("sha256")
    .update(`${previousKey}:replacement:${invalidCertificateId}`)
    .digest("hex")
    .slice(0, 32)
}

/**
 * Keep first-issuance retries on the canonical intake/doctor/day key, while
 * allowing a revoked or historical invalid certificate to be replaced on the
 * same day. Each replacement deterministically derives its key from the prior
 * invalid row, so concurrent/retried replacement attempts converge on the same
 * key instead of weakening issuance idempotency with randomness.
 */
async function resolveCertificateIssuanceIdempotencyKey(
  intakeId: string,
  doctorId: string,
  issueDate: string,
): Promise<{ key?: string; error?: string }> {
  let key = generateIdempotencyKey(intakeId, doctorId, issueDate)

  for (let depth = 0; depth < MAX_CERTIFICATE_IDEMPOTENCY_REPLACEMENTS; depth++) {
    const existing = await findByIdempotencyKey(key)
    if (!existing || existing.status === "valid") {
      return { key }
    }

    log.warn("Rotating certificate idempotency key past invalid certificate", {
      intakeId,
      certificateId: existing.id,
      certificateStatus: existing.status,
      replacementDepth: depth + 1,
    })
    key = generateReplacementIdempotencyKey(key, existing.id)
  }

  return {
    error: "Certificate replacement history exceeded the safe idempotency limit",
  }
}

// ============================================================================
// CREATE / UPDATE
// ============================================================================

/**
 * Create a new issued certificate record
 * Returns existing certificate if idempotency key matches
 */
export async function createIssuedCertificate(
  input: CreateCertificateInput
): Promise<{ success: boolean; certificate?: IssuedCertificate; isExisting?: boolean; error?: string }> {
  const supabase = createServiceRoleClient()

  // Generate a deterministic idempotency key. Invalid historical certificates
  // form a replacement chain so a same-day reapproval cannot resolve back to a
  // revoked/superseded/expired row in the approval RPC.
  const idempotencyResolution = await resolveCertificateIssuanceIdempotencyKey(
    input.intake_id,
    input.doctor_id,
    input.issue_date
  )
  if (!idempotencyResolution.key) {
    log.error("Failed to resolve certificate idempotency key", {
      intakeId: input.intake_id,
      error: idempotencyResolution.error,
    })
    return { success: false, error: idempotencyResolution.error }
  }
  const idempotencyKey = idempotencyResolution.key

  // Check for existing certificate with same idempotency key
  const existing = await findByIdempotencyKey(idempotencyKey)
  if (existing) {
    log.info("Returning existing certificate (idempotent)", {
      certificateId: existing.id,
      certificateNumber: existing.certificate_number,
    })
    return { success: true, certificate: existing, isExisting: true }
  }

  // Also check if there's already a valid certificate for this intake
  const existingForIntake = await findExistingCertificate(input.intake_id)
  if (existingForIntake) {
    log.info("Valid certificate already exists for intake", {
      intakeId: input.intake_id,
      certificateId: existingForIntake.id,
    })
    return { success: true, certificate: existingForIntake, isExisting: true }
  }

  // Encrypt patient_name for write (dual-write: plaintext + encrypted)
  const patientNameFields = await prepareCertificatePatientNameWrite(input.patient_name)

  // Create new certificate record
  const { data, error } = await supabase
    .from("issued_certificates")
    .insert({
      intake_id: input.intake_id,
      certificate_number: input.certificate_number,
      verification_code: input.verification_code,
      idempotency_key: idempotencyKey,
      certificate_type: input.certificate_type,
      status: "valid",
      issue_date: input.issue_date,
      start_date: input.start_date,
      end_date: input.end_date,
      patient_id: input.patient_id,
      ...patientNameFields,
      patient_dob: input.patient_dob,
      doctor_id: input.doctor_id,
      doctor_name: input.doctor_name,
      doctor_nominals: input.doctor_nominals,
      doctor_provider_number: input.doctor_provider_number,
      doctor_ahpra_number: input.doctor_ahpra_number,
      template_id: input.template_id,
      template_version: input.template_version,
      template_config_snapshot: input.template_config_snapshot,
      clinic_identity_snapshot: input.clinic_identity_snapshot,
      storage_path: input.storage_path,
      pdf_hash: input.pdf_hash,
      file_size_bytes: input.file_size_bytes,
    })
    .select("id, certificate_number, intake_id, created_at")
    .single()

  if (error) {
    // Check if it's a unique constraint violation (race condition)
    if (error.code === "23505") {
      const existing = await findByIdempotencyKey(idempotencyKey)
      if (existing) {
        return { success: true, certificate: existing, isExisting: true }
      }
    }
    log.error("Failed to create certificate", {
      intakeId: input.intake_id,
      certificateType: input.certificate_type,
      hasPdfHash: Boolean(input.pdf_hash),
      fileSizeBytes: input.file_size_bytes,
      errorCode: error.code,
    }, error)
    return { success: false, error: error.message }
  }

  log.info("Certificate created", {
    certificateId: data.id,
    certificateNumber: input.certificate_number,
    intakeId: input.intake_id,
  })

  return { success: true, certificate: data as IssuedCertificate, isExisting: false }
}

// ============================================================================
// ATOMIC APPROVAL (uses PostgreSQL transaction via RPC)
// ============================================================================

export interface AtomicApprovalInput {
  intake_id: string
  certificate_number: string
  verification_code: string
  certificate_type: "work" | "study" | "carer"
  issue_date: string
  start_date: string
  end_date: string
  patient_id: string
  patient_name: string
  patient_dob: string | null
  doctor_id: string
  doctor_name: string
  doctor_nominals: string | null
  doctor_provider_number: string
  doctor_ahpra_number: string
  template_config_snapshot: Record<string, unknown>
  clinic_identity_snapshot: Record<string, unknown>
  storage_path: string
  file_size_bytes: number
  filename: string
  pdf_hash?: string // SHA-256 hash of PDF for integrity verification
  certificate_ref?: string // Template-based certificate ref (IM-TYPE-DATE-XXXXX)
}

export interface AtomicApprovalResult {
  success: boolean
  certificateId?: string
  intakeDocumentId?: string
  isExisting?: boolean
  error?: string
}

/**
 * Valid intake states that can be atomically approved.
 * States: paid (fresh from queue), in_review (doctor viewing), approved (idempotent).
 * NOTE: "processing" removed - we use claim mechanism (claimed_by/claimed_at) for locking.
 */
const APPROVABLE_INTAKE_STATES = ["paid", "in_review", "approved"] as const

/**
 * Atomically approve a certificate:
 * - Creates issued_certificates record
 * - Creates intake_documents record (legacy)
 * - Updates intake status to "approved"
 *
 * All operations happen in a single database transaction.
 * If any operation fails, all changes are rolled back.
 * 
 * P0 FIX: Validates intake state before calling RPC to prevent bypassing state machine
 */
export async function atomicApproveCertificate(
  input: AtomicApprovalInput
): Promise<AtomicApprovalResult> {
  const supabase = createServiceRoleClient()

  // P0 FIX: Pre-validate intake state before calling RPC
  // This prevents direct RPC calls from bypassing the state machine
  const { data: intakeCheck, error: intakeCheckError } = await supabase
    .from("intakes")
    .select("id, status, payment_status, claimed_by")
    .eq("id", input.intake_id)
    .single()

  if (intakeCheckError || !intakeCheck) {
    log.error("Intake validation failed - not found", { intakeId: input.intake_id }, intakeCheckError)
    return { success: false, error: "Intake not found" }
  }

  // Validate intake is in approvable state
  if (!APPROVABLE_INTAKE_STATES.includes(intakeCheck.status as typeof APPROVABLE_INTAKE_STATES[number])) {
    log.error("Intake validation failed - invalid state", {
      intakeId: input.intake_id,
      currentStatus: intakeCheck.status,
      allowedStates: APPROVABLE_INTAKE_STATES,
    })
    return { success: false, error: `Cannot approve intake in '${intakeCheck.status}' state` }
  }

  // Validate payment status
  if (intakeCheck.payment_status !== "paid") {
    log.error("Intake validation failed - payment not completed", {
      intakeId: input.intake_id,
      paymentStatus: intakeCheck.payment_status,
    })
    return { success: false, error: "Cannot approve intake without completed payment" }
  }

  // Validate doctor holds the claim (unless already approved - idempotent case)
  // For paid/in_review states, verify claim ownership to prevent race conditions
  // Auto-approval pipeline sets claimed_by = SYSTEM_AUTO_APPROVE_ID via claimForProcessing()
  const validClaimHolder =
    intakeCheck.status === "approved" ||
    intakeCheck.claimed_by === input.doctor_id ||
    intakeCheck.claimed_by === SYSTEM_AUTO_APPROVE_ID
  if (!validClaimHolder) {
    log.error("Intake validation failed - doctor does not hold claim", {
      intakeId: input.intake_id,
      claimedBy: intakeCheck.claimed_by,
      requestingDoctor: input.doctor_id,
    })
    return { success: false, error: "You do not have a claim on this intake" }
  }

  const idempotencyResolution = await resolveCertificateIssuanceIdempotencyKey(
    input.intake_id,
    input.doctor_id,
    input.issue_date
  )
  if (!idempotencyResolution.key) {
    log.error("Failed to resolve atomic certificate idempotency key", {
      intakeId: input.intake_id,
      error: idempotencyResolution.error,
    })
    return { success: false, error: idempotencyResolution.error }
  }
  const idempotencyKey = idempotencyResolution.key

  // Pre-encrypt patient name for PHI dual-write via RPC
  const phiWrite = await prepareCertificatePatientNameWrite(input.patient_name)

  log.info("Calling atomic approval RPC", {
    intakeId: input.intake_id,
    certificateNumber: input.certificate_number,
    idempotencyKey,
    preValidatedStatus: intakeCheck.status,
    phiEncrypted: phiWrite.patient_name_enc !== null,
  })

  const { data, error } = await supabase.rpc("atomic_approve_certificate", {
    p_intake_id: input.intake_id,
    p_certificate_number: input.certificate_number,
    p_verification_code: input.verification_code,
    p_idempotency_key: idempotencyKey,
    p_certificate_type: input.certificate_type,
    p_issue_date: input.issue_date,
    p_start_date: input.start_date,
    p_end_date: input.end_date,
    p_patient_id: input.patient_id,
    p_patient_name: input.patient_name,
    p_patient_dob: input.patient_dob,
    p_doctor_id: input.doctor_id,
    p_doctor_name: input.doctor_name,
    p_doctor_nominals: input.doctor_nominals,
    p_doctor_provider_number: input.doctor_provider_number,
    p_doctor_ahpra_number: input.doctor_ahpra_number,
    p_template_config_snapshot: input.template_config_snapshot,
    p_clinic_identity_snapshot: input.clinic_identity_snapshot,
    p_storage_path: input.storage_path,
    p_file_size_bytes: input.file_size_bytes,
    p_filename: input.filename,
    p_pdf_hash: input.pdf_hash || null,
    p_certificate_ref: input.certificate_ref || null,
    p_patient_name_enc: phiWrite.patient_name_enc,
  })

  if (error) {
    log.error("Atomic approval RPC failed", { intakeId: input.intake_id }, error)
    return { success: false, error: error.message }
  }

  // RPC returns array with single row
  const result = Array.isArray(data) ? data[0] : data

  if (!result?.success) {
    log.error("Atomic approval returned failure", {
      intakeId: input.intake_id,
      error: result?.error_message,
    })
    return { success: false, error: result?.error_message || "Unknown error" }
  }

  if (result.is_duplicate) {
    const duplicateCertificate = result.certificate_id
      ? await getCertificateById(result.certificate_id)
      : null

    if (
      !duplicateCertificate ||
      duplicateCertificate.intake_id !== input.intake_id ||
      duplicateCertificate.status !== "valid"
    ) {
      log.error("Atomic approval returned an invalid idempotent duplicate", {
        intakeId: input.intake_id,
        certificateId: result.certificate_id,
        certificateStatus: duplicateCertificate?.status,
      })
      return {
        success: false,
        error: "Existing idempotent certificate is no longer valid",
      }
    }
  }

  log.info("Atomic approval succeeded", {
    intakeId: input.intake_id,
    certificateId: result.certificate_id,
    isExisting: result.is_duplicate,
  })

  return {
    success: true,
    certificateId: result.certificate_id,
    intakeDocumentId: result.intake_document_id,
    isExisting: result.is_duplicate,
  }
}

/**
 * Update email delivery status
 */
export async function updateEmailStatus(
  certificateId: string,
  status: "sent" | "failed",
  details: {
    deliveryId?: string
    failureReason?: string
    /**
     * Compare-and-set guard for delivery bookkeeping. Certificate corrections
     * preserve the row ID while switching storage_path, so a provider response
     * for the previous PDF must not mark the replacement document delivered.
     */
    expectedStoragePath?: string
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceRoleClient()

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (status === "sent") {
    updateData.email_sent_at = new Date().toISOString()
    updateData.email_delivery_id = details.deliveryId
    updateData.email_failed_at = null
    updateData.email_failure_reason = null
  } else {
    updateData.email_failed_at = new Date().toISOString()
    updateData.email_failure_reason = details.failureReason
  }

  let updateQuery = supabase
    .from("issued_certificates")
    .update(updateData)
    .eq("id", certificateId)

  if (details.expectedStoragePath) {
    updateQuery = updateQuery
      .eq("storage_path", details.expectedStoragePath)
      .eq("status", "valid")
  }

  const { data: updatedCertificate, error } = await updateQuery
    .select("intake_id")
    .maybeSingle()

  if (error) {
    log.error("Failed to update email status", { certificateId, status }, error)
    return { success: false, error: error.message }
  }

  if (!updatedCertificate) {
    const error = details.expectedStoragePath
      ? "Certificate document version changed before email reconciliation"
      : "Certificate not found for email reconciliation"
    log.error("Certificate email status update matched no row", {
      certificateId,
      status,
      storageVersionGuarded: Boolean(details.expectedStoragePath),
    })
    return { success: false, error }
  }

  if (status === "sent") {
    const { error: intakeError } = await supabase
      .from("intakes")
      .update({
        document_sent_at: updateData.email_sent_at,
        generated_document_type: "medical_certificate",
      })
      .eq("id", updatedCertificate.intake_id)
      .is("document_sent_at", null)

    if (intakeError) {
      log.error("Failed to mirror certificate delivery onto intake", {
        certificateId,
        intakeId: updatedCertificate.intake_id,
      }, intakeError)
      return { success: false, error: intakeError.message }
    }
  }

  return { success: true }
}

/**
 * Count completed doctor corrections from the immutable certificate audit log.
 * `resend_count` is intentionally excluded: delivery retries and clinical
 * corrections are separate limits.
 */
export async function getCertificateCorrectionCount(
  certificateId: string,
): Promise<{ success: boolean; count?: number; error?: string }> {
  const supabase = createServiceRoleClient()

  const { count, error } = await supabase
    .from("certificate_audit_log")
    .select("id", { count: "exact", head: true })
    .eq("certificate_id", certificateId)
    .eq("event_type", "superseded")
    .contains("event_data", { reissue_reason: "doctor_correction" })

  if (error) {
    log.error("Failed to count certificate corrections", { certificateId }, error)
    return { success: false, error: error.message }
  }

  return { success: true, count: count ?? 0 }
}

/**
 * Atomically make a newly uploaded correction current and append its required
 * medicolegal audit event. The RPC locks the certificate row, re-checks the
 * three-correction cap, and rolls the row update back if the audit insert fails.
 */
export async function commitCertificateCorrection(
  input: CommitCertificateCorrectionInput,
): Promise<{
  success: boolean
  correctionCount?: number
  previousStoragePath?: string
  error?: string
}> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase.rpc("commit_certificate_correction", {
    p_certificate_id: input.certificateId,
    p_expected_storage_path: input.expectedStoragePath,
    p_new_storage_path: input.newStoragePath,
    p_patient_name: input.patientName,
    p_patient_name_enc: input.patientNameEnc,
    p_patient_dob: input.patientDob,
    p_certificate_type: input.certificateType,
    p_start_date: input.startDate,
    p_end_date: input.endDate,
    p_pdf_hash: input.pdfHash,
    p_file_size_bytes: input.fileSizeBytes,
    p_actor_id: input.actorId,
    p_actor_role: input.actorRole,
    p_pending_correction_event_id: input.pendingCorrectionEventId ?? null,
  })

  if (error) {
    log.error("Atomic certificate correction RPC failed", {
      certificateId: input.certificateId,
    }, error)
    return { success: false, error: error.message }
  }

  const result = Array.isArray(data) ? data[0] : data
  if (!result?.success) {
    const errorMessage = result?.error_message || "Certificate correction failed"
    log.error("Atomic certificate correction returned failure", {
      certificateId: input.certificateId,
      error: errorMessage,
    })
    return { success: false, error: errorMessage }
  }

  return {
    success: true,
    correctionCount: result.correction_count,
    previousStoragePath: result.previous_storage_path,
  }
}

export async function reserveCertificateResend(
  input: ReserveCertificateResendInput,
): Promise<{ success: boolean; attemptStatus?: string; error?: string }> {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase.rpc("reserve_certificate_resend", {
    p_attempt_id: input.attemptId,
    p_certificate_id: input.certificateId,
    p_actor_id: input.actorId,
    p_actor_role: input.actorRole,
    p_resend_reason: input.resendReason,
    p_count_toward_staff_limit: input.countTowardStaffLimit,
  })

  if (error) {
    log.error("Certificate resend reservation RPC failed", {
      certificateId: input.certificateId,
    }, error)
    return { success: false, error: error.message }
  }

  const result = Array.isArray(data) ? data[0] : data
  if (!result?.success) {
    return {
      success: false,
      error: result?.error_message || "Certificate resend reservation failed",
    }
  }

  return {
    success: true,
    attemptStatus: result.attempt_status,
  }
}

export async function reconcileCertificateResendAttempts(
  certificateId?: string | null,
): Promise<{ success: boolean; reconciledCount?: number; error?: string }> {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase.rpc("reconcile_certificate_resend_attempts", {
    p_certificate_id: certificateId ?? null,
  })

  if (error) {
    log.error("Certificate resend reconciliation RPC failed", { certificateId }, error)
    return { success: false, error: error.message }
  }

  const result = Array.isArray(data) ? data[0] : data
  if (!result?.success) {
    return {
      success: false,
      error: result?.error_message || "Certificate resend reconciliation failed",
    }
  }

  return { success: true, reconciledCount: result.reconciled_count }
}

export async function finalizeCertificateResend(
  input: FinalizeCertificateResendInput,
): Promise<{ success: boolean; isDuplicate?: boolean; error?: string }> {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase.rpc("finalize_certificate_resend", {
    p_attempt_id: input.attemptId,
    p_delivery_succeeded: input.deliverySucceeded,
    p_email_outbox_id: input.emailOutboxId ?? null,
    p_provider_message_id: input.providerMessageId ?? null,
    p_failure_reason: input.failureReason ?? null,
  })

  if (error) {
    log.error("Certificate resend finalization RPC failed", {
      attemptId: input.attemptId,
    }, error)
    return { success: false, error: error.message }
  }

  const result = Array.isArray(data) ? data[0] : data
  if (!result?.success) {
    return {
      success: false,
      error: result?.error_message || "Certificate resend finalization failed",
    }
  }

  return { success: true, isDuplicate: result.is_duplicate }
}

/**
 * Increment email retry count
 */
export async function incrementEmailRetry(
  certificateId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceRoleClient()

  const { data: cert, error: fetchError } = await supabase
    .from("issued_certificates")
    .select("email_retry_count")
    .eq("id", certificateId)
    .single()

  if (fetchError || !cert) {
    const errorMessage = fetchError?.message || "Certificate not found"
    log.error("Failed to read email retry count", { certificateId }, fetchError ?? undefined)
    return { success: false, error: errorMessage }
  }

  const { error: updateError } = await supabase
    .from("issued_certificates")
    .update({
      email_retry_count: (cert.email_retry_count || 0) + 1,
      email_failed_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", certificateId)

  if (updateError) {
    log.error("Failed to increment email retry count", { certificateId }, updateError)
    return { success: false, error: updateError.message }
  }

  return { success: true }
}

/**
 * Revoke a certificate
 */
export async function revokeCertificate(
  certificateId: string,
  revokedBy: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceRoleClient()

  const { error } = await supabase
    .from("issued_certificates")
    .update({
      status: "revoked",
      revoked_at: new Date().toISOString(),
      revoked_by: revokedBy,
      revocation_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq("id", certificateId)
    .eq("status", "valid")

  if (error) {
    log.error("Failed to revoke certificate", { certificateId }, error)
    return { success: false, error: error.message }
  }

  // Log the revocation event
  await logCertificateEvent(certificateId, "revoked", revokedBy, "admin", {
    reason,
  })

  log.info("Certificate revoked", { certificateId, revokedBy, reason })
  return { success: true }
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get certificate by ID
 */
export async function getCertificateById(
  certificateId: string
): Promise<IssuedCertificate | null> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from("issued_certificates")
    .select("id, intake_id, certificate_number, verification_code, idempotency_key, certificate_type, status, issue_date, start_date, end_date, patient_id, patient_name, patient_name_enc, patient_dob, doctor_id, doctor_name, doctor_nominals, doctor_provider_number, doctor_ahpra_number, template_id, template_version, template_config_snapshot, clinic_identity_snapshot, storage_path, pdf_hash, file_size_bytes, email_sent_at, email_delivery_id, email_failed_at, email_failure_reason, email_retry_count, email_opened_at, resend_count, revoked_at, revoked_by, revocation_reason, certificate_ref, created_at, updated_at")
    .eq("id", certificateId)
    .single()

  if (error) {
    log.error("Failed to get certificate", { certificateId }, error)
    return null
  }

  if (!data) return null
  const decryptedName = await readCertificatePatientName(data)
  const { patient_name_enc: _enc, ...certWithoutEnc } = data
  return { ...certWithoutEnc, patient_name: decryptedName || certWithoutEnc.patient_name } as IssuedCertificate
}

/**
 * Get certificate by verification code (for public verification)
 */
export async function getCertificateByVerificationCode(
  verificationCode: string
): Promise<IssuedCertificate | null> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from("issued_certificates")
    .select("id, intake_id, certificate_number, verification_code, idempotency_key, certificate_type, status, issue_date, start_date, end_date, patient_id, patient_name, patient_name_enc, patient_dob, doctor_id, doctor_name, doctor_nominals, doctor_provider_number, doctor_ahpra_number, template_id, template_version, template_config_snapshot, clinic_identity_snapshot, storage_path, pdf_hash, file_size_bytes, email_sent_at, email_delivery_id, email_failed_at, email_failure_reason, email_retry_count, email_opened_at, resend_count, revoked_at, revoked_by, revocation_reason, certificate_ref, created_at, updated_at")
    .eq("verification_code", verificationCode)
    .maybeSingle()

  if (error) {
    return null
  }

  if (!data) return null
  const decryptedName = await readCertificatePatientName(data)
  const { patient_name_enc: _enc, ...certWithoutEnc } = data
  return { ...certWithoutEnc, patient_name: decryptedName || certWithoutEnc.patient_name } as IssuedCertificate
}

/**
 * Get a certificate by its public reference ID (IM-TYPE-DATE-XXXXX format).
 * Used for the /verify/[certificate_ref] public verification page.
 */
export async function getCertificateByRef(
  certificateRef: string
): Promise<IssuedCertificate | null> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from("issued_certificates")
    .select("id, intake_id, certificate_number, verification_code, idempotency_key, certificate_type, status, issue_date, start_date, end_date, patient_id, patient_name, patient_name_enc, patient_dob, doctor_id, doctor_name, doctor_nominals, doctor_provider_number, doctor_ahpra_number, template_id, template_version, template_config_snapshot, clinic_identity_snapshot, storage_path, pdf_hash, file_size_bytes, email_sent_at, email_delivery_id, email_failed_at, email_failure_reason, email_retry_count, email_opened_at, resend_count, revoked_at, revoked_by, revocation_reason, certificate_ref, created_at, updated_at")
    .eq("certificate_ref", certificateRef)
    .maybeSingle()

  if (error) {
    return null
  }

  if (!data) return null
  const decryptedName = await readCertificatePatientName(data)
  const { patient_name_enc: _enc, ...certWithoutEnc } = data
  return { ...certWithoutEnc, patient_name: decryptedName || certWithoutEnc.patient_name } as IssuedCertificate
}

/**
 * Get certificates for a patient
 */
export async function getPatientCertificates(
  patientId: string
): Promise<IssuedCertificate[]> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from("issued_certificates")
    .select("id, intake_id, certificate_number, verification_code, idempotency_key, certificate_type, status, issue_date, start_date, end_date, patient_id, patient_name, patient_name_enc, patient_dob, doctor_id, doctor_name, doctor_nominals, doctor_provider_number, doctor_ahpra_number, template_id, template_version, template_config_snapshot, clinic_identity_snapshot, storage_path, pdf_hash, file_size_bytes, email_sent_at, email_delivery_id, email_failed_at, email_failure_reason, email_retry_count, email_opened_at, resend_count, revoked_at, revoked_by, revocation_reason, certificate_ref, created_at, updated_at")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false })

  if (error) {
    log.error("Failed to get patient certificates", { patientId }, error)
    return []
  }

  const decryptedCerts = await Promise.all((data || []).map(async (cert) => {
    const decryptedName = await readCertificatePatientName(cert)
    const { patient_name_enc: _enc, ...certWithoutEnc } = cert
    return { ...certWithoutEnc, patient_name: decryptedName || certWithoutEnc.patient_name } as IssuedCertificate
  }))
  return decryptedCerts
}

/**
 * Get certificate for an intake
 */
export async function getCertificateForIntake(
  intakeId: string
): Promise<IssuedCertificate | null> {
  const supabase = createServiceRoleClient()

  // Current/download-ready behavior must only resolve a valid certificate.
  // Historical revoked/superseded/expired rows remain available by explicit
  // history/id lookup, but must never be treated as the current document.
  const { data, error } = await supabase
    .from("issued_certificates")
    .select("id, intake_id, certificate_number, verification_code, idempotency_key, certificate_type, status, issue_date, start_date, end_date, patient_id, patient_name, patient_name_enc, patient_dob, doctor_id, doctor_name, doctor_nominals, doctor_provider_number, doctor_ahpra_number, template_id, template_version, template_config_snapshot, clinic_identity_snapshot, storage_path, pdf_hash, file_size_bytes, email_sent_at, email_delivery_id, email_failed_at, email_failure_reason, email_retry_count, email_opened_at, resend_count, revoked_at, revoked_by, revocation_reason, certificate_ref, created_at, updated_at")
    .eq("intake_id", intakeId)
    .eq("status", "valid")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    log.error("Failed to get certificate for intake", { intakeId }, error)
    return null
  }

  if (!data) return null
  const decryptedName = await readCertificatePatientName(data)
  const { patient_name_enc: _enc, ...certWithoutEnc } = data
  return { ...certWithoutEnc, patient_name: decryptedName || certWithoutEnc.patient_name } as IssuedCertificate
}

/**
 * Whether this intake has any canonical certificate history, including
 * revoked/superseded/expired rows. Database errors fail closed as `true` so a
 * legacy document can never be resurrected during a canonical lookup outage.
 */
export async function hasIssuedCertificateHistory(intakeId: string): Promise<boolean> {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from("issued_certificates")
    .select("id")
    .eq("intake_id", intakeId)
    .limit(1)
    .maybeSingle()

  if (error) {
    log.error("Failed to check issued certificate history", { intakeId }, error)
    return true
  }

  return Boolean(data)
}

/**
 * Get certificate for intake with patient download URL for display.
 * The URL points at the authenticated streaming route so downloads remain
 * ownership-checked and audit-logged. Do not expose storage signed URLs here.
 * Returns a format compatible with GeneratedDocument interface
 */
export async function getCertificateWithPdfUrl(
  intakeId: string
): Promise<{
  id: string
  intake_id: string
  type: string
  subtype: string
  pdf_url: string
  verification_code: string
  created_at: string
  updated_at: string
} | null> {
  const certificate = await getCertificateForIntake(intakeId)
  
  if (!certificate || certificate.status !== "valid") {
    return null
  }
  
  return {
    id: certificate.id,
    intake_id: intakeId,
    type: "med_cert",
    subtype: certificate.certificate_type,
    pdf_url: getPatientCertificateDownloadHref(certificate.id),
    verification_code: certificate.verification_code,
    created_at: certificate.created_at,
    updated_at: certificate.updated_at,
  }
}

/**
 * Fetches certificates where email delivery failed and has not subsequently
 * succeeded. Used to render a self-serve banner on the patient dashboard.
 *
 * Returns at most 5 rows ordered by most recent failure first. Filters to
 * non-revoked, non-superseded statuses so the banner does not nag about
 * certs that have been intentionally invalidated.
 */
export async function getPatientUndeliveredCertificates(
  patientId: string,
): Promise<Array<{
  intakeId: string
  certificateRef: string | null
  certificateType: string | null
  failedAt: string
  retryCount: number
}>> {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from("issued_certificates")
    .select(
      "intake_id, certificate_ref, certificate_number, certificate_type, email_failed_at, email_retry_count, status",
    )
    .eq("patient_id", patientId)
    .not("email_failed_at", "is", null)
    .is("email_sent_at", null)
    .order("email_failed_at", { ascending: false })
    .limit(5)

  if (error || !data) {
    if (error) {
      log.error("Failed to fetch undelivered certificates", { patientId }, error)
    }
    return []
  }

  type Row = {
    intake_id: string
    certificate_ref: string | null
    certificate_number: string | null
    certificate_type: string | null
    email_failed_at: string
    email_retry_count: number | null
    status: string | null
  }

  return (data as Row[])
    .filter((row) => row.status !== "revoked" && row.status !== "superseded")
    .map((row) => ({
      intakeId: row.intake_id,
      certificateRef: row.certificate_ref ?? row.certificate_number ?? null,
      certificateType: row.certificate_type ?? null,
      failedAt: row.email_failed_at,
      retryCount: row.email_retry_count ?? 0,
    }))
}

/**
 * Get failed email deliveries for admin queue
 */
export async function getFailedEmailDeliveries(
  limit: number = 50
): Promise<IssuedCertificate[]> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from("issued_certificates")
    .select("id, intake_id, certificate_number, verification_code, idempotency_key, certificate_type, status, issue_date, start_date, end_date, patient_id, patient_name, patient_name_enc, patient_dob, doctor_id, doctor_name, doctor_nominals, doctor_provider_number, doctor_ahpra_number, template_id, template_version, template_config_snapshot, clinic_identity_snapshot, storage_path, pdf_hash, file_size_bytes, email_sent_at, email_delivery_id, email_failed_at, email_failure_reason, email_retry_count, email_opened_at, resend_count, revoked_at, revoked_by, revocation_reason, certificate_ref, created_at, updated_at")
    .not("email_failed_at", "is", null)
    .is("email_sent_at", null)
    .lt("email_retry_count", 3)
    .order("email_failed_at", { ascending: true })
    .limit(limit)

  if (error) {
    log.error("Failed to get failed email deliveries", {}, error)
    return []
  }

  const decryptedCerts = await Promise.all((data || []).map(async (cert) => {
    const decryptedName = await readCertificatePatientName(cert)
    const { patient_name_enc: _enc, ...certWithoutEnc } = cert
    return { ...certWithoutEnc, patient_name: decryptedName || certWithoutEnc.patient_name } as IssuedCertificate
  }))
  return decryptedCerts
}

// ============================================================================
// AUDIT LOGGING
// ============================================================================

/**
 * Log a certificate event
 */
export async function logCertificateEvent(
  certificateId: string,
  eventType: CertificateEventType,
  actorId: string | null,
  actorRole: "patient" | "doctor" | "admin" | "support" | "system",
  eventData: Record<string, unknown> = {},
  ipAddress?: string,
  userAgent?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceRoleClient()

  const { error } = await supabase
    .from("certificate_audit_log")
    .insert({
      certificate_id: certificateId,
      event_type: eventType,
      actor_id: actorId,
      actor_role: actorRole,
      event_data: eventData,
      ip_address: ipAddress,
      user_agent: userAgent,
    })

  if (error) {
    log.error("Failed to log certificate event", { certificateId, eventType }, error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

// ============================================================================
// SECURE DOWNLOAD
// ============================================================================

/**
 * Generate a signed URL for certificate download
 */
export async function generateSignedDownloadUrl(
  storagePath: string,
  expiresInSeconds: number = 300 // 5 minutes default
): Promise<{ success: boolean; url?: string; error?: string }> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase.storage
    .from("documents")
    .createSignedUrl(storagePath, expiresInSeconds)

  if (error) {
    log.error("Failed to generate signed URL", { storagePath }, error)
    return { success: false, error: error.message }
  }

  return { success: true, url: data.signedUrl }
}

/**
 * Verify certificate ownership and generate a signed URL.
 *
 * This helper is deliberately side-effect free. The authenticated route owns
 * the single durable download audit event because it knows the real requester
 * and role (patient, issuing doctor, or admin).
 */
export async function getSecureDownloadUrl(
  certificateId: string,
  patientId: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  const certificate = await getCertificateById(certificateId)

  if (!certificate) {
    return { success: false, error: "Certificate not found" }
  }

  if (certificate.patient_id !== patientId) {
    return { success: false, error: "Unauthorized" }
  }

  if (certificate.status !== "valid") {
    return { success: false, error: "Certificate is no longer valid" }
  }

  return generateSignedDownloadUrl(certificate.storage_path)
}

// ============================================================================
// CERTIFICATE EDIT TRACKING (Medicolegal requirement)
// ============================================================================

interface CertificateEdit {
  fieldName: string
  originalValue: string | null
  newValue: string | null
  editReason?: string
}

/**
 * Log a single certificate field edit
 */
export async function logCertificateEdit(
  certificateId: string | null,
  intakeId: string,
  doctorId: string,
  fieldName: string,
  originalValue: string | null,
  newValue: string | null,
  editReason?: string
): Promise<{ success: boolean; editId?: string; error?: string }> {
  try {
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase.rpc("log_certificate_edit", {
      p_certificate_id: certificateId,
      p_intake_id: intakeId,
      p_doctor_id: doctorId,
      p_field_name: fieldName,
      p_original_value: originalValue,
      p_new_value: newValue,
      p_edit_reason: editReason || null,
    })

    if (error) {
      // If RPC doesn't exist (migration not run), log warning and continue
      if (error.message?.includes("function") || error.code === "42883") {
        log.warn("Certificate edit tracking not available (migration pending)", { intakeId, fieldName })
        return { success: false, error: "Feature not yet enabled" }
      }
      log.error("Failed to log certificate edit", { intakeId, fieldName, error })
      return { success: false, error: error.message }
    }

    return { success: true, editId: data }
  } catch (err) {
    // Gracefully handle any unexpected errors - edit logging is not critical
    log.warn("Certificate edit logging failed (non-blocking)", {
      intakeId,
      fieldName,
      error: err instanceof Error ? err.message : String(err)
    })
    return { success: false, error: "Edit logging temporarily unavailable" }
  }
}

/**
 * Log multiple certificate edits at once
 * Compares original intake data with review data and logs all differences
 */
export async function logCertificateEdits(
  certificateId: string | null,
  intakeId: string,
  doctorId: string,
  edits: CertificateEdit[]
): Promise<{ success: boolean; editCount: number; errors: string[] }> {
  const errors: string[] = []
  let editCount = 0

  for (const edit of edits) {
    // Skip if values are the same
    if (edit.originalValue === edit.newValue) continue

    const result = await logCertificateEdit(
      certificateId,
      intakeId,
      doctorId,
      edit.fieldName,
      edit.originalValue,
      edit.newValue,
      edit.editReason
    )

    if (result.success) {
      editCount++
    } else if (result.error) {
      errors.push(`${edit.fieldName}: ${result.error}`)
    }
  }

  return { success: errors.length === 0, editCount, errors }
}

/**
 * Get edit history for a certificate
 */
export async function getCertificateEditHistory(
  certificateId: string
): Promise<{
  edits: Array<{
    id: string
    fieldName: string
    originalValue: string | null
    newValue: string | null
    changeSummary: string | null
    editTimestamp: string
    doctorName: string
  }>
  error?: string
}> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from("certificate_edit_history")
    .select(`
      id,
      field_name,
      original_value,
      new_value,
      change_summary,
      edit_timestamp,
      doctor:profiles!doctor_id(full_name)
    `)
    .eq("certificate_id", certificateId)
    .order("edit_timestamp", { ascending: true })

  if (error) {
    return { edits: [], error: error.message }
  }

  return {
    edits: (data || []).map((row) => {
      // Handle the doctor relation - may be object or array depending on Supabase client version
      const doctor = row.doctor as unknown
      const doctorObj = Array.isArray(doctor) ? doctor[0] : doctor
      const doctorName = (doctorObj as { full_name?: string } | null)?.full_name || "Unknown"
      return {
        id: row.id,
        fieldName: row.field_name,
        originalValue: row.original_value,
        newValue: row.new_value,
        changeSummary: row.change_summary,
        editTimestamp: row.edit_timestamp,
        doctorName,
      }
    }),
  }
}

/**
 * Helper to compare intake answers with review data and generate edit list
 */
export function compareForEdits(
  originalAnswers: Record<string, unknown> | null,
  reviewData: {
    startDate: string
    endDate: string
    medicalReason?: string
    consultDate?: string
  }
): CertificateEdit[] {
  const edits: CertificateEdit[] = []

  if (!originalAnswers) {
    // If no original answers, we can't compare
    return edits
  }

  // Compare start date
  const originalStartDate = originalAnswers.start_date as string | undefined ||
                           originalAnswers.startDate as string | undefined
  if (originalStartDate && originalStartDate !== reviewData.startDate) {
    edits.push({
      fieldName: "start_date",
      originalValue: originalStartDate,
      newValue: reviewData.startDate,
    })
  }

  // Compare end date (calculated from duration in original)
  const originalDuration = originalAnswers.duration as string | number | undefined
  const originalStart = originalAnswers.start_date as string | undefined ||
                       originalAnswers.startDate as string | undefined
  if (originalStart && originalDuration) {
    const durationDays = typeof originalDuration === "string"
      ? parseInt(originalDuration.replace(/\D/g, "") || "1", 10)
      : originalDuration
    const expectedEnd = new Date(originalStart)
    expectedEnd.setDate(expectedEnd.getDate() + durationDays - 1)
    const originalEndDate = expectedEnd.toISOString().split("T")[0]

    if (originalEndDate !== reviewData.endDate) {
      edits.push({
        fieldName: "end_date",
        originalValue: originalEndDate,
        newValue: reviewData.endDate,
      })
    }
  }

  // Compare medical reason (symptom details)
  const originalReason = originalAnswers.symptom_details as string | undefined ||
                        originalAnswers.symptomDetails as string | undefined ||
                        originalAnswers.medical_reason as string | undefined
  if (reviewData.medicalReason && originalReason && originalReason !== reviewData.medicalReason) {
    edits.push({
      fieldName: "medical_reason",
      originalValue: originalReason,
      newValue: reviewData.medicalReason,
    })
  }

  return edits
}

// ============================================================================
// DELIVERY STATUS
// ============================================================================

export interface CertDeliveryStatus {
  emailSentAt: string | null
  emailFailedAt: string | null
  emailFailureReason: string | null
  emailOpenedAt: string | null
  resendCount: number
}

/**
 * Get certificate delivery status for an intake (for doctor visibility).
 * Returns null if no certificate exists.
 */
export async function getCertDeliveryStatus(intakeId: string): Promise<CertDeliveryStatus | null> {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from("issued_certificates")
    .select("email_sent_at, email_failed_at, email_failure_reason, email_opened_at, resend_count")
    .eq("intake_id", intakeId)
    .neq("status", "revoked")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) return null

  return {
    emailSentAt: data.email_sent_at,
    emailFailedAt: data.email_failed_at,
    emailFailureReason: data.email_failure_reason,
    emailOpenedAt: data.email_opened_at,
    resendCount: data.resend_count,
  }
}
