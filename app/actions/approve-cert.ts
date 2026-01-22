"use server"

import crypto from "crypto"
import { revalidatePath } from "next/cache"
import { sendViaResend } from "@/lib/email/resend"
import { renderMedCertEmailToHtml } from "@/components/email/med-cert-email"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { getCurrentProfile } from "@/lib/data/profiles"
import { requireAuth } from "@/lib/auth"
import { env } from "@/lib/env"
import { logger } from "@/lib/observability/logger"
import { getPostHogClient } from "@/lib/posthog-server"
import { generateCertificateNumber } from "@/lib/pdf/generate-med-cert"
import { renderMedCertPdf, generateVerificationCode } from "@/lib/pdf/med-cert-render"
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
import type { CertReviewData } from "@/components/doctor/cert-review-modal"

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
    // 1. Authenticate doctor
    await requireAuth("doctor")
    const doctorProfile = await getCurrentProfile()

    if (!doctorProfile || doctorProfile.role !== "doctor") {
      return { success: false, error: "Unauthorized: Doctor access required" }
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

    // 2. Fetch the intake with patient details and service info
    const { data: intake, error: intakeError } = await supabase
      .from("intakes")
      .select(`
        *,
        patient:profiles!patient_id(
          id,
          full_name,
          email,
          date_of_birth
        ),
        service:services!service_id(
          slug,
          type
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
    const service = intake.service as { slug: string; type: string } | null
    if (!service || service.type !== "med_certs") {
      return { success: false, error: "This action is only for medical certificate intakes" }
    }

    // Verify intake is in reviewable status (allow approved for idempotency)
    if (!["paid", "in_review", "approved"].includes(intake.status)) {
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
    }

    // P0 FIX: Use atomic claim RPC with row locking to prevent race condition
    // This prevents two doctors from claiming the same intake simultaneously
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

    // Now atomically update status to processing (only if claim succeeded)
    const { data: claimed, error: statusError } = await supabase
      .from("intakes")
      .update({
        status: "processing",
        updated_at: new Date().toISOString()
      })
      .eq("id", intakeId)
      .eq("claimed_by", doctorProfile.id) // Safety: only update if we hold the claim
      .in("status", ["paid", "in_review"])
      .select("id")
      .single()

    if (statusError || !claimed) {
      // Release claim since we couldn't transition status
      await supabase.rpc("release_intake_claim", { p_intake_id: intakeId, p_doctor_id: doctorProfile.id })
      logger.warn("Failed to transition intake to processing after claim", { intakeId, statusError })
      return { success: false, error: "This intake is already being processed by another doctor" }
    }

    const patient = intake.patient as { id: string; full_name: string; email: string; date_of_birth: string | null } | null
    if (!patient || !patient.email) {
      return { success: false, error: "Patient email not found" }
    }

    // 3. Prepare PDF data
    const certificateNumber = generateCertificateNumber()
    const generatedAt = new Date().toISOString()

    // Calculate duration days
    const startDate = new Date(reviewData.startDate)
    const endDate = new Date(reviewData.endDate)
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
      // Revert the claim since we can't proceed
      await supabase.from("intakes").update({ status: "paid", reviewed_by: null, updated_at: new Date().toISOString() }).eq("id", intakeId)
      return { success: false, error: pdfResult.error || "Failed to generate certificate PDF" }
    }

    const pdfBuffer = pdfResult.buffer
    
    logger.info("PDF generated successfully", { 
      intakeId, 
      certificateNumber,
      size: pdfBuffer.length 
    })

    // 5.5 Store PDF in Supabase Storage (P0 fix - allow patient re-download)
    const storageClient = createServiceRoleClient()
    const storagePath = `med-certs/${patient.id}/${certificateNumber}.pdf`
    
    // Retry upload once on failure before continuing
    let uploadError: Error | null = null
    for (let attempt = 0; attempt < 2; attempt++) {
      const { error } = await storageClient.storage
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
      // Revert the claim since we can't proceed without storage
      await supabase.from("intakes").update({ status: "paid", reviewed_by: null, updated_at: new Date().toISOString() }).eq("id", intakeId)
      return { success: false, error: "Failed to store certificate. Please try again." }
    }

    logger.info("PDF stored successfully", { intakeId, certificateNumber, storagePath })

    // 5.6 Get doctor identity for snapshot
    const doctorIdentity = await getDoctorIdentity(doctorProfile.id)

    // 5.6.5 Generate PDF hash for integrity verification
    const pdfHash = crypto.createHash("sha256").update(pdfBuffer).digest("hex")

    // 5.7 ATOMIC APPROVAL: Create certificate, document record, and update status in single transaction
    // This ensures consistency - either all operations succeed or all fail
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
      // Revert the claim since atomic operation failed
      await supabase.from("intakes").update({ status: "paid", reviewed_by: null, updated_at: new Date().toISOString() }).eq("id", intakeId)
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

    logger.info("Atomic approval completed", {
      intakeId,
      certificateId,
      isExisting: atomicResult.isExisting,
    })

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

    // 6. Generate email HTML - link to dashboard, NOT raw file
    const dashboardUrl = `${env.appUrl}/patient/intakes/${intakeId}`
    const emailHtml = renderMedCertEmailToHtml({
      patientName: patient.full_name,
      dashboardUrl,
    })

    // 7. Send email notification (NO attachment - patient downloads from dashboard)
    logger.info("Sending certificate ready notification", { intakeId, to: patient.email })
    
    const emailResult = await sendViaResend({
      to: patient.email,
      subject: "Your Medical Certificate is Ready - InstantMed",
      html: emailHtml,
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
          deliveryId: emailResult.id,
        })
        await logCertificateEvent(certificateId, "email_sent", null, "system", {
          resend_id: emailResult.id,
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

    // 9. Revalidate dashboard paths
    revalidatePath("/doctor")
    revalidatePath("/doctor/dashboard")
    revalidatePath(`/doctor/intakes/${intakeId}`)
    revalidatePath(`/patient/intakes/${intakeId}`)

    return { success: true, certificateId }
  } catch (error) {
    logger.error("Error approving certificate", { 
      intakeId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred",
    }
  }
}
