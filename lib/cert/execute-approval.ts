import crypto from "crypto"
import { revalidatePath } from "next/cache"
import { sendEmail } from "@/lib/email/send-email"
import { MedCertPatientEmail, medCertPatientEmailSubject } from "@/components/email/templates"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { env } from "@/lib/env"
import { logger } from "@/lib/observability/logger"
import { getPostHogClient, trackIntakeFunnelStep } from "@/lib/posthog-server"
import { generateVerificationCode, generateCertificateNumber, generateCertificateRef } from "@/lib/pdf/cert-identifiers"
import { renderTemplatePdf } from "@/lib/pdf/template-renderer"
import {
  findExistingCertificate,
  atomicApproveCertificate,
  updateEmailStatus,
  logCertificateEvent,
  logCertificateEdits,
  compareForEdits,
} from "@/lib/data/issued-certificates"
import { getDoctorIdentity } from "@/lib/data/doctor-identity"
import { createNotification } from "@/lib/notifications/service"
import { getAbsenceDays } from "@/lib/stripe/price-mapping"
import * as Sentry from "@sentry/nextjs"
import type { CertReviewData } from "@/types/db"
import { DEFAULT_TEMPLATE_CONFIG } from "@/types/certificate-template"
import { COMPANY_NAME, ABN, COMPANY_ADDRESS, CONTACT_PHONE, CONTACT_EMAIL } from "@/lib/constants"
import { formatDateLong, formatShortDate, formatShortDateSafe } from "@/lib/format"

// ============================================================================
// TYPES
// ============================================================================

export interface ApproveCertResult {
  success: boolean
  error?: string
  certificateId?: string
  isExisting?: boolean
  emailSent?: boolean
}

export interface ExecuteCertApprovalInput {
  intakeId: string
  reviewData: CertReviewData
  doctorProfile: {
    id: string
    full_name: string
    provider_number: string
    ahpra_number: string
  }
  /** Skip the claim_intake_for_review RPC - used by auto-approval (no doctor "claiming") */
  skipClaim?: boolean
  /** Mark this intake as AI-approved in the database */
  aiApproved?: boolean
  /** Reason for AI auto-approval (stored for audit) */
  aiApprovalReason?: string
}

// ============================================================================
// CORE APPROVAL PIPELINE
// ============================================================================

/**
 * Execute the full certificate approval pipeline:
 * fetch intake → validate → generate PDF → upload → atomic DB update → email → notify
 *
 * This is the shared core used by both doctor manual approval and AI auto-approval.
 * Auth, rate limiting, and credential validation are the caller's responsibility.
 */
