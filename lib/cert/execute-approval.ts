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
  /** Skip the claim_intake_for_review RPC — used by auto-approval (no doctor "claiming") */
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
        date_of_birth
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

  const patient = intake.patient as { id: string; full_name: string; email: string; date_of_birth: string | null } | null
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
  const certificateRef = generateCertificateRef(certificateType)
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
  const paidDurationDays = getAbsenceDays(answersData ?? undefined)
  if (durationDays !== paidDurationDays) {
    logger.warn("Certificate duration differs from paid tier", {
      intakeId,
      paidDurationDays,
      approvedDurationDays: durationDays,
      startDate: reviewData.startDate,
      endDate: reviewData.endDate,
    })
    Sentry.addBreadcrumb({
      category: "cert.audit",
      message: `Duration mismatch: paid ${paidDurationDays}d, approved ${durationDays}d`,
      level: "warning",
      data: { intakeId, paidDurationDays, approvedDurationDays: durationDays },
    })
  }

  const patientDob = patient.date_of_birth || null

  // Extract carer details if certificate type is "carer"
  let _carerPersonName: string | undefined
  let _carerRelationship: string | undefined
  if (certificateType === "carer" && answersData) {
    _carerPersonName = (answersData.carer_patient_name as string | undefined) ||
                     (answersData.carerPatientName as string | undefined)
    _carerRelationship = (answersData.carer_relationship as string | undefined) ||
                       (answersData.carerRelationship as string | undefined)
  }

  const verificationCode = generateVerificationCode(certificateNumber)

  // 3. Generate PDF
  Sentry.addBreadcrumb({ category: "cert.flow", message: "Generating PDF", level: "info", data: { intakeId, certificateNumber, certificateRef, certificateType } })
  logger.info("Generating PDF for medical certificate", { intakeId, certificateNumber, certificateRef })

  const doctorIdentityForPdf = await getDoctorIdentity(doctorProfile.id)
  if (!doctorIdentityForPdf) {
    if (!skipClaim) {
      await supabase.rpc("release_intake_claim", { p_intake_id: intakeId, p_doctor_id: doctorProfile.id })
        .then(({ error }) => { if (error) logger.warn("Failed to release claim after identity failure", { intakeId, error: error.message }) })
    }
    return { success: false, error: "Doctor identity not found" }
  }

  const pdfResult = await renderTemplatePdf({
    certificateType,
    patientName: patient.full_name,
    patientDateOfBirth: formatShortDateSafe(patientDob),
    consultationDate: formatDateLong(generatedAt.split("T")[0]!),
    startDate: formatDateLong(reviewData.startDate),
    endDate: formatDateLong(reviewData.endDate),
    certificateRef,
    issueDate: formatShortDate(generatedAt.split("T")[0]!),
  })

  if (!pdfResult.success || !pdfResult.buffer) {
    logger.error("Failed to generate PDF", { intakeId, error: pdfResult.error })
    if (!skipClaim) {
      await supabase.rpc("release_intake_claim", { p_intake_id: intakeId, p_doctor_id: doctorProfile.id })
        .then(({ error }) => { if (error) logger.warn("Failed to release claim after PDF failure", { intakeId, error: error.message }) })
    }
    await supabase.from("intakes").update({ status: "paid", reviewed_by: null, updated_at: new Date().toISOString() }).eq("id", intakeId)
    return { success: false, error: pdfResult.error || "Failed to generate certificate PDF" }
  }

  const pdfBuffer = pdfResult.buffer

  // 4. Upload PDF to storage
  Sentry.addBreadcrumb({ category: "cert.flow", message: "Uploading PDF to storage", level: "info", data: { intakeId, pdfSizeBytes: pdfBuffer.length } })
  const storagePath = `certificates/${certificateRef}.pdf`

  let uploadError: Error | null = null
  for (let attempt = 0; attempt < 2; attempt++) {
    const { error } = await supabase.storage
      .from("documents")
      .upload(storagePath, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      })

    if (!error) {
      uploadError = null
      break
    }

    uploadError = error
    if (attempt < 1) {
      await new Promise(r => setTimeout(r, 1000))
    }
  }

  if (uploadError) {
    logger.error("Failed to upload PDF to storage after retries", { intakeId, certificateNumber, error: uploadError })
    if (!skipClaim) {
      await supabase.rpc("release_intake_claim", { p_intake_id: intakeId, p_doctor_id: doctorProfile.id })
        .then(({ error }) => { if (error) logger.warn("Failed to release claim after storage failure", { intakeId, error: error.message }) })
    }
    return { success: false, error: "Failed to store certificate. Please try again." }
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
    return { success: false, error: "Certificate creation failed — missing certificate ID" }
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
      // Cert is already issued — escalate so this doesn't slip through batch review
      logger.error("Failed to set ai_approved flag — cert issued without AI tracking", { intakeId, error: aiUpdateError.message })
      Sentry.captureMessage("ai_approved flag update failed — auto-approved cert may not appear in batch review", {
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
      .createSignedUrl(storagePath, 7 * 24 * 60 * 60)
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
  const dashboardUrl = `${env.appUrl}/patient/intakes/${intakeId}`

  const emailResult = await sendEmail({
    to: patient.email,
    toName: patient.full_name,
    subject: medCertPatientEmailSubject,
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

  logger.info("Certificate issuance complete", { intakeId, certificateId, emailSent: emailResult.success, aiApproved })

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
      event: aiApproved ? 'ai_auto_approved' : 'doctor_approved',
      properties: {
        intake_id: intakeId,
        certificate_type: certificateType,
        doctor_id: doctorProfile.id,
        ai_approved: aiApproved,
      },
    })
  } catch { /* non-blocking */ }

  const { data: phPatient } = await supabase
    .from("profiles")
    .select("clerk_user_id")
    .eq("id", patient.id)
    .maybeSingle()
  const phDistinctId = phPatient?.clerk_user_id || patient.id

  trackIntakeFunnelStep({
    step: 'approved',
    intakeId,
    serviceSlug: service.slug,
    serviceType: 'med_certs',
    userId: phDistinctId,
    metadata: { certificate_type: certificateType, doctor_id: doctorProfile.id, ai_approved: aiApproved },
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
