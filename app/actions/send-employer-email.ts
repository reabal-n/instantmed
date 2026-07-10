"use server"

/**
 * Server Action: Send Medical Certificate to Employer
 * 
 * Allows patients to forward their approved medical certificate to an employer
 * via a secure signed URL (no dashboard access granted).
 */

import * as Sentry from "@sentry/nextjs"
import { z } from "zod"

import { requireRoleOrNull } from "@/lib/auth/helpers"
import { env } from "@/lib/config/env"
import { checkEmployerEmailBlocked } from "@/lib/config/kill-switches"
import {
  getEmployerCertificateDownloadHref,
  getEmployerCertificateStorageVersion,
} from "@/lib/crypto/employer-certificate-token"
import { getCertificateForIntake } from "@/lib/data/issued-certificates"
import { MedCertEmployerEmail, medCertEmployerEmailSubject } from "@/lib/email/components/templates"
import { checkEmployerEmailRateLimit, sendEmail } from "@/lib/email/send-email"
import { createLogger } from "@/lib/observability/logger"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const log = createLogger("send-employer-email")

// Input validation schema
const sendEmployerEmailSchema = z.object({
  intakeId: z.string().uuid("Invalid intake ID"),
  employerEmail: z.string().email("Invalid email address"),
  employerName: z.string().max(100).optional(),
  companyName: z.string().max(100).optional(),
  note: z.string().max(500, "Note must be 500 characters or less").optional(),
})

export type SendEmployerEmailInput = z.infer<typeof sendEmployerEmailSchema>

interface SendEmployerEmailResult {
  success: boolean
  error?: string
  queued?: boolean
  remainingSends?: number
}

/**
 * Send medical certificate to employer
 */
export async function sendEmployerEmail(input: SendEmployerEmailInput): Promise<SendEmployerEmailResult> {
  // Add Sentry context
  Sentry.setTag("action", "send_employer_email")
  Sentry.setTag("service_type", "med_cert")

  // KILL SWITCH: Check if employer email is disabled
  const killSwitch = checkEmployerEmailBlocked()
  if (killSwitch.blocked) {
    log.warn("[EmployerEmail] Blocked by kill switch", { reason: killSwitch.reason })
    return { success: false, error: killSwitch.userMessage }
  }

  try {
    // 1. Validate input
    const validatedInput = sendEmployerEmailSchema.safeParse(input)
    if (!validatedInput.success) {
      const errorMsg = validatedInput.error.issues[0]?.message || "Invalid input"
      return { success: false, error: errorMsg }
    }

    const { intakeId, employerEmail, employerName, companyName, note } = validatedInput.data

    // 2. Get current user (must be the patient who owns this intake)
    const authUser = await requireRoleOrNull(["patient"])
    if (!authUser) {
      return { success: false, error: "You must be logged in to send emails" }
    }
    const profile = authUser.profile

    Sentry.setTag("intake_id", intakeId)

    // 3. Fetch intake ownership/status. Resolve certificate separately through
    // the valid/current certificate data boundary below.
    const supabase = createServiceRoleClient()
    const { data: intake, error: intakeError } = await supabase
      .from("intakes")
      .select("id, patient_id, status")
      .eq("id", intakeId)
      .single()

    if (intakeError || !intake) {
      log.warn("[EmployerEmail] Intake not found", { intakeId, error: intakeError })
      return { success: false, error: "Request not found" }
    }

    // 4. Verify ownership - patient must own this intake
    if (intake.patient_id !== profile.id) {
      log.warn("[EmployerEmail] Unauthorized access attempt", {
        intakeId,
        patientId: intake.patient_id,
        requestingUserId: profile.id,
      })
      Sentry.captureMessage("Unauthorized employer email attempt", { level: "warning" })
      return { success: false, error: "You don't have permission to access this request" }
    }

    // 5. Verify intake is approved and has a certificate
    if (!["approved", "completed"].includes(intake.status)) {
      return { success: false, error: "This request has not been approved yet" }
    }

    const certificate = await getCertificateForIntake(intakeId)
    if (!certificate) {
      return { success: false, error: "No current certificate found for this request" }
    }

    // 6. Check rate limit (3 sends per 24 hours per intake)
    const rateLimit = await checkEmployerEmailRateLimit(intakeId)
    if (!rateLimit.allowed) {
      const resetTime = rateLimit.resetAt
        ? `Try again after ${rateLimit.resetAt.toLocaleTimeString()}`
        : "Please try again later"
      return {
        success: false,
        error: `You've reached the limit of 3 employer emails for this certificate. ${resetTime}`,
        remainingSends: 0,
      }
    }

    // 7. Generate an app-controlled, seven-day token bound to this exact
    // storage version. Corrections immediately invalidate older emailed links.
    let downloadUrl: string
    try {
      downloadUrl = `${env.appUrl}${getEmployerCertificateDownloadHref(
        certificate.id,
        certificate.storage_path,
      )}`
    } catch (error) {
      log.error("[EmployerEmail] Failed to generate version-bound link", {
        intakeId,
        certificateId: certificate.id,
      }, error instanceof Error ? error : undefined)
      return { success: false, error: "Failed to generate download link. Please try again." }
    }

    // 8. Format dates for display
    const formatDate = (dateStr: string) => {
      try {
        return new Date(dateStr).toLocaleDateString("en-AU", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      } catch {
        return dateStr
      }
    }

    // 9. Send the email
    const emailResult = await sendEmail({
      to: employerEmail,
      toName: employerName || companyName,
      subject: medCertEmployerEmailSubject(certificate.patient_name),
      template: MedCertEmployerEmail({
        employerName,
        companyName,
        patientName: certificate.patient_name,
        downloadUrl,
        expiresInDays: 7,
        verificationCode: certificate.verification_code,
        patientNote: note,
        certStartDate: formatDate(certificate.start_date),
        certEndDate: formatDate(certificate.end_date),
        appUrl: env.appUrl,
      }),
      emailType: "med_cert_employer",
      intakeId,
      patientId: profile.id,
      certificateId: certificate.id,
      metadata: {
        certificate_storage_version: getEmployerCertificateStorageVersion(
          certificate.storage_path,
        ),
        employer_email: employerEmail,
        has_note: !!note,
        secure_link_used: true,
      },
    })

    if (!emailResult.success) {
      if (emailResult.outboxId && emailResult.retryable !== false) {
        const remainingSends = Math.max(0, 3 - (rateLimit.currentCount + 1))
        log.info("[EmployerEmail] Queued for dispatcher recovery", {
          intakeId,
          certificateId: certificate.id,
          outboxId: emailResult.outboxId,
        })
        return { success: true, queued: true, remainingSends }
      }
      log.error("[EmployerEmail] Send failed", {
        intakeId,
        error: emailResult.error,
      })
      return { success: false, error: emailResult.error || "Failed to send email" }
    }

    log.info("[EmployerEmail] Sent successfully", {
      intakeId,
      certificateId: certificate.id,
      messageId: emailResult.messageId,
    })

    // Return remaining sends count
    const remainingSends = Math.max(0, 3 - (rateLimit.currentCount + 1))

    return {
      success: true,
      remainingSends,
    }
  } catch (error) {
    log.error("[EmployerEmail] Unexpected error", { error })
    Sentry.captureException(error)
    return {
      success: false,
      error: "Something went wrong. Please try again.",
    }
  }
}
