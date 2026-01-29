"use server"

import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { requireRole } from "@/lib/auth"
import { sendEmail } from "@/lib/email/send-email"
import { MedCertPatientEmail, medCertPatientEmailSubject } from "@/components/email/templates"
import { env } from "@/lib/env"
import { logger } from "@/lib/observability/logger"
import {
  getCertificateForIntake,
  updateEmailStatus,
  logCertificateEvent,
  incrementEmailRetry,
} from "@/lib/data/issued-certificates"

interface ResendCertificateResult {
  success: boolean
  error?: string
}

/**
 * Server action for doctors/admins to resend a certificate email to the patient.
 * This is useful when the original email failed or the patient didn't receive it.
 * 
 * @param intakeId - The ID of the intake to resend certificate for
 */
export async function resendCertificateAdmin(intakeId: string): Promise<ResendCertificateResult> {
  try {
    // Require doctor or admin role
    const { profile } = await requireRole(["doctor", "admin"])

    const supabase = createServiceRoleClient()

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
      logger.warn("Resend certificate admin: intake not found", { intakeId })
      return { success: false, error: "Request not found" }
    }

    // Verify status is approved or completed
    if (!["approved", "completed"].includes(intake.status)) {
      return { success: false, error: "Certificate is not yet available - intake must be approved first" }
    }

    // Get patient data
    const patientData = intake.patient as { id: string; full_name: string; email: string } | { id: string; full_name: string; email: string }[] | null
    const patient = Array.isArray(patientData) ? patientData[0] : patientData
    
    if (!patient?.email) {
      return { success: false, error: "Patient email not found" }
    }

    // Get the certificate for this intake
    const certificate = await getCertificateForIntake(intakeId)
    
    if (!certificate) {
      logger.warn("Resend certificate admin: certificate not found", { intakeId })
      return { success: false, error: "Certificate not found for this intake" }
    }

    // Increment retry count
    await incrementEmailRetry(certificate.id)

    // Send email using the same approach as initial approval
    const dashboardUrl = `${env.appUrl}/patient/intakes/${intakeId}`
    
    const emailResult = await sendEmail({
      to: patient.email,
      toName: patient.full_name,
      subject: `${medCertPatientEmailSubject} (Resent)`,
      template: MedCertPatientEmail({
        patientName: patient.full_name,
        dashboardUrl,
        verificationCode: certificate.verification_code,
        certType: certificate.certificate_type === "study" ? "study" : certificate.certificate_type === "carer" ? "carer" : "work",
        appUrl: env.appUrl,
      }),
      emailType: "med_cert_patient",
      intakeId,
      patientId: patient.id,
      certificateId: certificate.id,
      metadata: {
        cert_type: certificate.certificate_type,
        verification_code: certificate.verification_code,
        resent_by: profile.id,
        retry_count: certificate.email_retry_count + 1,
      },
      tags: [
        { name: "category", value: "med_cert_resend" },
        { name: "intake_id", value: intakeId },
        { name: "cert_type", value: certificate.certificate_type },
      ],
    })

    // Update certificate email status
    if (emailResult.success) {
      await updateEmailStatus(certificate.id, "sent", {
        deliveryId: emailResult.messageId,
      })
      await logCertificateEvent(certificate.id, "email_retry", profile.id, "doctor", {
        resend_reason: "manual_admin_resend",
        resend_by_name: profile.full_name,
      })
      
      logger.info("Certificate resent by admin", { 
        intakeId, 
        certificateId: certificate.id,
        to: patient.email,
        resentBy: profile.id,
      })
      return { success: true }
    } else {
      await updateEmailStatus(certificate.id, "failed", {
        failureReason: emailResult.error,
      })
      await logCertificateEvent(certificate.id, "email_failed", profile.id, "doctor", {
        error: emailResult.error,
        resend_attempt: true,
      })
      
      logger.error("Certificate resend failed", { 
        intakeId, 
        certificateId: certificate.id,
        error: emailResult.error,
      })
      return { success: false, error: emailResult.error || "Failed to send email" }
    }
  } catch (error) {
    logger.error("Resend certificate admin: unexpected error", {
      intakeId,
      error: error instanceof Error ? error.message : String(error),
    })
    return { success: false, error: "Failed to resend certificate. Please try again." }
  }
}