export async function executeCertApproval(
  input: ExecuteCertApprovalInput
): Promise<ApproveCertResult> {
  const { intakeId, reviewData, doctorProfile, skipClaim = false, aiApproved = false, aiApprovalReason } = input

  const supabase = createServiceRoleClient()

  // 1. Fetch the intake with patient details, service info, and answers
  const { data: intake, error: intakeError } = await supabase
    .from("intakes")
    .select(`
      *,
      service:services!service_id(
        id,
        slug,
        name,
        type
      ),
      patient:profiles!patient_id(
        id,
        full_name,
        email,
        date_of_birth,
        referral_code
      ),
      answers:intake_answers(
        answers
      )
    `)
    .eq("id", intakeId)
    .single()

  if (intakeError || !intake) {
    logger.error("Intake not found", { intakeId, error: intakeError })
    return { success: false, error: "Intake not found" }
  }

  // Verify it's a medical certificate service
  const service = intake.service as { id: string; slug: string; name: string; type: string } | null
  if (!service || service.type !== "med_certs") {
    logger.warn("Intake is not a medical certificate service", { intakeId, serviceType: service?.type, serviceSlug: service?.slug })
    return { success: false, error: "This action is only for medical certificate intakes" }
  }

  // Verify intake is in reviewable status (allow approved for idempotency)
  // When skipClaim=true (auto-approval), only accept "paid" to prevent racing with a doctor mid-review
  const allowedStatuses = skipClaim
    ? ["paid", "approved"]
    : ["paid", "in_review", "approved"]
  if (!allowedStatuses.includes(intake.status)) {
    return { success: false, error: `Intake is already ${intake.status}` }
  }

  // IDEMPOTENCY CHECK: If already approved, return existing certificate
  if (intake.status === "approved") {
    const existingCert = await findExistingCertificate(intakeId)
    if (existingCert) {
      logger.info("Returning existing certificate (idempotent approval)", {
        intakeId,
        certificateId: existingCert.id,
        certificateNumber: existingCert.certificate_number,
      })
      return {
        success: true,
        certificateId: existingCert.id,
        isExisting: true,
      }
    }
    logger.info("Regenerating certificate for approved intake (no valid cert found)", { intakeId })
  } else if (!skipClaim) {
    // Use atomic claim RPC with row locking to prevent race condition
    Sentry.addBreadcrumb({ category: "cert.flow", message: "Claiming intake for review", level: "info", data: { intakeId } })
    const { data: claimResult, error: claimError } = await supabase.rpc("claim_intake_for_review", {
      p_intake_id: intakeId,
      p_doctor_id: doctorProfile.id,
      p_force: false,
    })

    const claim = Array.isArray(claimResult) ? claimResult[0] : claimResult

    if (claimError || !claim?.success) {
      const errorMsg = claim?.error_message || claimError?.message || "Failed to claim intake"
      logger.warn("Failed to claim intake for review", {
        intakeId,
        claimError: errorMsg,
        currentClaimant: claim?.current_claimant
      })
      return { success: false, error: errorMsg }
    }
  }
  // When skipClaim=true (auto-approval), we proceed without claiming.
  // The atomicApproveCertificate RPC validates intake state internally.

  const patient = intake.patient as { id: string; full_name: string; email: string; date_of_birth: string | null; referral_code: string | null } | null
  if (!patient || !patient.email) {
    return { success: false, error: "Patient email not found" }
  }

  // 2. Prepare PDF data
  const intakeSubtype = (intake as Record<string, unknown>).subtype as string | undefined
  const certificateType: "work" | "study" | "carer" =
    intakeSubtype === "study" || intakeSubtype === "carer" || intakeSubtype === "work"
      ? intakeSubtype
      : service.slug.includes("carer") ? "carer" : "work"

  const certificateNumber = generateCertificateNumber()
  const generatedAt = new Date().toISOString()

  // Validate and calculate duration days
  const startDate = new Date(reviewData.startDate)
  const endDate = new Date(reviewData.endDate)

  if (endDate < startDate) {
    logger.warn("Invalid certificate dates: end date before start date", { intakeId, startDate: reviewData.startDate, endDate: reviewData.endDate })
    return { success: false, error: "End date cannot be before start date" }
  }

  const maxDurationMs = 30 * 24 * 60 * 60 * 1000
  if (endDate.getTime() - startDate.getTime() > maxDurationMs) {
    logger.warn("Certificate duration exceeds maximum", { intakeId, startDate: reviewData.startDate, endDate: reviewData.endDate })
    return { success: false, error: "Certificate duration cannot exceed 30 days" }
  }

  const durationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1

  // Get intake answers
  const answersRaw = intake.answers as unknown as { answers: Record<string, unknown> }[] | { answers: Record<string, unknown> } | null
  const answersObj = Array.isArray(answersRaw) ? answersRaw[0] : answersRaw
  const answersData = answersObj?.answers || null

  // Duration-tier mismatch check
  if (!answersData) {
    // Missing answers means we can't verify the paid tier - log but don't block
    // (auto-approval engine already hard-blocks duration_unknown before reaching here)
    logger.warn("Certificate answers missing - cannot verify paid duration tier", { intakeId })
    Sentry.captureMessage("Certificate approved with missing intake answers - paid tier unverifiable", {
      level: "warning",
      tags: { subsystem: "cert-pipeline", intake_id: intakeId },
    })
  }

  const paidDurationDays = getAbsenceDays(answersData ?? undefined)

  if (durationDays > paidDurationDays) {
    // Hard block: never issue more days than the patient paid for
    logger.warn("Certificate duration exceeds paid tier - blocking approval", {
      intakeId,
      paidDurationDays,
      approvedDurationDays: durationDays,
      startDate: reviewData.startDate,
      endDate: reviewData.endDate,
    })
    if (!skipClaim) {
      await supabase.rpc("release_intake_claim", { p_intake_id: intakeId, p_doctor_id: doctorProfile.id })
        .then(({ error }) => { if (error) logger.warn("Failed to release claim after duration block", { intakeId, error: error.message }) })
    }
    return {
      success: false,
      error: `Certificate duration (${durationDays} day${durationDays !== 1 ? "s" : ""}) exceeds the paid tier (${paidDurationDays} day${paidDurationDays !== 1 ? "s" : ""}). Please adjust the dates or contact support.`,
    }
  }

  if (durationDays < paidDurationDays) {
    // Soft flag: issuing fewer days is unusual but can be clinically appropriate
    logger.warn("Certificate duration is less than paid tier", {
      intakeId,
      paidDurationDays,
      approvedDurationDays: durationDays,
      startDate: reviewData.startDate,
      endDate: reviewData.endDate,
    })
    Sentry.addBreadcrumb({
      category: "cert.audit",
      message: `Duration under paid tier: paid ${paidDurationDays}d, approved ${durationDays}d`,
      level: "warning",
      data: { intakeId, paidDurationDays, approvedDurationDays: durationDays },
    })
  }

  const patientDob = patient.date_of_birth || null

  const verificationCode = generateVerificationCode(certificateNumber)

  // 3. Fetch doctor identity (outside the ref-retry loop - doesn't vary per attempt)
  const doctorIdentityForPdf = await getDoctorIdentity(doctorProfile.id)
  if (!doctorIdentityForPdf) {
    if (!skipClaim) {
      await supabase.rpc("release_intake_claim", { p_intake_id: intakeId, p_doctor_id: doctorProfile.id })
        .then(({ error }) => { if (error) logger.warn("Failed to release claim after identity failure", { intakeId, error: error.message }) })
    }
    return { success: false, error: "Doctor identity not found" }
  }

  // 3+4. Generate PDF + upload with certificateRef collision retry.
  //
  // WHY upsert: false - certificateRef has 100M possibilities per type/day. A collision
  // (two intakes drawing the same ref) is astronomically unlikely but possible. With
  // upsert: true, Intake B would silently overwrite Intake A's PDF in storage, then the
  // DB unique constraint would reject Intake B, and its cleanup would delete the now-shared
  // storage object - leaving Intake A's DB record pointing to a deleted file. With
  // upsert: false, a collision surfaces as a 409 and we regenerate the ref and re-render
  // on the next iteration. The DB UNIQUE constraint on certificate_ref is the hard guard.
  const MAX_CERT_REF_ATTEMPTS = 3
  let certificateRef = generateCertificateRef(certificateType)
  let pdfBuffer: Buffer | undefined
  let storagePath = ""

  for (let certAttempt = 0; certAttempt < MAX_CERT_REF_ATTEMPTS; certAttempt++) {
    storagePath = `certificates/${certificateRef}.pdf`

    // 3. Render PDF with current ref
    Sentry.addBreadcrumb({ category: "cert.flow", message: "Generating PDF", level: "info", data: { intakeId, certificateNumber, certificateRef, certificateType, certAttempt } })
    logger.info("Generating PDF for medical certificate", { intakeId, certificateNumber, certificateRef, certAttempt })

    const pdfResult = await renderTemplatePdf({
      certificateType,
      patientName: patient.full_name,
      patientDateOfBirth: formatShortDateSafe(patientDob),
      consultationDate: formatDateLong(generatedAt),
      startDate: formatDateLong(reviewData.startDate),
      endDate: formatDateLong(reviewData.endDate),
      certificateRef,
      issueDate: formatShortDate(generatedAt),
    })

    if (!pdfResult.success || !pdfResult.buffer) {
      // PDF gen failure is not a ref issue - release claim and return immediately
      logger.error("Failed to generate PDF", { intakeId, error: pdfResult.error })
      if (!skipClaim) {
        await supabase.rpc("release_intake_claim", { p_intake_id: intakeId, p_doctor_id: doctorProfile.id })
          .then(({ error }) => { if (error) logger.warn("Failed to release claim after PDF failure", { intakeId, error: error.message }) })
      }
      await supabase.from("intakes").update({ status: "paid", reviewed_by: null, updated_at: new Date().toISOString() }).eq("id", intakeId)
      return { success: false, error: pdfResult.error || "Failed to generate certificate PDF" }
    }

    const candidateBuffer = pdfResult.buffer

    // 4. Upload - no upsert, so a collision surfaces as an error rather than silently
    //    overwriting another intake's file at the same storage path.
    Sentry.addBreadcrumb({ category: "cert.flow", message: "Uploading PDF to storage", level: "info", data: { intakeId, pdfSizeBytes: candidateBuffer.length, certAttempt } })

    const { error: uploadErr } = await supabase.storage
      .from("documents")
      .upload(storagePath, candidateBuffer, {
        contentType: "application/pdf",
        upsert: false,
      })

    if (!uploadErr) {
      pdfBuffer = candidateBuffer
      break
    }

    // Detect storage collision (file already exists at this path)
    const isCollision =
      (uploadErr as unknown as { statusCode?: number }).statusCode === 409 ||
      uploadErr.message?.toLowerCase().includes("already exists") ||
      uploadErr.message?.toLowerCase().includes("duplicate")

    if (isCollision && certAttempt < MAX_CERT_REF_ATTEMPTS - 1) {
      // Regenerate ref and re-render on next iteration
      logger.warn("Certificate ref storage collision - regenerating ref", {
        intakeId,
        collidedRef: certificateRef,
        attempt: certAttempt,
      })
      Sentry.captureMessage("Certificate ref storage collision - regenerating ref", {
        level: "warning",
        tags: { subsystem: "cert-pipeline", intake_id: intakeId },
        extra: { collidedRef: certificateRef, attempt: certAttempt },
      })
      certificateRef = generateCertificateRef(certificateType)
      continue
    }

    // Non-collision upload error, or exhausted collision retries
    logger.error("Failed to upload PDF to storage", {
      intakeId,
      certificateNumber,
      error: uploadErr,
      isCollision,
      attempt: certAttempt,
    })
    if (!skipClaim) {
      await supabase.rpc("release_intake_claim", { p_intake_id: intakeId, p_doctor_id: doctorProfile.id })
        .then(({ error }) => { if (error) logger.warn("Failed to release claim after storage failure", { intakeId, error: error.message }) })
    }
    return { success: false, error: "Failed to store certificate. Please try again." }
  }

  if (!pdfBuffer) {
    // Defensive: loop always breaks with pdfBuffer set or returns early - this is unreachable
    logger.error("Certificate ref collision exhausted all retries", { intakeId, maxAttempts: MAX_CERT_REF_ATTEMPTS })
    Sentry.captureMessage("Certificate ref collision exhausted all retries", {
      level: "error",
      tags: { subsystem: "cert-pipeline", intake_id: intakeId },
    })
    if (!skipClaim) {
      await supabase.rpc("release_intake_claim", { p_intake_id: intakeId, p_doctor_id: doctorProfile.id })
        .then(({ error }) => { if (error) logger.warn("Failed to release claim after collision exhaustion", { intakeId, error: error.message }) })
    }
    return { success: false, error: "Failed to store certificate after multiple attempts. Please try again." }
  }

  // 5. Atomic approval
  const pdfHash = crypto.createHash("sha256").update(pdfBuffer).digest("hex")

  Sentry.addBreadcrumb({ category: "cert.flow", message: "Atomic approval transaction", level: "info", data: { intakeId, certificateNumber, certificateRef } })
  const atomicResult = await atomicApproveCertificate({
    intake_id: intakeId,
    certificate_number: certificateNumber,
    verification_code: verificationCode,
    certificate_type: certificateType,
    certificate_ref: certificateRef,
    issue_date: generatedAt.split("T")[0],
    start_date: reviewData.startDate,
    end_date: reviewData.endDate,
    patient_id: patient.id,
    patient_name: patient.full_name,
    patient_dob: patientDob,
    doctor_id: doctorProfile.id,
    doctor_name: doctorProfile.full_name,
    doctor_nominals: doctorIdentityForPdf?.nominals || null,
    doctor_provider_number: doctorProfile.provider_number,
    doctor_ahpra_number: doctorProfile.ahpra_number,
    template_config_snapshot: DEFAULT_TEMPLATE_CONFIG as unknown as Record<string, unknown>,
    clinic_identity_snapshot: {
      name: COMPANY_NAME,
      abn: ABN,
      address: COMPANY_ADDRESS,
      phone: CONTACT_PHONE,
      email: CONTACT_EMAIL,
    } as Record<string, unknown>,
    storage_path: storagePath,
    file_size_bytes: pdfBuffer.length,
    filename: `Medical_Certificate_${certificateRef}.pdf`,
    pdf_hash: pdfHash,
  })

  if (!atomicResult.success) {
    logger.error("Atomic approval failed", { intakeId, error: atomicResult.error })
    if (!skipClaim) {
      await supabase.rpc("release_intake_claim", { p_intake_id: intakeId, p_doctor_id: doctorProfile.id })
        .then(({ error }) => { if (error) logger.warn("Failed to release claim after atomic failure", { intakeId, error: error.message }) })
    }
    try {
      await supabase.storage.from("documents").remove([storagePath])
    } catch (cleanupErr) {
      logger.warn("Failed to clean up orphaned PDF", { intakeId, storagePath, error: String(cleanupErr) })
    }
    return { success: false, error: atomicResult.error || "Failed to create certificate records" }
  }

  const certificateId = atomicResult.certificateId
  if (!certificateId) {
    logger.error("Atomic approval succeeded but returned no certificateId", { intakeId })
    return { success: false, error: "Certificate creation failed - missing certificate ID" }
  }

  // 5.5 Mark as AI-approved if applicable
  if (aiApproved) {
    const { error: aiUpdateError } = await supabase
      .from("intakes")
      .update({
        ai_approved: true,
        ai_approved_at: new Date().toISOString(),
        ai_approval_reason: aiApprovalReason || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", intakeId)

    if (aiUpdateError) {
      // Cert is already issued - escalate so this doesn't slip through batch review
      logger.error("Failed to set ai_approved flag - cert issued without AI tracking", { intakeId, error: aiUpdateError.message })
      Sentry.captureMessage("ai_approved flag update failed - auto-approved cert may not appear in batch review", {
        level: "error",
        tags: { subsystem: "auto-approval", intake_id: intakeId },
        extra: { certificateId, error: aiUpdateError.message },
      })
    }
  }

  // Idempotent re-approval check
  if (atomicResult.isExisting) {
    const existingCert = await findExistingCertificate(intakeId)
    if (existingCert?.email_sent_at) {
      logger.info("Certificate already issued and email sent (idempotent)", { intakeId, certificateId })
      return { success: true, certificateId, isExisting: true }
    }
  }

  // 6. Log certificate edits for audit trail
  if (!atomicResult.isExisting) {
    const edits = compareForEdits(answersData, reviewData)
    if (edits.length > 0) {
      const editResult = await logCertificateEdits(certificateId, intakeId, doctorProfile.id, edits)

      if (editResult.errors.length > 0 && editResult.editCount === 0) {
        logger.error("CRITICAL: Certificate edit audit trail completely failed", {
          intakeId, certificateId, errors: editResult.errors, attemptedEdits: edits.length,
        })
        Sentry.captureMessage(
          `CRITICAL: Certificate audit trail write failed completely for intake ${intakeId}`,
          {
            level: "fatal",
            tags: { subsystem: "cert-audit-trail", intakeId },
            extra: { certificateId, attemptedEdits: edits.length, errors: editResult.errors },
          }
        )
      }

      if (editResult.editCount > 0) {
        logger.info("Certificate edits logged for audit", {
          intakeId, certificateId, editCount: editResult.editCount, failedEdits: editResult.errors.length,
        })
      }
    }
  }

  // 7. Generate signed download URL
  Sentry.addBreadcrumb({ category: "cert.flow", message: "Generating signed download URL", level: "info", data: { intakeId, storagePath } })
  let downloadUrl: string | undefined
  try {
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from("documents")
      .createSignedUrl(storagePath, 3 * 24 * 60 * 60) // 72 hours
    if (signedUrlError || !signedUrlData?.signedUrl) {
      logger.warn("Failed to generate signed download URL", { intakeId, storagePath, error: signedUrlError?.message })
    } else {
      downloadUrl = signedUrlData.signedUrl
    }
  } catch (signedUrlErr) {
    logger.warn("Exception generating signed download URL", { intakeId, error: signedUrlErr })
  }

  // 8. Send email notification
  Sentry.addBreadcrumb({ category: "cert.flow", message: "Sending patient email", level: "info", data: { intakeId, certificateId, hasDownloadUrl: !!downloadUrl } })
  const dashboardUrl = `${env.appUrl}/track/${intakeId}`

  const emailResult = await sendEmail({
    to: patient.email,
    toName: patient.full_name,
    subject: medCertPatientEmailSubject(patient.full_name?.split(" ")[0]),
    template: MedCertPatientEmail({
      patientName: patient.full_name,
      downloadUrl,
      dashboardUrl,
      verificationCode,
      certType: certificateType === "study" ? "study" : certificateType === "carer" ? "carer" : "work",
      appUrl: env.appUrl,
    }),
    emailType: "med_cert_patient",
    intakeId,
    patientId: patient.id,
    certificateId,
    metadata: {
      cert_type: certificateType,
      verification_code: verificationCode,
    },
    tags: [
      { name: "category", value: "med_cert_approved" },
      { name: "intake_id", value: intakeId },
      { name: "cert_type", value: certificateType },
    ],
    // No PDF attachment. Patients download the cert via signed URL (72h) or
    // their dashboard. Reasons: (1) PHI in mailbox increases breach blast
    // radius; (2) Resend attachments eat quota + delay delivery; (3) signed
    // URL lets us audit views and expire links.
  })

  // Track email status
  if (certificateId) {
    if (emailResult.success) {
      await updateEmailStatus(certificateId, "sent", { deliveryId: emailResult.messageId })
      await logCertificateEvent(certificateId, "email_sent", null, "system", { resend_id: emailResult.messageId })
    } else {
      await updateEmailStatus(certificateId, "failed", { failureReason: emailResult.error })
      await logCertificateEvent(certificateId, "email_failed", null, "system", { error: emailResult.error })
      logger.error("Failed to send email (certificate still issued)", { intakeId, certificateId, error: emailResult.error })
    }
  }

  logger.info("Certificate issuance complete", { intakeId, certificateId, emailSent: emailResult.success, approvalMethod: aiApproved ? "ai_assisted" : "manual" })

  // 9. In-app notification
  await createNotification({
    userId: patient.id,
    type: "document_ready",
    title: "Your certificate is ready",
    message: "Your request has been reviewed and approved. Your medical certificate is ready to download.",
    actionUrl: `/patient/intakes/${intakeId}`,
    metadata: { intakeId, certificateType, certificateId },
  })

  // 10. PostHog tracking
  try {
    const posthog = getPostHogClient()
    posthog.capture({
      distinctId: patient.id,
      event: 'certificate_approved',
      properties: {
        intake_id: intakeId,
        certificate_type: certificateType,
        doctor_id: doctorProfile.id,
        approval_method: aiApproved ? 'ai_assisted' : 'manual',
      },
    })
  } catch { /* non-blocking */ }

  const { data: phPatient } = await supabase
    .from("profiles")
    .select("auth_user_id")
    .eq("id", patient.id)
    .maybeSingle()
  const phDistinctId = phPatient?.auth_user_id || patient.id

  trackIntakeFunnelStep({
    step: 'approved',
    intakeId,
    serviceSlug: service.slug,
    serviceType: 'med_certs',
    userId: phDistinctId,
    metadata: { certificate_type: certificateType, doctor_id: doctorProfile.id, approval_method: aiApproved ? 'ai_assisted' : 'manual' },
  })
  if (emailResult.success) {
    trackIntakeFunnelStep({
      step: 'document_delivered',
      intakeId,
      serviceSlug: service.slug,
      serviceType: 'med_certs',
      userId: phDistinctId,
    })
  }

  // 11. Revalidate cache
  revalidatePath("/doctor/dashboard")
  revalidatePath("/doctor/queue")
  revalidatePath(`/patient/intakes/${intakeId}`)

  return { success: true, certificateId, emailSent: emailResult.success }
}
