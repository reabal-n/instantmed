"use server"

import { z } from "zod"
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

const patientDataSchema = z.object({
  id: z.string(),
  full_name: z.string(),
  email: z.string().email(),
})

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

    // Get patient data with Zod validation
    const rawPatient = Array.isArray(intake.patient) ? intake.patient[0] : intake.patient
    const patientResult = patientDataSchema.safeParse(rawPatient)

    if (!patientResult.success) {
      logger.warn("Resend certificate admin: invalid patient data", { intakeId, errors: patientResult.error.flatten() })
      return { success: false, error: "Patient data is missing or invalid" }
    }

    const patient = patientResult.data

    // Get the certificate for this intake (new issued_certificates table)
    const certificate = await getCertificateForIntake(intakeId)
    
    // If found in issued_certificates, use the new flow
    if (certificate) {
      // Server-side throttle: max 3 doctor-initiated resends
      if ((certificate.resend_count ?? 0) >= 3) {
        return { success: false, error: "Maximum resends reached. Contact support if the patient still hasn't received their certificate." }
      }

      // Send email using the same approach as initial approval
      const dashboardUrl = `${env.appUrl}/track/${intakeId}`

      // Generate signed download URL (72h expiry) so patient can download without login
      let downloadUrl: string | undefined
      if (certificate.storage_path) {
        try {
          const { data: signedUrlData } = await supabase.storage
            .from("documents")
            .createSignedUrl(certificate.storage_path, 3 * 24 * 60 * 60)
          downloadUrl = signedUrlData?.signedUrl ?? undefined
        } catch {
          logger.warn("Resend cert admin: failed to generate signed URL", { intakeId })
        }
      }

      const emailResult = await sendEmail({
        to: patient.email,
        toName: patient.full_name,
        subject: `${medCertPatientEmailSubject(patient.full_name?.split(" ")[0])} (Resent)`,
        template: MedCertPatientEmail({
          patientName: patient.full_name,
          downloadUrl,
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

        // Increment retry count + doctor resend count; clear email_opened_at so
        // the Resend webhook can re-record when the patient opens the resent email
        await Promise.all([
          incrementEmailRetry(certificate.id),
          supabase
            .from("issued_certificates")
            .update({
              resend_count: (certificate.resend_count ?? 0) + 1,
              email_opened_at: null,
            })
            .eq("id", certificate.id),
        ])

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
    }

    // No certificate found in issued_certificates - this is a legacy intake or approval failed mid-way
    // Check if there's any certificate (including superseded) to provide better context
    const { data: anyCert } = await supabase
      .from("issued_certificates")
      .select("id, status")
      .eq("intake_id", intakeId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (anyCert) {
      logger.warn("Resend certificate admin: certificate exists but not valid", { 
        intakeId, 
        certificateId: anyCert.id,
        status: anyCert.status 
      })
      return { 
        success: false, 
        error: `Certificate exists but has status "${anyCert.status}". Use "Regenerate Certificate" to create a new one.` 
      }
    }

    // No certificate at all - likely a legacy intake or approval that failed before certificate creation
    logger.warn("Resend certificate admin: no certificate record found", { intakeId })
    return { 
      success: false, 
      error: "No certificate exists for this intake. Use \"Regenerate Certificate\" to create one." 
    }
  } catch (error) {
    logger.error("Resend certificate admin: unexpected error", {
      intakeId,
      error: error instanceof Error ? error.message : String(error),
    })
    return { success: false, error: "Failed to resend certificate. Please try again." }
  }
}
