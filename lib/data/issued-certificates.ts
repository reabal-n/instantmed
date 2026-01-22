/**
 * Issued Certificates Data Layer
 * Production-grade certificate management with idempotency and audit trail
 */

import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createLogger } from "@/lib/observability/logger"
import crypto from "crypto"
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
  revoked_at: string | null
  revoked_by: string | null
  revocation_reason: string | null
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
    .select("*")
    .eq("intake_id", intakeId)
    .eq("status", "valid")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    log.error("Failed to check existing certificate", { intakeId }, error)
    return null
  }

  return data as IssuedCertificate | null
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
    .select("*")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle()

  if (error) {
    log.error("Failed to check idempotency key", { idempotencyKey }, error)
    return null
  }

  return data as IssuedCertificate | null
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

  // Generate idempotency key
  const idempotencyKey = generateIdempotencyKey(
    input.intake_id,
    input.doctor_id,
    input.issue_date
  )

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
      patient_name: input.patient_name,
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
    .select()
    .single()

  if (error) {
    // Check if it's a unique constraint violation (race condition)
    if (error.code === "23505") {
      const existing = await findByIdempotencyKey(idempotencyKey)
      if (existing) {
        return { success: true, certificate: existing, isExisting: true }
      }
    }
    log.error("Failed to create certificate", { input }, error)
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
}

export interface AtomicApprovalResult {
  success: boolean
  certificateId?: string
  intakeDocumentId?: string
  isExisting?: boolean
  error?: string
}

/**
 * Atomically approve a certificate:
 * - Creates issued_certificates record
 * - Creates intake_documents record (legacy)
 * - Updates intake status to "approved"
 *
 * All operations happen in a single database transaction.
 * If any operation fails, all changes are rolled back.
 */
export async function atomicApproveCertificate(
  input: AtomicApprovalInput
): Promise<AtomicApprovalResult> {
  const supabase = createServiceRoleClient()

  // Generate idempotency key
  const idempotencyKey = generateIdempotencyKey(
    input.intake_id,
    input.doctor_id,
    input.issue_date
  )

  log.info("Calling atomic approval RPC", {
    intakeId: input.intake_id,
    certificateNumber: input.certificate_number,
    idempotencyKey,
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

  const { error } = await supabase
    .from("issued_certificates")
    .update(updateData)
    .eq("id", certificateId)

  if (error) {
    log.error("Failed to update email status", { certificateId, status }, error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Increment email retry count
 */
export async function incrementEmailRetry(
  certificateId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceRoleClient()

  const { error } = await supabase.rpc("increment_email_retry", {
    cert_id: certificateId,
  })

  if (error) {
    // Fallback to manual increment
    const { data: cert } = await supabase
      .from("issued_certificates")
      .select("email_retry_count")
      .eq("id", certificateId)
      .single()

    if (cert) {
      await supabase
        .from("issued_certificates")
        .update({
          email_retry_count: (cert.email_retry_count || 0) + 1,
          email_failed_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", certificateId)
    }
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
    .select("*")
    .eq("id", certificateId)
    .single()

  if (error) {
    log.error("Failed to get certificate", { certificateId }, error)
    return null
  }

  return data as IssuedCertificate
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
    .select("*")
    .eq("verification_code", verificationCode)
    .single()

  if (error) {
    return null
  }

  return data as IssuedCertificate
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
    .select("*")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false })

  if (error) {
    log.error("Failed to get patient certificates", { patientId }, error)
    return []
  }

  return (data || []) as IssuedCertificate[]
}

/**
 * Get certificate for an intake
 */
export async function getCertificateForIntake(
  intakeId: string
): Promise<IssuedCertificate | null> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from("issued_certificates")
    .select("*")
    .eq("intake_id", intakeId)
    .eq("status", "valid")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    log.error("Failed to get certificate for intake", { intakeId }, error)
    return null
  }

  return data as IssuedCertificate | null
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
    .select("*")
    .not("email_failed_at", "is", null)
    .is("email_sent_at", null)
    .lt("email_retry_count", 3)
    .order("email_failed_at", { ascending: true })
    .limit(limit)

  if (error) {
    log.error("Failed to get failed email deliveries", {}, error)
    return []
  }

  return (data || []) as IssuedCertificate[]
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
  actorRole: "patient" | "doctor" | "admin" | "system",
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
 * Verify patient owns the certificate and generate download URL
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

  const result = await generateSignedDownloadUrl(certificate.storage_path)

  if (result.success) {
    // Log the download event
    await logCertificateEvent(certificateId, "downloaded", patientId, "patient")
  }

  return result
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
