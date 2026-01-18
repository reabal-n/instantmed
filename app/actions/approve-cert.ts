"use server"

import React from "react"
import { revalidatePath } from "next/cache"
import { renderToBuffer } from "@react-pdf/renderer"
import { MedCertPdfDocument, type MedCertPdfData } from "@/lib/pdf/med-cert-pdf"
import { sendViaResend } from "@/lib/email/resend"
import { renderMedCertEmailToHtml } from "@/components/email/med-cert-email"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { getCurrentProfile } from "@/lib/data/profiles"
import { requireAuth } from "@/lib/auth"
import { env } from "@/lib/env"
import { logger } from "@/lib/observability/logger"
import { getPostHogClient } from "@/lib/posthog-server"
import { generateCertificateNumber } from "@/lib/pdf/generate-med-cert"
import type { CertReviewData } from "@/components/doctor/cert-review-modal"

interface ApproveCertResult {
  success: boolean
  error?: string
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

    const supabase = await createClient()

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

    // Verify intake is in reviewable status
    if (!["paid", "in_review"].includes(intake.status)) {
      return { success: false, error: `Intake is already ${intake.status}` }
    }

    // Optimistic locking: claim the intake for processing to prevent duplicate reviews
    const { data: claimed, error: claimError } = await supabase
      .from("intakes")
      .update({ 
        status: "processing", 
        reviewed_by: doctorProfile.id,
        claimed_at: new Date().toISOString()
      })
      .eq("id", intakeId)
      .in("status", ["paid", "in_review"])
      .select("id")
      .single()

    if (claimError || !claimed) {
      logger.warn("Failed to claim intake - may already be processing", { intakeId, claimError })
      return { success: false, error: "This intake is already being processed by another doctor" }
    }

    const patient = intake.patient as { id: string; full_name: string; email: string; date_of_birth: string | null } | null
    if (!patient || !patient.email) {
      return { success: false, error: "Patient email not found" }
    }

    // 3. Prepare PDF data
    const certificateNumber = generateCertificateNumber()
    const generatedAt = new Date().toISOString()
    const watermark = `InstantMed • ${generatedAt.replace("T", " ").slice(0, 19)} UTC • ${certificateNumber}`

    // Calculate duration days
    const startDate = new Date(reviewData.startDate)
    const endDate = new Date(reviewData.endDate)
    const durationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1

    // Get certificate type from service slug or default to "work"
    const certSubtype = service.slug.includes("carer") ? "carer" : service.slug.includes("uni") ? "uni" : "work"
    const certificateType = (certSubtype === "uni" ? "study" : certSubtype === "carer" ? "carer" : "work") as "work" | "study" | "carer"

    // Get symptoms summary from intake answers or use medical reason
    const answers = intake.answers as unknown as { answers: Record<string, unknown> }[] | null
    const answersData = answers?.[0]?.answers || null
    let symptomsSummary = reviewData.medicalReason
    if (answersData) {
      const symptoms = answersData.symptoms as string[] | undefined
      if (symptoms && Array.isArray(symptoms) && symptoms.length > 0) {
        symptomsSummary = symptoms.join(", ")
      } else if (answersData.symptomDetails) {
        symptomsSummary = String(answersData.symptomDetails)
      }
    }

    // Get patient DOB (required for PDF)
    // Use empty string if not available so it's obvious on PDF that it's missing
    const patientDob = patient.date_of_birth || ""

    // Get AHPRA number from doctor's profile - required for legal certificates
    if (!doctorProfile.ahpra_number) {
      logger.error("Doctor missing AHPRA number", { doctorId: doctorProfile.id })
      // Revert the claim since we can't proceed
      await supabase.from("intakes").update({ status: "paid", reviewed_by: null, claimed_at: null }).eq("id", intakeId)
      return { success: false, error: "Your AHPRA number is not configured. Please update your profile in Settings before approving certificates." }
    }
    const clinicianRegistration = doctorProfile.ahpra_number

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

    // Build PDF data
    const pdfData: MedCertPdfData = {
      certificateNumber,
      certificateType,
      patientName: patient.full_name,
      patientDob,
      startDate: reviewData.startDate,
      endDate: reviewData.endDate,
      durationDays,
      symptomsSummary,
      clinicianName: reviewData.doctorName,
      clinicianRegistration,
      generatedAt,
      watermark,
      // Add carer details if present
      ...(certificateType === "carer" && carerPersonName && {
        carerPersonName,
        carerRelationship,
      }),
    }

    // 4. Generate PDF Buffer
    logger.info("Generating PDF for medical certificate", { intakeId, certificateNumber })
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfElement = React.createElement(MedCertPdfDocument, { data: pdfData }) as any
    const pdfBuffer = await renderToBuffer(pdfElement)
    
    logger.info("PDF generated successfully", { 
      intakeId, 
      certificateNumber,
      size: pdfBuffer.length 
    })

    // 5. Convert PDF buffer to base64 for email attachment
    const pdfBase64 = pdfBuffer.toString("base64")

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
      logger.error("Failed to upload PDF to storage after retries (continuing with email)", { 
        intakeId, 
        certificateNumber, 
        error: uploadError 
      })
    } else {
      // Record the document in database
      await storageClient.from("intake_documents").insert({
        intake_id: intakeId,
        document_type: "med_cert",
        filename: `Medical_Certificate_${certificateNumber}.pdf`,
        storage_path: storagePath,
        mime_type: "application/pdf",
        file_size_bytes: pdfBuffer.length,
        certificate_number: certificateNumber,
        created_by: doctorProfile.id,
        metadata: {
          patient_name: patient.full_name,
          certificate_type: certificateType,
          start_date: reviewData.startDate,
          end_date: reviewData.endDate,
        },
      })
      logger.info("PDF stored successfully", { intakeId, certificateNumber, storagePath })
    }

    // 6. Generate email HTML
    const dashboardUrl = `${env.appUrl}/patient/intakes/${intakeId}`
    const emailHtml = renderMedCertEmailToHtml({
      patientName: patient.full_name,
      dashboardUrl,
    })

    // 7. Send email with PDF attachment via Resend
    logger.info("Sending email with PDF attachment", { intakeId, to: patient.email })
    
    const emailResult = await sendViaResend({
      to: patient.email,
      subject: "Your Medical Certificate from InstantMed",
      html: emailHtml,
      attachments: [
        {
          filename: `Medical_Certificate_${certificateNumber}.pdf`,
          content: pdfBase64,
          type: "application/pdf",
          disposition: "attachment",
        },
      ],
      tags: [
        { name: "category", value: "med_cert_approved" },
        { name: "intake_id", value: intakeId },
        { name: "cert_type", value: certificateType },
      ],
    })

    if (!emailResult.success) {
      logger.error("Failed to send email", { intakeId, error: emailResult.error })
      return { success: false, error: `Failed to send email: ${emailResult.error}` }
    }

    logger.info("Email sent successfully", { intakeId, resendId: emailResult.id })

    // 8. Update intake status in Supabase
    const { error: updateError } = await supabase
      .from("intakes")
      .update({
        status: "approved",
        reviewed_by: doctorProfile.id,
        reviewed_at: new Date().toISOString(),
        decided_at: new Date().toISOString(),
        decision: "approved",
        approved_at: new Date().toISOString(),
      })
      .eq("id", intakeId)

    if (updateError) {
      logger.error("Failed to update intake status", { intakeId, error: updateError })
      return { success: false, error: `Failed to update intake: ${updateError.message}` }
    }

    logger.info("Intake updated successfully", { intakeId, status: "approved" })

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

    return { success: true }
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
