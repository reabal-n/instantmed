"use server"

import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { getAuthenticatedUserWithProfile } from "@/lib/auth"
import { sendViaResend } from "@/lib/email/resend"
import { renderMedCertEmailToHtml } from "@/components/email/med-cert-email"
import { env } from "@/lib/env"
import { logger } from "@/lib/observability/logger"

interface ResendCertificateResult {
  success: boolean
  error?: string
}

/**
 * Server action to resend the certificate email to the patient.
 * Only the patient who owns the intake can request a resend.
 * 
 * @param intakeId - The ID of the intake to resend certificate for
 */
export async function resendCertificate(intakeId: string): Promise<ResendCertificateResult> {
  try {
    const authUser = await getAuthenticatedUserWithProfile()
    
    if (!authUser) {
      return { success: false, error: "Please sign in to continue" }
    }

    const supabase = await createClient()

    // Fetch the intake with patient info
    const { data: intake, error: fetchError } = await supabase
      .from("intakes")
      .select(`
        id, 
        patient_id, 
        status,
        patient:profiles!patient_id(
          id,
          full_name,
          email
        )
      `)
      .eq("id", intakeId)
      .single()

    if (fetchError || !intake) {
      logger.warn("Resend certificate: intake not found", { intakeId })
      return { success: false, error: "Request not found" }
    }

    // Verify ownership
    if (intake.patient_id !== authUser.profile.id) {
      logger.warn("Resend certificate: unauthorized", { intakeId, userId: authUser.profile.id })
      return { success: false, error: "You can only access your own requests" }
    }

    // Verify status is approved or completed
    if (!["approved", "completed"].includes(intake.status)) {
      return { success: false, error: "Certificate is not yet available" }
    }

    const patientData = intake.patient as { id: string; full_name: string; email: string }[] | null
    const patient = patientData?.[0] ?? null
    if (!patient?.email) {
      return { success: false, error: "Patient email not found" }
    }

    // Fetch the document from intake_documents
    const serviceClient = createServiceRoleClient()
    const { data: document, error: docError } = await serviceClient
      .from("intake_documents")
      .select("storage_path, certificate_number, filename")
      .eq("intake_id", intakeId)
      .eq("document_type", "med_cert")
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (docError || !document) {
      logger.warn("Resend certificate: document not found", { intakeId })
      return { success: false, error: "Certificate document not found. Please contact support." }
    }

    // Download the PDF from storage
    const { data: pdfData, error: downloadError } = await serviceClient.storage
      .from("documents")
      .download(document.storage_path)

    if (downloadError || !pdfData) {
      logger.error("Resend certificate: download failed", { intakeId, error: downloadError })
      return { success: false, error: "Failed to retrieve certificate. Please contact support." }
    }

    // Convert to base64
    const pdfBuffer = Buffer.from(await pdfData.arrayBuffer())
    const pdfBase64 = pdfBuffer.toString("base64")

    // Generate email HTML
    const dashboardUrl = `${env.appUrl}/patient/intakes/${intakeId}`
    const emailHtml = renderMedCertEmailToHtml({
      patientName: patient.full_name,
      dashboardUrl,
    })

    // Send email
    const emailResult = await sendViaResend({
      to: patient.email,
      subject: "Your Medical Certificate from InstantMed (Resent)",
      html: emailHtml,
      attachments: [
        {
          filename: document.filename,
          content: pdfBase64,
          type: "application/pdf",
          disposition: "attachment",
        },
      ],
      tags: [
        { name: "category", value: "med_cert_resend" },
        { name: "intake_id", value: intakeId },
      ],
    })

    if (!emailResult.success) {
      logger.error("Resend certificate: email failed", { intakeId, error: emailResult.error })
      return { success: false, error: "Failed to send email. Please try again." }
    }

    logger.info("Certificate resent successfully", { intakeId, to: patient.email })
    return { success: true }
  } catch (error) {
    logger.error("Resend certificate: unexpected error", {
      intakeId,
      error: error instanceof Error ? error.message : String(error),
    })
    return { success: false, error: "An unexpected error occurred" }
  }
}
