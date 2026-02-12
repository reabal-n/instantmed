"use server"

import { revalidatePath } from "next/cache"
import { requireRole } from "@/lib/auth"
import { sendEmail } from "@/lib/email/send-email"
import { sendFromOutboxRow, claimOutboxRow, type OutboxRow } from "@/lib/email/send-email"
import { MedCertEmail } from "@/components/email/med-cert-email"
import { env } from "@/lib/env"
import {
  getFailedEmailDeliveries,
  getCertificateById,
  updateEmailStatus,
  incrementEmailRetry,
  logCertificateEvent,
} from "@/lib/data/issued-certificates"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createLogger } from "@/lib/observability/logger"

const log = createLogger("email-retry")

interface RetryResult {
  success: boolean
  error?: string
}

async function requireAdminRole() {
  const { profile } = await requireRole(["admin"])
  return profile
}

/**
 * Get failed email deliveries for admin review
 */
export async function getFailedEmails() {
  try {
    await requireAdminRole()

    const failures = await getFailedEmailDeliveries(50)

    return {
      success: true,
      failures: failures.map((cert) => ({
        id: cert.id,
        certificateNumber: cert.certificate_number,
        patientName: cert.patient_name,
        patientId: cert.patient_id,
        intakeId: cert.intake_id,
        failureReason: cert.email_failure_reason,
        failedAt: cert.email_failed_at,
        retryCount: cert.email_retry_count,
        createdAt: cert.created_at,
      })),
    }
  } catch (error) {
    log.error("Failed to get failed emails", {}, error instanceof Error ? error : undefined)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load failures",
      failures: [],
    }
  }
}

/**
 * Retry sending email for a specific certificate
 */
export async function retryEmail(certificateId: string): Promise<RetryResult> {
  try {
    const adminProfile = await requireAdminRole()

    // Get certificate details
    const certificate = await getCertificateById(certificateId)
    if (!certificate) {
      return { success: false, error: "Certificate not found" }
    }

    // Check if already sent
    if (certificate.email_sent_at) {
      return { success: false, error: "Email already sent successfully" }
    }

    // Check retry count
    if (certificate.email_retry_count >= 3) {
      return { success: false, error: "Maximum retry attempts reached" }
    }

    // Get patient email from profiles
    const supabase = createServiceRoleClient()
    const { data: patient } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", certificate.patient_id)
      .single()

    if (!patient?.email) {
      return { success: false, error: "Patient email not found" }
    }

    // Increment retry count first
    await incrementEmailRetry(certificateId)

    // Generate email template as React element
    const dashboardUrl = `${env.appUrl}/patient/intakes/${certificate.intake_id}`
    const emailTemplate = MedCertEmail({
      patientName: certificate.patient_name,
      dashboardUrl,
    })

    // Send email via outbox (tracked, auditable)
    log.info("Retrying email send via outbox", {
      certificateId,
      patientEmail: patient.email,
      retryCount: certificate.email_retry_count + 1,
    })

    const emailResult = await sendEmail({
      to: patient.email,
      toName: certificate.patient_name,
      subject: "Your Medical Certificate is Ready - InstantMed",
      template: emailTemplate,
      emailType: "med_cert_patient",
      intakeId: certificate.intake_id,
      patientId: certificate.patient_id,
      certificateId,
      metadata: {
        retry: true,
        retry_count: certificate.email_retry_count + 1,
        triggered_by: adminProfile.id,
      },
    })

    if (emailResult.success) {
      await updateEmailStatus(certificateId, "sent", {
        deliveryId: emailResult.outboxId || emailResult.messageId,
      })
      await logCertificateEvent(certificateId, "email_sent", adminProfile.id, "admin", {
        retry: true,
        retry_count: certificate.email_retry_count + 1,
        outbox_id: emailResult.outboxId,
      })

      log.info("Email retry successful via outbox", { certificateId, outboxId: emailResult.outboxId })

      revalidatePath("/admin/email-queue")
      revalidatePath("/doctor/admin/email-outbox")
      return { success: true }
    } else {
      await updateEmailStatus(certificateId, "failed", {
        failureReason: emailResult.error,
      })
      await logCertificateEvent(certificateId, "email_failed", adminProfile.id, "admin", {
        retry: true,
        retry_count: certificate.email_retry_count + 1,
        error: emailResult.error,
      })

      log.error("Email retry failed", {
        certificateId,
        error: emailResult.error,
      })

      return { success: false, error: emailResult.error }
    }
  } catch (error) {
    log.error("Email retry error", {}, error instanceof Error ? error : undefined)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Retry failed",
    }
  }
}

/**
 * Get recent email attempts from email_outbox for debugging
 */
