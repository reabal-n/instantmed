"use server"

import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { sendRequestDeclinedEmailNew } from "@/lib/email/senders"
import { createLogger } from "@/lib/observability/logger"
import { getPostHogClient } from "@/lib/posthog-server"
const logger = createLogger("notifications-service")

type NotificationType = "request_update" | "payment" | "document_ready" | "refill_reminder" | "system" | "promotion"

interface CreateNotificationParams {
  userId: string
  type: NotificationType
  title: string
  message: string
  actionUrl?: string
  metadata?: Record<string, unknown>
}

interface NotifyRequestStatusParams {
  intakeId: string
  patientId: string
  patientEmail: string
  patientName: string
  requestType: string
  newStatus: string
  documentUrl?: string
  declineReason?: string
}

/**
 * Create an in-app notification for a user
 */
export async function createNotification(params: CreateNotificationParams): Promise<{ success: boolean; error?: string }> {
  const { userId, type, title, message, actionUrl, metadata = {} } = params

  try {
    const supabase = createServiceRoleClient()

    const { error } = await supabase.from("notifications").insert({
      user_id: userId,
      type,
      title,
      message,
      action_url: actionUrl,
      metadata,
    })

    if (error) {
      logger.error("Failed to create notification", { userId, type }, new Error(error.message))
      return { success: false, error: error.message }
    }

    logger.info("Notification created", { userId, type, title })
    return { success: true }
  } catch (err) {
    logger.error("Notification creation error", {}, err instanceof Error ? err : new Error(String(err)))
    return { success: false, error: "Failed to create notification" }
  }
}

/**
 * Send notifications (email + in-app) when a request status changes
 */
export async function notifyRequestStatusChange(params: NotifyRequestStatusParams): Promise<void> {
  const {
    intakeId,
    patientId,
    patientEmail,
    patientName,
    requestType,
    newStatus,
    declineReason,
  } = params

  const actionUrl = `/patient/intakes/${intakeId}`

  try {
    switch (newStatus) {
      case "approved": {
        // In-app notification
        await createNotification({
          userId: patientId,
          type: "document_ready",
          title: "Your request has been approved",
          message: "A doctor has approved your request. Your document is ready to download.",
          actionUrl,
          metadata: { intakeId, requestType, status: newStatus },
        })

        // NOTE: Approval emails are sent by each canonical approval action directly:
        // - Med certs: approveAndSendCert() in app/actions/approve-cert.ts
        // - Consults: approveConsult() in app/actions/approve-consult.ts
        // - Scripts: repeat-prescription action
        // No duplicate email is sent here — only the in-app notification.

        // Track approval in PostHog
        try {
          const posthog = getPostHogClient()
          posthog.capture({
            distinctId: patientId,
            event: 'request_approved',
            properties: { request_type: requestType, intake_id: intakeId },
          })
        } catch { /* non-blocking */ }
        break
      }

      case "declined": {
        // In-app notification
        await createNotification({
          userId: patientId,
          type: "request_update",
          title: "Update on your request",
          message: "A doctor has reviewed your request. Please check the details for more information.",
          actionUrl,
          metadata: { intakeId, requestType, status: newStatus, reason: declineReason },
        })

        // Email notification via canonical sendEmail system
        await sendRequestDeclinedEmailNew({
          to: patientEmail,
          patientName,
          patientId,
          intakeId,
          requestType,
          reason: declineReason,
        })
        logger.info("Decline email sent", { intakeId, patientEmail })

        // Track email sent in PostHog
        try {
          const posthog = getPostHogClient()
          posthog.capture({
            distinctId: patientId,
            event: 'email_sent',
            properties: { template: 'decline', intake_id: intakeId },
          })
        } catch { /* non-blocking */ }
        break
      }

      case "needs_follow_up": {
        // In-app notification only (email handled separately with specific questions)
        await createNotification({
          userId: patientId,
          type: "request_update",
          title: "Doctor needs more information",
          message: "The doctor reviewing your request needs some additional information from you.",
          actionUrl,
          metadata: { intakeId, requestType, status: newStatus },
        })
        break
      }

      default:
        logger.debug("No notification for status", { newStatus, intakeId })
    }
  } catch (err) {
    logger.error("Failed to send status notifications", {
      error: err instanceof Error ? err.message : "Unknown",
      intakeId,
      newStatus,
    })
  }
}

/**
 * Send payment confirmation notification
 */
export async function notifyPaymentReceived(params: {
  intakeId: string
  patientId: string
  patientEmail: string
  patientName: string
  amount: number
}): Promise<void> {
  const { intakeId, patientId, amount } = params

  try {
    await createNotification({
      userId: patientId,
      type: "payment",
      title: "Payment received",
      message: `Your payment of $${(amount / 100).toFixed(2)} has been confirmed. A doctor will review your request shortly.`,
      actionUrl: `/patient/intakes/${intakeId}`,
      metadata: { intakeId, amount },
    })

    logger.info("Payment notification created", { intakeId, patientId })
  } catch (err) {
    logger.error("Failed to create payment notification", {
      error: err instanceof Error ? err.message : "Unknown",
      intakeId,
    })
  }
}
