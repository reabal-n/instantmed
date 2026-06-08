"use server"

import { z } from "zod"

import { getApiAuth, requireRole } from "@/lib/auth/helpers"
import { env } from "@/lib/config/env"
import { revalidateStaff } from "@/lib/dashboard/revalidate-staff"
import {
  getCertificateForIntake,
  incrementEmailRetry,
  logCertificateEvent,
  updateEmailStatus,
} from "@/lib/data/issued-certificates"
import { MedCertPatientEmail, medCertPatientEmailSubject } from "@/lib/email/components/templates"
import { sendEmail } from "@/lib/email/send-email"
import { createLogger } from "@/lib/observability/logger"
import { getGuestCertificateAccessHref, getPatientIntakeDetailHref } from "@/lib/patient/certificate-download"
import { checkResendRateLimit } from "@/lib/rate-limit/resend-cert"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const log = createLogger("resend-certificate")

interface ResendCertificateResult {
  success: boolean
  error?: string
}

const patientDataSchema = z.object({
  id: z.string(),
  full_name: z.string(),
  email: z.string().email(),
  auth_user_id: z.string().nullable().optional(),
})

/**
 * Phase 3 of dashboard remaster (2026-05-12). One implementation of resend.
 *
 * Two named exports keep call sites self-documenting:
 *   - `resendCertificate(intakeId)` — patient-initiated. Verifies patient
 *     owns the intake, rate-limited (5 per 24h via Upstash Redis).
 *   - `resendCertificateAsStaff(intakeId)` — staff-initiated. Requires
 *     doctor / admin / support role. Server-side throttle (max 3 staff
 *     resends per certificate via `issued_certificates.resend_count`).
 *
 * Both share the same email template, the same `issued_certificates` lookup,
 * and the same email-status / audit logging. The differences are scoped to
 * (a) auth source and (b) rate limiter.
 */
async function fetchIntakeForResend(supabase: ReturnType<typeof createServiceRoleClient>, intakeId: string) {
  return supabase
    .from("intakes")
    .select(`
      id,
      patient_id,
      status,
      patient:profiles!patient_id(
        id,
        full_name,
        email,
        auth_user_id
      )
    `)
    .eq("id", intakeId)
    .single()
}

function pickPatient(rawPatient: unknown) {
  const candidate = Array.isArray(rawPatient) ? rawPatient[0] : rawPatient
  return patientDataSchema.safeParse(candidate)
}

// Guest patients (no linked auth account) get the account-setup entry point so
// the cert email doesn't dead-end at the portal login wall; account holders get
// the portal as before. Mirrors execute-cert-approval.ts.
function accessLink(intakeId: string, patient: { email: string; auth_user_id?: string | null }) {
  return patient.auth_user_id
    ? `${env.appUrl}${getPatientIntakeDetailHref(intakeId)}`
    : `${env.appUrl}${getGuestCertificateAccessHref(intakeId, patient.email)}`
}

export async function resendCertificate(intakeId: string): Promise<ResendCertificateResult> {
  try {
    const authResult = await getApiAuth()

    if (!authResult) {
      return { success: false, error: "Please sign in to continue" }
    }

    const rateLimit = await checkResendRateLimit(intakeId, authResult.profile.id)
    if (!rateLimit.allowed) {
      return {
        success: false,
        error: "You've reached the resend limit for this certificate. Please try again later.",
      }
    }

    const supabase = createServiceRoleClient()
    const { data: intake, error: fetchError } = await fetchIntakeForResend(supabase, intakeId)

    if (fetchError || !intake) {
      log.warn("Resend certificate: intake not found", { intakeId })
      return { success: false, error: "Request not found" }
    }

    if (intake.patient_id !== authResult.profile.id) {
      log.warn("Resend certificate: unauthorized", { intakeId, userId: authResult.profile.id })
      return { success: false, error: "You can only access your own requests" }
    }

    if (!["approved", "completed"].includes(intake.status)) {
      return { success: false, error: "Certificate is not yet available" }
    }

    const parsed = pickPatient(intake.patient)
    if (!parsed.success) {
      return { success: false, error: "Patient email not found" }
    }
    const patient = parsed.data

    const certificate = await getCertificateForIntake(intakeId)
    if (!certificate) {
      log.warn("Resend certificate: certificate not found in issued_certificates", { intakeId })
      return { success: false, error: "Certificate not found. Please contact support." }
    }

    const emailResult = await sendEmail({
      to: patient.email,
      toName: patient.full_name,
      subject: `${medCertPatientEmailSubject(patient.full_name?.split(" ")[0])} (Resent)`,
      template: MedCertPatientEmail({
        patientName: patient.full_name,
        dashboardUrl: accessLink(intakeId, patient),
        verificationCode: certificate.verification_code,
        certType: certificate.certificate_type === "study" ? "study" : certificate.certificate_type === "carer" ? "carer" : "work",
        appUrl: env.appUrl,
        isGuest: !patient.auth_user_id,
      }),
      emailType: "med_cert_patient",
      intakeId,
      patientId: patient.id,
      certificateId: certificate.id,
      metadata: {
        cert_type: certificate.certificate_type,
        resent_by_patient: true,
      },
      tags: [
        { name: "category", value: "med_cert_resend" },
        { name: "intake_id", value: intakeId },
      ],
    })

    if (!emailResult.success) {
      log.error("Resend certificate: email failed", { intakeId, error: emailResult.error })
      return { success: false, error: "Failed to send email. Please try again." }
    }

    log.info("Certificate resent successfully (patient-initiated)", { intakeId })
    return { success: true }
  } catch (error) {
    log.error("Resend certificate: unexpected error", {
      intakeId,
      error: error instanceof Error ? error.message : String(error),
    })
    return { success: false, error: "We couldn't resend your certificate. Please try again." }
  }
}