export async function getRecentEmailAttempts(limit: number = 20) {
  try {
    await requireAdminRole()

    const supabase = createServiceRoleClient()
    const { data, error } = await supabase
      .from("email_outbox")
      .select("id, email_type, to_email, subject, status, error_message, intake_id, created_at, sent_at")
      .order("created_at", { ascending: false })
      .limit(limit)

    if (error) {
      log.error("Failed to get email outbox", {}, error)
      return { success: false, error: error.message, emails: [] }
    }

    return {
      success: true,
      emails: (data || []).map((e) => ({
        id: e.id,
        emailType: e.email_type,
        toEmail: e.to_email,
        subject: e.subject,
        status: e.status,
        errorMessage: e.error_message,
        intakeId: e.intake_id,
        createdAt: e.created_at,
        sentAt: e.sent_at,
      })),
    }
  } catch (error) {
    log.error("Failed to get recent emails", {}, error instanceof Error ? error : undefined)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load",
      emails: [],
    }
  }
}

/**
 * Retry sending an email from email_outbox (for dispatcher/admin use).
 * Uses atomic claim to prevent duplicate sends if cron is running simultaneously.
 * 
 * CONCURRENCY SAFETY:
 * - Uses claimOutboxRow() to atomically claim before sending
 * - If cron already claimed this row, admin resend will fail gracefully
 */
export async function retryOutboxEmail(
  outboxId: string,
  sendImmediately: boolean = true
): Promise<RetryResult> {
  try {
    await requireAdminRole()

    const supabase = createServiceRoleClient()

    // Fetch the outbox row to validate before claiming
    const { data: row, error: fetchError } = await supabase
      .from("email_outbox")
      .select("*")
      .eq("id", outboxId)
      .single()

    if (fetchError || !row) {
      return { success: false, error: "Email not found in outbox" }
    }

    // Must be in failed or pending status to retry
    if (!["failed", "pending"].includes(row.status)) {
      return { success: false, error: `Cannot retry email with status '${row.status}'` }
    }

    // Check max retries
    if (row.retry_count >= 10) {
      return { success: false, error: "Maximum retry attempts reached (10)" }
    }

    // Validate med_cert_patient has certificate_id
    if (row.email_type === "med_cert_patient" && !row.certificate_id) {
      return { success: false, error: "Cannot retry: missing certificate_id for reconstruction" }
    }

    if (sendImmediately) {
      // CONCURRENCY SAFETY: Atomically claim the row before sending
      // This prevents duplicate sends if cron is running at the same time
      const claim = await claimOutboxRow(outboxId)
      if (!claim.claimed) {
        return { success: false, error: "Email is already being processed by another job" }
      }

      log.info("Admin triggering immediate email retry", { outboxId, retryCount: row.retry_count })
      
      const result = await sendFromOutboxRow(claim.row as OutboxRow)
      
      revalidatePath("/doctor/admin/email-outbox")
      revalidatePath("/admin/ops/email-outbox")
      
      if (result.success) {
        return { success: true }
      } else {
        return { success: false, error: result.error || "Send failed" }
      }
    } else {
      // Just reset to pending for the dispatcher to pick up
      const { error: updateError } = await supabase
        .from("email_outbox")
        .update({
          status: "pending",
          last_attempt_at: new Date().toISOString(),
          error_message: null,
        })
        .eq("id", outboxId)

      if (updateError) {
        return { success: false, error: updateError.message }
      }

      log.info("Email reset to pending for dispatcher", { outboxId })
      
      revalidatePath("/doctor/admin/email-outbox")
      revalidatePath("/admin/ops/email-outbox")
      
      return { success: true }
    }
  } catch (error) {
    log.error("Retry outbox email error", {}, error instanceof Error ? error : undefined)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Retry failed",
    }
  }
}

/**
 * Mark email as manually resolved (e.g., sent via alternative method)
 */
export async function markEmailResolved(
  certificateId: string,
  resolution: string
): Promise<RetryResult> {
  try {
    const adminProfile = await requireAdminRole()

    const certificate = await getCertificateById(certificateId)
    if (!certificate) {
      return { success: false, error: "Certificate not found" }
    }

    // Update status to indicate manual resolution
    const supabase = createServiceRoleClient()
    const { error } = await supabase
      .from("issued_certificates")
      .update({
        email_sent_at: new Date().toISOString(),
        email_delivery_id: `manual:${adminProfile.id}`,
        email_failed_at: null,
        email_failure_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", certificateId)

    if (error) {
      return { success: false, error: error.message }
    }

    await logCertificateEvent(certificateId, "email_sent", adminProfile.id, "admin", {
      manual_resolution: true,
      resolution_note: resolution,
    })

    log.info("Email marked as resolved", { certificateId, adminId: adminProfile.id, resolution })

    revalidatePath("/admin/email-queue")
    return { success: true }
  } catch (error) {
    log.error("Mark resolved error", {}, error instanceof Error ? error : undefined)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to mark resolved",
    }
  }
}
