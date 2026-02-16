"use server"

/**
 * Server Action: Send Medical Certificate to Employer
 * 
 * Allows patients to forward their approved medical certificate to an employer
 * via a secure signed URL (no dashboard access granted).
 */

import * as Sentry from "@sentry/nextjs"
import { z } from "zod"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { getCurrentProfile } from "@/lib/data/profiles"
import { sendEmail, checkEmployerEmailRateLimit } from "@/lib/email/send-email"
import { MedCertEmployerEmail, medCertEmployerEmailSubject } from "@/components/email/templates"
import { logger } from "@/lib/observability/logger"
import { env } from "@/lib/env"
import { checkEmployerEmailBlocked } from "@/lib/config/feature-flags"

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
  remainingSends?: number
}

/**
 * Generate a secure signed URL for the certificate PDF
 * Uses Supabase Storage signed URLs with 7-day expiry
 */
async function generateSecureDownloadUrl(
  storagePath: string,
  expiresInSeconds: number = 7 * 24 * 60 * 60 // 7 days
): Promise<string | null> {
  try {
    const supabase = createServiceRoleClient()
    
    const { data, error } = await supabase.storage
      .from("documents")
      .createSignedUrl(storagePath, expiresInSeconds)

    if (error) {
      logger.error("[EmployerEmail] Failed to create signed URL", { error: error.message, storagePath })
      return null
    }

    return data.signedUrl
  } catch (err) {
    logger.error("[EmployerEmail] Signed URL error", { error: err, storagePath })
    return null
  }
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
    logger.warn("[EmployerEmail] Blocked by kill switch", { reason: killSwitch.reason })
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
    const profile = await getCurrentProfile()
    if (!profile) {
      return { success: false, error: "You must be logged in to send emails" }
    }

    Sentry.setTag("intake_id", intakeId)

    // 3. Fetch intake with certificate info
    const supabase = createServiceRoleClient()
    const { data: intake, error: intakeError } = await supabase
      .from("intakes")
      .select(`
        id,
        patient_id,
        status,
        issued_certificates (
          id,
          certificate_number,
          verification_code,
          storage_path,
          start_date,
          end_date,
          patient_name
        )
      `)
      .eq("id", intakeId)
      .single()

    if (intakeError || !intake) {
      logger.warn("[EmployerEmail] Intake not found", { intakeId, error: intakeError })
      return { success: false, error: "Request not found" }
    }

    // 4. Verify ownership - patient must own this intake
    if (intake.patient_id !== profile.id) {
      logger.warn("[EmployerEmail] Unauthorized access attempt", {
        intakeId,
        patientId: intake.patient_id,
        requestingUserId: profile.id,
      })
      Sentry.captureMessage("Unauthorized employer email attempt", { level: "warning" })
      return { success: false, error: "You don't have permission to access this request" }
    }

    // 5. Verify intake is approved and has a certificate
    if (intake.status !== "approved") {
      return { success: false, error: "This request has not been approved yet" }
    }

    const certificates = intake.issued_certificates as Array<{
      id: string
      certificate_number: string
      verification_code: string
      storage_path: string
      start_date: string
      end_date: string
      patient_name: string
    }> | null

    const certificate = certificates?.[0]
    if (!certificate) {
      return { success: false, error: "No certificate found for this request" }
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

    // 7. Generate secure download URL (7-day expiry)
    const downloadUrl = await generateSecureDownloadUrl(certificate.storage_path)
    if (!downloadUrl) {
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
        employer_email: employerEmail,
        has_note: !!note,
        secure_link_used: true,
      },
    })

    if (!emailResult.success) {
      logger.error("[EmployerEmail] Send failed", {
        intakeId,
        error: emailResult.error,
      })
      return { success: false, error: emailResult.error || "Failed to send email" }
    }

    logger.info("[EmployerEmail] Sent successfully", {
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
    logger.error("[EmployerEmail] Unexpected error", { error })
    Sentry.captureException(error)
    return {
      success: false,
      error: "Something went wrong. Please try again.",
    }
  }
}
