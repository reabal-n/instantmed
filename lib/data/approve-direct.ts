import "server-only"

import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createLogger } from "@/lib/observability/logger"
import { sendEmail } from "@/lib/email/send-email"
import { MedCertPatientEmail, medCertPatientEmailSubject } from "@/components/email/templates"
import { generateVerificationCode, generateCertificateNumber, generateCertificateRef } from "@/lib/pdf/cert-identifiers"
import { renderTemplatePdf } from "@/lib/pdf/template-renderer"
import { atomicApproveCertificate, logCertificateEvent } from "@/lib/data/issued-certificates"
import { createNotification } from "@/lib/notifications/service"
import { env } from "@/lib/env"
import { COMPANY_NAME, ABN, COMPANY_ADDRESS, CONTACT_PHONE, CONTACT_EMAIL } from "@/lib/constants"
import { DEFAULT_TEMPLATE_CONFIG } from "@/types/certificate-template"
import { createElement } from "react"
import { formatDateLong, formatShortDate, formatShortDateSafe } from "@/lib/format"

const log = createLogger("approve-direct")

interface DirectApproveParams {
  intakeId: string
  doctorProfileId: string
  doctorName: string
  providerNumber: string
  consultDate: string
  startDate: string
  endDate: string
  medicalReason: string
}

interface DirectApproveResult {
  success: boolean
  error?: string
  certificateId?: string
}

/**
 * Approve a med cert directly without a browser session.
 * Used by the Telegram webhook for quick approvals.
 */
