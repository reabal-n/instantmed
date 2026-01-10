"use server"

import React from "react"
import { revalidatePath } from "next/cache"
import { renderToBuffer } from "@react-pdf/renderer"
import { MedCertPdfDocument, type MedCertPdfData } from "@/lib/pdf/med-cert-pdf"
import { sendViaResend } from "@/lib/email/resend"
import { renderMedCertEmailToHtml } from "@/components/email/med-cert-email"
import { createClient } from "@/lib/supabase/server"
import { getCurrentProfile } from "@/lib/data/profiles"
import { requireAuth } from "@/lib/auth"
import { env } from "@/lib/env"
import { logger } from "@/lib/logger"
import { generateCertificateNumber } from "@/lib/pdf/generate-med-cert"
import type { CertReviewData } from "@/components/doctor/cert-review-modal"

interface ApproveCertResult {
  success: boolean
  error?: string
}

/**
 * Server action to approve a medical certificate request, generate PDF, and email it to the patient.
 * 
 * @param requestId - The ID of the request to approve
 * @param reviewData - The edited certificate data from the review modal
 */
export async function approveAndSendCert(
  requestId: string,
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

    // 2. Fetch the request with patient details
    const { data: request, error: requestError } = await supabase
      .from("requests")
      .select(`
        *,
        patient:profiles!requests_patient_id_fkey(
          id,
          full_name,
          email,
          date_of_birth
        ),
        answers:request_answers(
          answers
        )
      `)
      .eq("id", requestId)
      .single()

    if (requestError || !request) {
      logger.error("Request not found", { requestId, error: requestError })
      return { success: false, error: "Request not found" }
    }

    // Verify it's a medical certificate request
    if (request.category !== "medical_certificate") {
      return { success: false, error: "This action is only for medical certificate requests" }
    }

    // Verify request is pending
    if (request.status !== "pending") {
      return { success: false, error: `Request is already ${request.status}` }
    }

    const patient = request.patient as { id: string; full_name: string; email: string; date_of_birth: string | null } | null
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

    // Get certificate type from request subtype or default to "work"
    const certificateType = (request.subtype === "uni" ? "study" : request.subtype === "carer" ? "carer" : "work") as "work" | "study" | "carer"

    // Get symptoms summary from request answers or use medical reason
    const answers = request.answers as { answers: Record<string, unknown> } | null
    let symptomsSummary = reviewData.medicalReason
    if (answers?.answers) {
      const symptoms = answers.answers.symptoms as string[] | undefined
      if (symptoms && Array.isArray(symptoms) && symptoms.length > 0) {
        symptomsSummary = symptoms.join(", ")
      } else if (answers.answers.symptomDetails) {
        symptomsSummary = String(answers.answers.symptomDetails)
      }
    }

    // Get patient DOB (required for PDF)
    // Use empty string if not available so it's obvious on PDF that it's missing
    const patientDob = patient.date_of_birth || ""

    // Get AHPRA number
    const clinicianRegistration = "MED0002576546"

    // Extract carer details if certificate type is "carer"
    let carerPersonName: string | undefined
    let carerRelationship: string | undefined
    if (certificateType === "carer" && answers?.answers) {
      // Check both possible field names from intake flow
      carerPersonName = (answers.answers.carer_patient_name as string | undefined) || 
                       (answers.answers.carerPatientName as string | undefined)
      carerRelationship = (answers.answers.carer_relationship as string | undefined) || 
                         (answers.answers.carerRelationship as string | undefined)
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
    logger.info("Generating PDF for medical certificate", { requestId, certificateNumber })
    
    const pdfElement = React.createElement(MedCertPdfDocument, { data: pdfData }) as any
    const pdfBuffer = await renderToBuffer(pdfElement)
    
    logger.info("PDF generated successfully", { 
      requestId, 
      certificateNumber,
      size: pdfBuffer.length 
    })

    // 5. Convert PDF buffer to base64 for email attachment
    const pdfBase64 = pdfBuffer.toString("base64")

    // 6. Generate email HTML
    const dashboardUrl = `${env.appUrl}/patient/requests/${requestId}`
    const emailHtml = renderMedCertEmailToHtml({
      patientName: patient.full_name,
      dashboardUrl,
    })

    // 7. Send email with PDF attachment via Resend
    logger.info("Sending email with PDF attachment", { requestId, to: patient.email })
    
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
        { name: "request_id", value: requestId },
        { name: "cert_type", value: certificateType },
      ],
    })

    if (!emailResult.success) {
      logger.error("Failed to send email", { requestId, error: emailResult.error })
      return { success: false, error: `Failed to send email: ${emailResult.error}` }
    }

    logger.info("Email sent successfully", { requestId, resendId: emailResult.id })

    // 8. Update request status in Supabase
    const { error: updateError } = await supabase
      .from("requests")
      .update({
        status: "approved",
        reviewed_by: doctorProfile.id,
        reviewed_at: new Date().toISOString(),
        decided_at: new Date().toISOString(),
        decision: "approved",
        // Note: If your schema has approved_at and doctor_id fields, add them here:
        // approved_at: new Date().toISOString(),
        // doctor_id: doctorProfile.id,
      })
      .eq("id", requestId)

    if (updateError) {
      logger.error("Failed to update request status", { requestId, error: updateError })
      return { success: false, error: `Failed to update request: ${updateError.message}` }
    }

    logger.info("Request updated successfully", { requestId, status: "approved" })

    // 9. Revalidate dashboard paths
    revalidatePath("/doctor")
    revalidatePath("/doctor/dashboard")
    revalidatePath(`/doctor/requests/${requestId}`)
    revalidatePath(`/patient/requests/${requestId}`)

    return { success: true }
  } catch (error) {
    logger.error("Error approving certificate", { requestId }, error instanceof Error ? error : new Error(String(error)))
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred",
    }
  }
}
