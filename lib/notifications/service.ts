"use server"

import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { sendMedCertReadyEmail, sendRequestDeclinedEmail } from "@/lib/email/resend"
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
  requestId: string
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
    requestId,
    patientId,
    patientEmail,
    patientName,
    requestType,
    newStatus,
    documentUrl,
    declineReason,
  } = params

  const actionUrl = `/patient/intakes/${requestId}`

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
          metadata: { requestId, requestType, status: newStatus },
        })

        // IMPORTANT: For med_certs, email is sent by approveAndSendCert() directly via sendViaResend.
        // Skip email here to prevent duplicate sends. Only create in-app notification for med certs.
        const isMedCert = requestType === "med_certs" || requestType.includes("med_cert")
        
        // Email notification - SKIP for med_certs (handled by canonical approveAndSendCert)
        if (documentUrl && !isMedCert) {
          await sendMedCertReadyEmail({
            to: patientEmail,
            patientName,
            pdfUrl: documentUrl,
            requestId,
            certType: requestType.includes("uni") ? "uni" : requestType.includes("carer") ? "carer" : "work",
          })
          logger.info("Approval email sent", { requestId, patientEmail })
          
          // Track email sent in PostHog
          try {
            const posthog = getPostHogClient()
            posthog.capture({
              distinctId: patientId,
              event: 'email_sent',
              properties: { template: 'approval', request_id: requestId },
            })
          } catch { /* non-blocking */ }
        }
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
          metadata: { requestId, requestType, status: newStatus, reason: declineReason },
        })

        // Email notification
        await sendRequestDeclinedEmail(patientEmail, patientName, requestType, requestId, declineReason)
        logger.info("Decline email sent", { requestId, patientEmail })
        
        // Track email sent in PostHog
        try {
          const posthog = getPostHogClient()
          posthog.capture({
            distinctId: patientId,
            event: 'email_sent',
            properties: { template: 'decline', request_id: requestId },
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
          metadata: { requestId, requestType, status: newStatus },
        })
        break
      }

      default:
        logger.debug("No notification for status", { newStatus, requestId })
    }
  } catch (err) {
    logger.error("Failed to send status notifications", {
      error: err instanceof Error ? err.message : "Unknown",
      requestId,
      newStatus,
    })
  }
}

/**
 * Send payment confirmation notification
 */
export async function notifyPaymentReceived(params: {
  requestId: string
  patientId: string
  patientEmail: string
  patientName: string
  amount: number
}): Promise<void> {
  const { requestId, patientId, amount } = params

  try {
    await createNotification({
      userId: patientId,
      type: "payment",
      title: "Payment received ✓",
      message: `Your payment of $${(amount / 100).toFixed(2)} has been confirmed. A doctor will review your request shortly.`,
      actionUrl: `/patient/intakes/${requestId}`,
      metadata: { requestId, amount },
    })

    logger.info("Payment notification created", { requestId, patientId })
  } catch (err) {
    logger.error("Failed to create payment notification", {
      error: err instanceof Error ? err.message : "Unknown",
      requestId,
    })
  }
}
