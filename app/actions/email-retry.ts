"use server"

import { requireRole } from "@/lib/auth/helpers"
import { revalidateStaff } from "@/lib/dashboard/revalidate-staff"
import {
  getCertificateById,
  getCertificateForIntake,
  logCertificateEvent,
} from "@/lib/data/issued-certificates"
import { isQuietCronOwnedEmailFailure } from "@/lib/email/quiet-failures"
import { claimOutboxRow } from "@/lib/email/send/outbox"
import { type OutboxRow, sendFromOutboxRow } from "@/lib/email/send-email"
import { createLogger } from "@/lib/observability/logger"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

import { resendCertificateAsStaff } from "./resend-certificate"

const log = createLogger("email-retry")

interface RetryResult {
  success: boolean
  error?: string
  queued?: boolean
}

async function requireAdminRole() {
  const { profile } = await requireRole(["admin"])
  return profile
}

/**
 * Retry sending email for a specific certificate
 */
export async function retryEmail(certificateId: string): Promise<RetryResult> {
  try {
    await requireAdminRole()

    const certificate = await getCertificateById(certificateId)
    if (!certificate || certificate.status !== "valid") {
      return { success: false, error: "Current valid certificate not found" }
    }

    const currentCertificate = await getCertificateForIntake(certificate.intake_id)
    if (!currentCertificate || currentCertificate.id !== certificate.id) {
      return { success: false, error: "This certificate is no longer current" }
    }

    // Keep the legacy admin entry point, but route it through the same atomic
    // reservation, cap, provider-idempotency, and queued-delivery path as every
    // other staff resend.
    return resendCertificateAsStaff(certificate.intake_id)
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
      .select("id, email_type, status, retry_count, certificate_id, error_message")
      .eq("id", outboxId)
      .single()

    if (fetchError || !row) {
      return { success: false, error: "Email not found in outbox" }
    }

    if (isQuietCronOwnedEmailFailure(row)) {
      return {
        success: false,
        error: "This email is owned by its recovery cron and is not retryable from the delivery ledger",
      }
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
      
      revalidateStaff({ emails: true })

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

      revalidateStaff({ emails: true })

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

    revalidateStaff({ emails: true })
    return { success: true }
  } catch (error) {
    log.error("Mark resolved error", {}, error instanceof Error ? error : undefined)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to mark resolved",
    }
  }
}
