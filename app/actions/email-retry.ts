"use server"

import { revalidatePath } from "next/cache"
import { requireRole } from "@/lib/auth"
import { sendViaResend } from "@/lib/email/resend"
import { renderMedCertEmailToHtml } from "@/components/email/med-cert-email"
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

    // Generate email HTML
    const dashboardUrl = `${env.appUrl}/patient/intakes/${certificate.intake_id}`
    const emailHtml = renderMedCertEmailToHtml({
      patientName: certificate.patient_name,
      dashboardUrl,
    })

    // Send email
    log.info("Retrying email send", {
      certificateId,
      patientEmail: patient.email,
      retryCount: certificate.email_retry_count + 1,
    })

    const emailResult = await sendViaResend({
      to: patient.email,
      subject: "Your Medical Certificate is Ready - InstantMed",
      html: emailHtml,
      tags: [
        { name: "category", value: "med_cert_retry" },
        { name: "certificate_id", value: certificateId },
        { name: "retry_count", value: String(certificate.email_retry_count + 1) },
      ],
    })

    if (emailResult.success) {
      await updateEmailStatus(certificateId, "sent", {
        deliveryId: emailResult.id,
      })
      await logCertificateEvent(certificateId, "email_sent", adminProfile.id, "admin", {
        retry: true,
        retry_count: certificate.email_retry_count + 1,
        resend_id: emailResult.id,
      })

      log.info("Email retry successful", { certificateId, resendId: emailResult.id })

      revalidatePath("/admin/email-queue")
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
