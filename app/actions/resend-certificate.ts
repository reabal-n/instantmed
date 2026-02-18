"use server"

import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { getApiAuth } from "@/lib/auth"
import { sendEmail } from "@/lib/email/send-email"
import { MedCertPatientEmail, medCertPatientEmailSubject } from "@/components/email/templates"
import { env } from "@/lib/env"
import { logger } from "@/lib/observability/logger"
import { getCertificateForIntake } from "@/lib/data/issued-certificates"

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
    const authResult = await getApiAuth()

    if (!authResult) {
      return { success: false, error: "Please sign in to continue" }
    }

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
      logger.warn("Resend certificate: intake not found", { intakeId })
      return { success: false, error: "Request not found" }
    }

    // Verify ownership
    if (intake.patient_id !== authResult.profile.id) {
      logger.warn("Resend certificate: unauthorized", { intakeId, userId: authResult.profile.id })
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

    // First check issued_certificates table (new flow)
    const certificate = await getCertificateForIntake(intakeId)
    
    if (certificate) {
      // Use centralized email system
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
          resent_by_patient: true,
        },
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
    }

    // Fallback: No certificate found in issued_certificates
    logger.warn("Resend certificate: certificate not found in issued_certificates", { intakeId })
    return { success: false, error: "Certificate not found. Please contact support." }
  } catch (error) {
    logger.error("Resend certificate: unexpected error", {
      intakeId,
      error: error instanceof Error ? error.message : String(error),
    })
    return { success: false, error: "We couldn't resend your certificate. Please try again." }
  }
}
