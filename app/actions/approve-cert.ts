"use server"

import crypto from "crypto"
import { revalidatePath } from "next/cache"
import { sendEmail } from "@/lib/email/send-email"
import { MedCertPatientEmail, medCertPatientEmailSubject } from "@/components/email/templates"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { requireRoleOrNull } from "@/lib/auth"
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
import { checkCertificateRateLimit } from "@/lib/security/rate-limit"
import * as Sentry from "@sentry/nextjs"
import type { CertReviewData } from "@/types/db"
import { DEFAULT_TEMPLATE_CONFIG } from "@/types/certificate-template"

interface ApproveCertResult {
  success: boolean
  error?: string
  certificateId?: string
  isExisting?: boolean
  emailSent?: boolean
}

/**
 * Server action to approve a medical certificate intake, generate PDF, and email it to the patient.
 * Uses intakes table as the canonical case object.
 * 
 * @param intakeId - The ID of the intake to approve
 * @param reviewData - The edited certificate data from the review modal
 */
export async function approveAndSendCert(
  intakeId: string,
  reviewData: CertReviewData
): Promise<ApproveCertResult> {
  try {
    // 1. Authenticate doctor or admin (non-redirecting for server actions)
    const authResult = await requireRoleOrNull(["doctor", "admin"])
    if (!authResult) {
      logger.warn("APPROVE_CORE_UNAUTHORIZED", { intakeId })
      return { success: false, error: "Unauthorized or session expired" }
    }
    const doctorProfile = authResult.profile

    // P0 SECURITY: Rate limiting to prevent mass-approval attacks
    const rateLimitResult = await checkCertificateRateLimit(doctorProfile.id)
    if (!rateLimitResult.allowed) {
      logger.warn("Certificate rate limit exceeded", {
        doctorId: doctorProfile.id,
        remaining: rateLimitResult.remaining,
        resetAt: rateLimitResult.resetAt,
      })
      return {
        success: false,
        error: `Rate limit exceeded. You can issue more certificates after ${rateLimitResult.resetAt.toLocaleTimeString()}. Contact support if this is urgent.`,
      }
    }

    // P2 FIX: Early verification that doctor has required credentials configured
    // This prevents wasted work if doctor can't sign certificates
    if (!doctorProfile.provider_number || !doctorProfile.ahpra_number) {
      logger.warn("Doctor attempted approval without credentials", {
        doctorId: doctorProfile.id,
        hasProvider: !!doctorProfile.provider_number,
        hasAhpra: !!doctorProfile.ahpra_number,
      })
      return {
        success: false,
        error: "Your certificate credentials are not configured. Please complete your Certificate Identity in Settings before approving certificates."
      }
    }

    // P2 FIX: Validate AHPRA number format (3 uppercase letters + 10 digits)
    if (!/^[A-Z]{3}\d{10}$/.test(doctorProfile.ahpra_number)) {
      logger.warn("Doctor AHPRA number failed format validation", {
        doctorId: doctorProfile.id,
      })
      return {
        success: false,
        error: "Invalid AHPRA number format. Please update your profile.",
      }
    }

    const supabase = createServiceRoleClient()

    // 2. Fetch the intake with patient details, service info, and answers
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

    // SELF-APPROVAL PREVENTION: Doctor cannot approve their own request
    const patientInfo = intake.patient as { id: string } | null
    if (patientInfo && patientInfo.id === doctorProfile.id) {
      logger.warn("Doctor attempted self-approval", {
        doctorId: doctorProfile.id,
        intakeId,
      })
      return { 
        success: false, 
        error: "You cannot approve your own medical certificate request. Please have another doctor review this case." 
      }
    }

    // Verify intake is in reviewable status (allow approved for idempotency)
    if (!["paid", "in_review", "approved"].includes(intake.status)) {
      return { success: false, error: `Intake is already ${intake.status}` }
    }

    // IDEMPOTENCY CHECK: If already approved, return existing certificate
    // Unless no valid certificate exists (regeneration case where old cert was superseded)
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
      // No valid certificate found for approved intake - this is a regeneration case
      // Skip claim check since intake is already approved and we're regenerating
      logger.info("Regenerating certificate for approved intake (no valid cert found)", { intakeId })
    } else {
      // P0 FIX: Use atomic claim RPC with row locking to prevent race condition
      // This prevents two doctors from claiming the same intake simultaneously
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

    // NOTE: We no longer set a transient "processing" status here.
    // The claim (claimed_by/claimed_at) provides the lock mechanism.
    // The atomic RPC will transition directly from paid/in_review -> approved.
    // This eliminates the "processing" status that wasn't in IntakeStatus type.

    const patient = intake.patient as { id: string; full_name: string; email: string; date_of_birth: string | null } | null
    if (!patient || !patient.email) {
      return { success: false, error: "Patient email not found" }
    }

    // 3. Prepare PDF data
    // Determine certificate type from service slug (must be before generateCertificateRef)
    const certSubtype = service.slug.includes("carer") ? "carer" : service.slug.includes("uni") ? "uni" : "work"
    const certificateType = (certSubtype === "uni" ? "study" : certSubtype === "carer" ? "carer" : "work") as "work" | "study" | "carer"

    const certificateNumber = generateCertificateNumber()
    const certificateRef = generateCertificateRef(certificateType)
    const generatedAt = new Date().toISOString()

    // Validate and calculate duration days
    const startDate = new Date(reviewData.startDate)
    const endDate = new Date(reviewData.endDate)

    // Date validation: end date must be >= start date
    if (endDate < startDate) {
      logger.warn("Invalid certificate dates: end date before start date", { intakeId, startDate: reviewData.startDate, endDate: reviewData.endDate })
      return { success: false, error: "End date cannot be before start date" }
    }

    // Validate reasonable date range (max 30 days)
    const maxDurationMs = 30 * 24 * 60 * 60 * 1000
    if (endDate.getTime() - startDate.getTime() > maxDurationMs) {
      logger.warn("Certificate duration exceeds maximum", { intakeId, startDate: reviewData.startDate, endDate: reviewData.endDate })
      return { success: false, error: "Certificate duration cannot exceed 30 days" }
    }

    const durationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1

    // Get intake answers for carer details extraction
    const answersRaw = intake.answers as unknown as { answers: Record<string, unknown> }[] | { answers: Record<string, unknown> } | null
    const answersObj = Array.isArray(answersRaw) ? answersRaw[0] : answersRaw
    const answersData = answersObj?.answers || null

    // Get patient DOB (required for PDF)
    const patientDob = patient.date_of_birth || null

    // NOTE: Certificate identity (provider_number, ahpra_number) already verified at start of function

    // Extract carer details if certificate type is "carer"
    let carerPersonName: string | undefined
    let carerRelationship: string | undefined
    if (certificateType === "carer" && answersData) {
      // Check both possible field names from intake flow
      carerPersonName = (answersData.carer_patient_name as string | undefined) || 
                       (answersData.carerPatientName as string | undefined)
      carerRelationship = (answersData.carer_relationship as string | undefined) || 
                         (answersData.carerRelationship as string | undefined)
    }

    // Generate verification code for the certificate
    const verificationCode = generateVerificationCode(certificateNumber)

    // 4. Generate PDF using template renderer (pdf-lib)
    Sentry.addBreadcrumb({ category: "cert.flow", message: "Generating PDF", level: "info", data: { intakeId, certificateNumber, certificateRef, certificateType } })
    logger.info("Generating PDF for medical certificate", { intakeId, certificateNumber, certificateRef })

    // Get doctor identity for template rendering
    const doctorIdentityForPdf = await getDoctorIdentity(doctorProfile.id)
    if (!doctorIdentityForPdf) {
      return { success: false, error: "Doctor identity not found" }
    }

    // Format display dates for template (e.g. "18 February 2026")
    const formatDisplayDate = (dateStr: string) => {
      const d = new Date(dateStr)
      return d.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })
    }
    const formatShortDate = (dateStr: string) => {
      const d = new Date(dateStr)
      return d.toLocaleDateString("en-AU", { day: "2-digit", month: "2-digit", year: "numeric" })
    }

    const pdfResult = await renderTemplatePdf({
      certificateType,
      patientName: patient.full_name,
      consultationDate: formatDisplayDate(generatedAt.split("T")[0]!),
      startDate: formatDisplayDate(reviewData.startDate),
      endDate: formatDisplayDate(reviewData.endDate),
      certificateRef,
      issueDate: formatShortDate(generatedAt.split("T")[0]!),
    })

    if (!pdfResult.success || !pdfResult.buffer) {
      logger.error("Failed to generate PDF", { intakeId, error: pdfResult.error })
      // Release the claim first, then revert status
      const { error: releaseErr } = await supabase.rpc("release_intake_claim", { p_intake_id: intakeId, p_doctor_id: doctorProfile.id })
      if (releaseErr) {
        logger.warn("Failed to release claim after PDF failure", { intakeId, error: releaseErr.message })
      }
      const { error: revertErr } = await supabase.from("intakes").update({ status: "paid", reviewed_by: null, updated_at: new Date().toISOString() }).eq("id", intakeId)
      if (revertErr) {
        logger.warn("Failed to revert intake status after PDF failure — intake may be stuck", { intakeId, error: revertErr.message })
      }
      return { success: false, error: pdfResult.error || "Failed to generate certificate PDF" }
    }

    const pdfBuffer = pdfResult.buffer
    
    // 5.5 Store PDF in Supabase Storage (P0 fix - allow patient re-download)
    Sentry.addBreadcrumb({ category: "cert.flow", message: "Uploading PDF to storage", level: "info", data: { intakeId, pdfSizeBytes: pdfBuffer.length } })
    const storagePath = `certificates/${certificateRef}.pdf`
    
    // Retry upload once on failure before continuing
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
        await new Promise(r => setTimeout(r, 1000)) // Wait 1s before retry
      }
    }

    if (uploadError) {
      logger.error("Failed to upload PDF to storage after retries", { 
        intakeId, 
        certificateNumber, 
        error: uploadError 
      })
      // Release the claim since we can't proceed without storage
      const { error: releaseErr2 } = await supabase.rpc("release_intake_claim", { p_intake_id: intakeId, p_doctor_id: doctorProfile.id })
      if (releaseErr2) {
        logger.warn("Failed to release claim after storage failure — intake may be stuck", { intakeId, error: releaseErr2.message })
      }
      return { success: false, error: "Failed to store certificate. Please try again." }
    }

    // 5.6.5 Generate PDF hash for integrity verification
    const pdfHash = crypto.createHash("sha256").update(pdfBuffer).digest("hex")

    // 5.7 ATOMIC APPROVAL: Create certificate, document record, and update status in single transaction
    // This ensures consistency - either all operations succeed or all fail
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
      doctor_provider_number: doctorProfile.provider_number!,
      doctor_ahpra_number: doctorProfile.ahpra_number!,
      template_config_snapshot: DEFAULT_TEMPLATE_CONFIG as unknown as Record<string, unknown>,
      clinic_identity_snapshot: {} as Record<string, unknown>,
      storage_path: storagePath,
      file_size_bytes: pdfBuffer.length,
      filename: `Medical_Certificate_${certificateRef}.pdf`,
      pdf_hash: pdfHash,
    })

    if (!atomicResult.success) {
      logger.error("Atomic approval failed", { intakeId, error: atomicResult.error })
      // Release the claim since atomic operation failed
      const { error: releaseErr3 } = await supabase.rpc("release_intake_claim", { p_intake_id: intakeId, p_doctor_id: doctorProfile.id })
      if (releaseErr3) {
        logger.warn("Failed to release claim after atomic approval failure — intake may be stuck", { intakeId, error: releaseErr3.message })
      }
      // Clean up orphaned PDF from storage (non-blocking — don't let cleanup failure mask the real error)
      try {
        await supabase.storage.from("documents").remove([storagePath])
        logger.info("Cleaned up orphaned PDF after atomic approval failure", { intakeId, storagePath })
      } catch (cleanupErr) {
        logger.warn("Failed to clean up orphaned PDF — manual cleanup needed", { intakeId, storagePath, error: String(cleanupErr) })
      }
      return { success: false, error: atomicResult.error || "Failed to create certificate records" }
    }

    const certificateId = atomicResult.certificateId
    if (!certificateId) {
      logger.error("Atomic approval succeeded but returned no certificateId", { intakeId })
      return { success: false, error: "Certificate creation failed — missing certificate ID" }
    }

    // If this was an idempotent re-approval, check if email was already sent
    if (atomicResult.isExisting) {
      // Check if email was already sent for this certificate
      const existingCert = await findExistingCertificate(intakeId)
      if (existingCert?.email_sent_at) {
        logger.info("Certificate already issued and email sent (idempotent)", {
          intakeId,
          certificateId,
        })
        return {
          success: true,
          certificateId,
          isExisting: true,
        }
      }
    }

    // 5.8 LOG CERTIFICATE EDITS for audit trail (medicolegal requirement)
    // P1 FIX: Make edit tracking blocking - audit trail must be complete
    // Compare original intake answers with review data and log any changes
    if (!atomicResult.isExisting) {
      const edits = compareForEdits(answersData, reviewData)
      if (edits.length > 0) {
        const editResult = await logCertificateEdits(
          certificateId,
          intakeId,
          doctorProfile.id,
          edits
        )
        
        // CRITICAL: Alert if audit trail write fails completely
        // Certificate is already issued and cannot be rolled back at this point.
        // We MUST alert for immediate manual review to maintain medicolegal compliance.
        if (editResult.errors.length > 0 && editResult.editCount === 0) {
          logger.error("CRITICAL: Certificate edit audit trail completely failed", {
            intakeId,
            certificateId,
            errors: editResult.errors,
            attemptedEdits: edits.length,
          })
          Sentry.captureMessage(
            `CRITICAL: Certificate audit trail write failed completely for intake ${intakeId}`,
            {
              level: "fatal",
              tags: { subsystem: "cert-audit-trail", intakeId },
              extra: {
                certificateId,
                attemptedEdits: edits.length,
                errors: editResult.errors,
              },
            }
          )
        }
        
        if (editResult.editCount > 0) {
          logger.info("Certificate edits logged for audit", {
            intakeId,
            certificateId,
            editCount: editResult.editCount,
            failedEdits: editResult.errors.length,
          })
        }
      }
    }

    // 6. Generate signed download URL so patient can download without login (7-day expiry)
    Sentry.addBreadcrumb({ category: "cert.flow", message: "Generating signed download URL", level: "info", data: { intakeId, storagePath } })
    let downloadUrl: string | undefined
    try {
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from("documents")
        .createSignedUrl(storagePath, 7 * 24 * 60 * 60) // 7 days
      if (signedUrlError || !signedUrlData?.signedUrl) {
        logger.warn("Failed to generate signed download URL for patient email — will fall back to dashboard link", {
          intakeId, storagePath, error: signedUrlError?.message,
        })
      } else {
        downloadUrl = signedUrlData.signedUrl
      }
    } catch (signedUrlErr) {
      logger.warn("Exception generating signed download URL", { intakeId, error: signedUrlErr })
    }

    // 7. Send email notification with direct download link
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
        await updateEmailStatus(certificateId, "sent", {
          deliveryId: emailResult.messageId,
        })
        await logCertificateEvent(certificateId, "email_sent", null, "system", {
          resend_id: emailResult.messageId,
        })
      } else {
        await updateEmailStatus(certificateId, "failed", {
          failureReason: emailResult.error,
        })
        await logCertificateEvent(certificateId, "email_failed", null, "system", {
          error: emailResult.error,
        })
        // Don't fail the whole operation - certificate is issued, email can be retried
        logger.error("Failed to send email (certificate still issued)", { 
          intakeId, 
          certificateId,
          error: emailResult.error 
        })
      }
    }

    logger.info("Certificate issuance complete", {
      intakeId,
      certificateId,
      emailSent: emailResult.success,
    })

    // Status already updated by atomic approval - no separate update needed

    // Create in-app notification for patient
    await createNotification({
      userId: patient.id,
      type: "document_ready",
      title: "Your certificate is ready",
      message: "A doctor has approved your request. Your medical certificate is ready to download.",
      actionUrl: `/patient/intakes/${intakeId}`,
      metadata: { intakeId, certificateType, certificateId },
    })

    // Track doctor approval in PostHog
    try {
      const posthog = getPostHogClient()
      posthog.capture({
        distinctId: patient.id,
        event: 'doctor_approved',
        properties: {
          intake_id: intakeId,
          certificate_type: certificateType,
          doctor_id: doctorProfile.id,
        },
      })
    } catch { /* non-blocking */ }

    // Track funnel: approved + document delivered
    trackIntakeFunnelStep({
      step: 'approved',
      intakeId,
      serviceSlug: service.slug,
      serviceType: 'med_certs',
      userId: patient.id,
      metadata: { certificate_type: certificateType, doctor_id: doctorProfile.id },
    })
    if (emailResult.success) {
      trackIntakeFunnelStep({
        step: 'document_delivered',
        intakeId,
        serviceSlug: service.slug,
        serviceType: 'med_certs',
        userId: patient.id,
      })
    }

    // 9. Revalidate dashboard paths
    // NOTE: Removed /doctor/intakes/${intakeId} to prevent mid-action navigation.
    // The client will navigate to /doctor/queue on success anyway.
    revalidatePath("/doctor/dashboard")
    revalidatePath("/doctor/queue")
    revalidatePath(`/patient/intakes/${intakeId}`)

    return { success: true, certificateId, emailSent: emailResult.success }
  } catch (error) {
    logger.error("[ApproveCert] Error approving certificate", { 
      intakeId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
    
    // Sentry capture with useful tags for clinical workflow failures
    Sentry.captureException(error, {
      tags: {
        action: "approve_med_cert",
        service_type: "medical_certificate",
        intake_id: intakeId,
        step_id: "approve_cert_outer_catch",
      },
      extra: {
        intakeId,
        reviewDataKeys: Object.keys(reviewData),
      },
    })
    
    return {
      success: false,
      error: error instanceof Error ? error.message : "We hit an unexpected bump. Please try again.",
    }
  }
}
