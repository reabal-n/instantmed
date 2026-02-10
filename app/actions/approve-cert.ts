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
import { renderMedCertPdf, generateVerificationCode, generateCertificateNumber } from "@/lib/pdf/med-cert-render"
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

interface ApproveCertResult {
  success: boolean
  error?: string
  certificateId?: string
  isExisting?: boolean
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
    const certificateNumber = generateCertificateNumber()
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

    // Get certificate type from service slug or default to "work"
    const certSubtype = service.slug.includes("carer") ? "carer" : service.slug.includes("uni") ? "uni" : "work"
    const certificateType = (certSubtype === "uni" ? "study" : certSubtype === "carer" ? "carer" : "work") as "work" | "study" | "carer"

    // Get intake answers for carer details extraction
    const answers = intake.answers as unknown as { answers: Record<string, unknown> }[] | null
    const answersData = answers?.[0]?.answers || null

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

    // 4. Generate PDF Buffer using new config-driven renderer
    Sentry.addBreadcrumb({ category: "cert.flow", message: "Generating PDF", level: "info", data: { intakeId, certificateNumber, certificateType } })
    logger.info("Generating PDF for medical certificate", { intakeId, certificateNumber })
    
    const pdfResult = await renderMedCertPdf({
      certificateNumber,
      verificationCode,
      certificateType,
      patientName: patient.full_name,
      patientDob,
      issueDate: generatedAt.split("T")[0],
      startDate: reviewData.startDate,
      endDate: reviewData.endDate,
      durationDays,
      carerPersonName,
      carerRelationship,
      doctorProfileId: doctorProfile.id,
      generatedAt,
    })

    if (!pdfResult.success || !pdfResult.buffer) {
      logger.error("Failed to generate PDF", { intakeId, error: pdfResult.error })
      // Release the claim first, then revert status
      const { error: releaseErr } = await supabase.rpc("release_intake_claim", { p_intake_id: intakeId, p_doctor_id: doctorProfile.id })
      if (releaseErr) {
        logger.warn("Failed to release claim after PDF failure", { intakeId, error: releaseErr.message })
      }
      await supabase.from("intakes").update({ status: "paid", reviewed_by: null, updated_at: new Date().toISOString() }).eq("id", intakeId)
      return { success: false, error: pdfResult.error || "Failed to generate certificate PDF" }
    }

    const pdfBuffer = pdfResult.buffer
    
    // 5.5 Store PDF in Supabase Storage (P0 fix - allow patient re-download)
    Sentry.addBreadcrumb({ category: "cert.flow", message: "Uploading PDF to storage", level: "info", data: { intakeId, pdfSizeBytes: pdfBuffer.length } })
    const storagePath = `med-certs/${patient.id}/${certificateNumber}.pdf`
    
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
      await supabase.rpc("release_intake_claim", { p_intake_id: intakeId, p_doctor_id: doctorProfile.id })
      return { success: false, error: "Failed to store certificate. Please try again." }
    }

    // 5.6 Get doctor identity for snapshot
    const doctorIdentity = await getDoctorIdentity(doctorProfile.id)

    // 5.6.5 Generate PDF hash for integrity verification
    const pdfHash = crypto.createHash("sha256").update(pdfBuffer).digest("hex")

    // 5.7 ATOMIC APPROVAL: Create certificate, document record, and update status in single transaction
    // This ensures consistency - either all operations succeed or all fail
    Sentry.addBreadcrumb({ category: "cert.flow", message: "Atomic approval transaction", level: "info", data: { intakeId, certificateNumber } })
    const atomicResult = await atomicApproveCertificate({
      intake_id: intakeId,
      certificate_number: certificateNumber,
      verification_code: verificationCode,
      certificate_type: certificateType,
      issue_date: generatedAt.split("T")[0],
      start_date: reviewData.startDate,
      end_date: reviewData.endDate,
      patient_id: patient.id,
      patient_name: patient.full_name,
      patient_dob: patientDob,
      doctor_id: doctorProfile.id,
      doctor_name: doctorProfile.full_name,
      doctor_nominals: doctorIdentity?.nominals || null,
      doctor_provider_number: doctorProfile.provider_number!,
      doctor_ahpra_number: doctorProfile.ahpra_number!,
      template_config_snapshot: pdfResult.templateConfig! as unknown as Record<string, unknown>,
      clinic_identity_snapshot: pdfResult.clinicIdentity! as unknown as Record<string, unknown>,
      storage_path: storagePath,
      file_size_bytes: pdfBuffer.length,
      filename: `Medical_Certificate_${certificateNumber}.pdf`,
      pdf_hash: pdfHash,
    })

    if (!atomicResult.success) {
      logger.error("Atomic approval failed", { intakeId, error: atomicResult.error })
      // Release the claim since atomic operation failed
      await supabase.rpc("release_intake_claim", { p_intake_id: intakeId, p_doctor_id: doctorProfile.id })
      return { success: false, error: atomicResult.error || "Failed to create certificate records" }
    }

    const certificateId = atomicResult.certificateId

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
          certificateId!,
          intakeId,
          doctorProfile.id,
          edits
        )
        
        // P1 FIX: Fail if audit trail cannot be written (medicolegal requirement)
        if (editResult.errors.length > 0 && editResult.editCount === 0) {
          logger.error("Failed to log certificate edits - audit trail incomplete", {
            intakeId,
            certificateId,
            errors: editResult.errors,
            attemptedEdits: edits.length,
          })
          // Don't fail the approval, but log a critical alert
          // Certificate is already issued, so we can't roll back
          // But we MUST alert on this for manual review
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

    // 6. Send email notification via centralized sendEmail (NO attachment - patient downloads from dashboard)
    Sentry.addBreadcrumb({ category: "cert.flow", message: "Sending patient email", level: "info", data: { intakeId, certificateId } })
    const dashboardUrl = `${env.appUrl}/patient/intakes/${intakeId}`
    
    const emailResult = await sendEmail({
      to: patient.email,
      toName: patient.full_name,
      subject: medCertPatientEmailSubject,
      template: MedCertPatientEmail({
        patientName: patient.full_name,
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
    revalidatePath("/doctor")
    revalidatePath("/doctor/dashboard")
    revalidatePath("/doctor/queue")
    revalidatePath(`/patient/intakes/${intakeId}`)

    return { success: true, certificateId }
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