export async function approveMedCertDirect({
  intakeId,
  doctorProfileId,
  doctorName,
  providerNumber,
  consultDate,
  startDate,
  endDate,
  medicalReason,
}: DirectApproveParams): Promise<DirectApproveResult> {
  const supabase = createServiceRoleClient()

  try {
    const { data: intake, error: intakeError } = await supabase
      .from("intakes")
      .select(`
        *,
        service:services!service_id(id, slug, name, type),
        patient:profiles!patient_id(id, full_name, email, date_of_birth),
        answers:intake_answers(answers)
      `)
      .eq("id", intakeId)
      .single()

    if (intakeError || !intake) {
      return { success: false, error: "Intake not found" }
    }

    const service = intake.service as { id: string; slug: string; name: string; type: string } | null
    if (!service || service.type !== "med_certs") {
      return { success: false, error: "Not a medical certificate intake" }
    }

    if (!["paid", "in_review"].includes(intake.status)) {
      return { success: false, error: `Intake is ${intake.status}, not reviewable` }
    }

    const patient = intake.patient as { id: string; full_name: string; email: string; date_of_birth: string | null } | null
    if (!patient?.email) {
      return { success: false, error: "Patient email not found" }
    }

    // Claim the intake
    const { data: claimResult, error: claimError } = await supabase.rpc("claim_intake_for_review", {
      p_intake_id: intakeId,
      p_doctor_id: doctorProfileId,
      p_force: true,
    })
    const claim = Array.isArray(claimResult) ? claimResult[0] : claimResult
    if (claimError || !claim?.success) {
      return { success: false, error: claim?.error_message || "Failed to claim intake" }
    }

    // Determine certificate type
    const intakeSubtype = (intake as Record<string, unknown>).subtype as string | undefined
    const certificateType: "work" | "study" | "carer" =
      intakeSubtype === "study" || intakeSubtype === "carer" || intakeSubtype === "work"
        ? intakeSubtype
        : service.slug.includes("carer") ? "carer" : "work"

    const certificateNumber = generateCertificateNumber()
    const certificateRef = generateCertificateRef(certificateType)
    const verificationCode = generateVerificationCode()
    const generatedAt = new Date().toISOString()

    // Generate PDF using the template renderer
    const pdfResult = await renderTemplatePdf({
      certificateType,
      patientName: patient.full_name,
      patientDateOfBirth: formatShortDateSafe(patient.date_of_birth),
      consultationDate: formatDateLong(consultDate),
      startDate: formatDateLong(startDate),
      endDate: formatDateLong(endDate),
      certificateRef,
      issueDate: formatShortDate(generatedAt),
    })

    if (!pdfResult.success || !pdfResult.buffer) {
      log.error("PDF generation failed", { intakeId, error: pdfResult.error })
      return { success: false, error: pdfResult.error || "Failed to generate certificate PDF" }
    }

    // Upload PDF to Supabase Storage
    const pdfFileName = `${intakeId}-${certificateRef}.pdf`
    const storagePath = `certificates/${pdfFileName}`
    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(storagePath, pdfResult.buffer, { contentType: "application/pdf", upsert: true })

    if (uploadError) {
      log.error("PDF upload failed", { intakeId, error: uploadError.message })
      return { success: false, error: "Failed to upload certificate PDF" }
    }

    // Get doctor's AHPRA number
    const { data: doctorFull } = await supabase
      .from("profiles")
      .select("ahpra_number")
      .eq("id", doctorProfileId)
      .single()

    // Atomic approve: insert certificate + update intake status
    const certResult = await atomicApproveCertificate({
      intake_id: intakeId,
      certificate_number: certificateNumber,
      certificate_ref: certificateRef,
      verification_code: verificationCode,
      certificate_type: certificateType,
      issue_date: generatedAt,
      start_date: startDate,
      end_date: endDate,
      patient_id: patient.id,
      patient_name: patient.full_name,
      patient_dob: patient.date_of_birth,
      doctor_id: doctorProfileId,
      doctor_name: doctorName,
      doctor_nominals: null,
      doctor_provider_number: providerNumber,
      doctor_ahpra_number: doctorFull?.ahpra_number || "",
      template_config_snapshot: DEFAULT_TEMPLATE_CONFIG as unknown as Record<string, unknown>,
      clinic_identity_snapshot: {
        companyName: COMPANY_NAME,
        abn: ABN,
        address: COMPANY_ADDRESS,
        phone: CONTACT_PHONE,
        email: CONTACT_EMAIL,
      },
      storage_path: storagePath,
      file_size_bytes: pdfResult.buffer.length,
      filename: pdfFileName,
    })

    if (!certResult.success) {
      return { success: false, error: certResult.error || "Failed to create certificate record" }
    }

    // Save doctor notes
    await supabase
      .from("intakes")
      .update({ doctor_notes: `Approved via Telegram. Reason: ${medicalReason}` })
      .eq("id", intakeId)

    // Send email to patient
    const appUrl = env.appUrl
    const { data: signedUrlData } = await supabase.storage
      .from("documents")
      .createSignedUrl(storagePath, 7 * 24 * 60 * 60)

    const downloadUrl = signedUrlData?.signedUrl || undefined

    try {
      await sendEmail({
        to: patient.email,
        toName: patient.full_name,
        subject: medCertPatientEmailSubject,
        template: createElement(MedCertPatientEmail, {
          patientName: patient.full_name,
          downloadUrl,
          dashboardUrl: `${appUrl}/patient/intakes/${intakeId}`,
          verificationCode,
          certType: certificateType,
        }),
        emailType: "med_cert_patient",
        intakeId,
        patientId: patient.id,
      })
    } catch (emailErr) {
      log.error("Certificate email failed (non-fatal)", { intakeId }, emailErr instanceof Error ? emailErr : new Error(String(emailErr)))
    }

    // In-app notification
    try {
      await createNotification({
        userId: patient.id,
        title: "Your certificate is ready",
        message: "Your medical certificate has been approved and is ready to download.",
        type: "document_ready",
        actionUrl: `/patient/intakes/${intakeId}`,
        metadata: { intakeId },
      })
    } catch {
      log.warn("In-app notification failed (non-fatal)", { intakeId })
    }

    // Audit log
    await logCertificateEvent(certResult.certificateId!, "issued", doctorProfileId, "doctor", {
      source: "telegram",
      certificateType,
    })

    log.info("Med cert approved via Telegram", { intakeId, certificateId: certResult.certificateId })

    return { success: true, certificateId: certResult.certificateId }
  } catch (error) {
    log.error("Direct approval error", { intakeId }, error instanceof Error ? error : new Error(String(error)))
    return { success: false, error: error instanceof Error ? error.message : "Approval failed" }
  }
}