/**
 * Staff-initiated resend. Throttled at 3 resends per certificate. Updates
 * email status, increments retry count + resend_count, and logs an
 * `email_retry` certificate-audit event with the actor's profile id.
 */
export async function resendCertificateAsStaff(intakeId: string): Promise<ResendCertificateResult> {
  try {
    const { profile } = await requireRole(["doctor", "admin", "support"])
    const supabase = createServiceRoleClient()
    const { data: intake, error: fetchError } = await fetchIntakeForResend(supabase, intakeId)

    if (fetchError || !intake) {
      log.warn("Resend certificate (staff): intake not found", { intakeId })
      return { success: false, error: "Request not found" }
    }

    if (!["approved", "completed"].includes(intake.status)) {
      return { success: false, error: "Certificate is not yet available — intake must be approved first" }
    }

    const parsed = pickPatient(intake.patient)
    if (!parsed.success) {
      log.warn("Resend certificate (staff): invalid patient data", { intakeId, errors: parsed.error.flatten() })
      return { success: false, error: "Patient data is missing or invalid" }
    }
    const patient = parsed.data

    const certificate = await getCertificateForIntake(intakeId)

    if (certificate) {
      if ((certificate.resend_count ?? 0) >= 3) {
        return {
          success: false,
          error: "Maximum resends reached. Contact support if the patient still hasn't received their certificate.",
        }
      }

      const emailResult = await sendEmail({
        to: patient.email,
        toName: patient.full_name,
        subject: `${medCertPatientEmailSubject(patient.full_name?.split(" ")[0])} (Resent)`,
        template: MedCertPatientEmail({
          patientName: patient.full_name,
          dashboardUrl: accessLink(intakeId, patient),
          verificationCode: certificate.verification_code,
          certType: certificate.certificate_type === "study" ? "study" : certificate.certificate_type === "carer" ? "carer" : "work",
          appUrl: env.appUrl,
          isGuest: !patient.auth_user_id,
        }),
        emailType: "med_cert_patient",
        intakeId,
        patientId: patient.id,
        certificateId: certificate.id,
        metadata: {
          cert_type: certificate.certificate_type,
          resent_by: profile.id,
          retry_count: certificate.email_retry_count + 1,
        },
        tags: [
          { name: "category", value: "med_cert_resend" },
          { name: "intake_id", value: intakeId },
          { name: "cert_type", value: certificate.certificate_type },
        ],
      })

      if (emailResult.success) {
        await updateEmailStatus(certificate.id, "sent", {
          deliveryId: emailResult.messageId,
        })

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

        log.info("Certificate resent by staff", {
          intakeId,
          certificateId: certificate.id,
          resentBy: profile.id,
        })
        revalidateStaff({ intakeId })
        return { success: true }
      }

      await updateEmailStatus(certificate.id, "failed", { failureReason: emailResult.error })
      await logCertificateEvent(certificate.id, "email_failed", profile.id, "doctor", {
        error: emailResult.error,
        resend_attempt: true,
      })

      log.error("Certificate staff resend failed", {
        intakeId,
        certificateId: certificate.id,
        error: emailResult.error,
      })
      return { success: false, error: emailResult.error || "Failed to send email" }
    }

    // No certificate found. Distinguish "legacy unmigrated" from "exists but invalid".
    const { data: anyCert } = await supabase
      .from("issued_certificates")
      .select("id, status")
      .eq("intake_id", intakeId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (anyCert) {
      log.warn("Resend certificate (staff): certificate exists but not valid", {
        intakeId,
        certificateId: anyCert.id,
        status: anyCert.status,
      })
      const guidance = anyCert.status === "superseded"
        ? "A newer certificate has already replaced this one. Resend the current valid certificate instead."
        : "Re-approve the intake from the doctor queue to issue a new certificate."
      return {
        success: false,
        error: `Certificate exists but has status "${anyCert.status}". ${guidance}`,
      }
    }

    log.warn("Resend certificate (staff): no certificate record found", { intakeId })
    return {
      success: false,
      error: "No certificate exists for this intake. Approve the intake from the doctor queue to issue one.",
    }
  } catch (error) {
    log.error("Resend certificate (staff): unexpected error", {
      intakeId,
      error: error instanceof Error ? error.message : String(error),
    })
    return { success: false, error: "Failed to resend certificate. Please try again." }
  }
}
