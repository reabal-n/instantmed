/**
 * Email Template Sender
 * Sends emails using database-stored templates with merge tag support
 */

import "server-only"

import * as React from "react"

import { env } from "@/lib/config/env"
import { CONTACT_EMAIL } from "@/lib/constants"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

import { createLogger } from "../observability/logger"
import {
  PaymentFailedEmail,
  paymentFailedSubject,
} from "./components/templates/payment-failed"
import { sendCriticalEmail,sendViaResend } from "./resend"
import { sanitizeEmailForLog } from "./send/helpers"
import {
  createPendingOutbox,
  updateOutboxStatus,
} from "./send/outbox"
import type { EmailType } from "./send/types"
import { sendEmail } from "./send-email"

const log = createLogger("template-sender")

// ============================================================================
// TYPES
// ============================================================================

interface TemplateEmail {
  id: string
  slug: string
  name: string
  subject: string
  body_html: string
  body_text: string | null
  available_tags: string[]
  is_active: boolean
}

interface SendTemplateEmailParams {
  to: string
  templateSlug: string
  data: Record<string, string>
  intakeId?: string
  patientId?: string
  isCritical?: boolean
  idempotencyKey?: string
  metadata?: Record<string, unknown>
  attachments?: {
    filename: string
    content: string
    type?: string
  }[]
}

interface SendResult {
  success: boolean
  emailId?: string
  error?: string
}

// ============================================================================
// TEMPLATE FETCHING
// ============================================================================

/**
 * Get an active email template by slug
 */
async function getTemplate(slug: string): Promise<TemplateEmail | null> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from("email_templates")
    .select("id, slug, name, subject, body_html, body_text, available_tags, is_active")
    .eq("slug", slug)
    .eq("is_active", true)
    .single()

  if (error) {
    log.error("Failed to fetch email template", { slug }, error)
    return null
  }

  return data as TemplateEmail
}

// ============================================================================
// MERGE TAG REPLACEMENT
// ============================================================================

/**
 * Replace merge tags in a string with provided data
 */
function replaceMergeTags(content: string, data: Record<string, string>): string {
  let result = content
  for (const [key, value] of Object.entries(data)) {
    result = result.replaceAll(`{{${key}}}`, value || "")
  }
  return result
}

/**
 * Validate that all required merge tags have values
 */
function validateMergeTags(template: TemplateEmail, data: Record<string, string>): string[] {
  const missing: string[] = []
  for (const tag of template.available_tags) {
    if (!(tag in data) || data[tag] === undefined) {
      missing.push(tag)
    }
  }
  return missing
}

// ============================================================================
// EMAIL LOGGING
// ============================================================================

/**
 * Log email send attempt to database
 */
async function logEmailSend(params: {
  templateSlug: string
  recipient: string
  intakeId?: string
  patientId?: string
  subject: string
  success: boolean
  resendId?: string
  error?: string
  idempotencyKey?: string
  metadata?: Record<string, unknown>
}): Promise<void> {
  const supabase = createServiceRoleClient()

  try {
    await supabase.from("email_outbox").insert({
      email_type: params.templateSlug,
      to_email: params.recipient,
      intake_id: params.intakeId,
      patient_id: params.patientId,
      subject: params.subject,
      status: params.success ? 'sent' : 'failed',
      provider_message_id: params.resendId,
      sent_at: params.success ? new Date().toISOString() : null,
      error_message: params.error,
      idempotency_key: params.idempotencyKey,
      metadata: {
        ...(params.metadata ?? {}),
        sent: params.success,
      },
    })
  } catch (error) {
    log.warn("Failed to log email send", { templateSlug: params.templateSlug }, error)
  }
}

// ============================================================================
// MAIN SEND FUNCTION
// ============================================================================

/**
 * Send an email using a database template
 */
export async function sendTemplateEmail(params: SendTemplateEmailParams): Promise<SendResult> {
  const {
    to,
    templateSlug,
    data,
    intakeId,
    patientId,
    isCritical = false,
    attachments,
    idempotencyKey,
    metadata,
  } = params

  // Fetch template
  const template = await getTemplate(templateSlug)
  if (!template) {
    log.error("Email template not found or inactive", { templateSlug })
    return { success: false, error: `Template not found: ${templateSlug}` }
  }

  // Validate merge tags - warn and capture in Sentry for visibility
  const missingTags = validateMergeTags(template, data)
  if (missingTags.length > 0) {
    log.warn("Missing merge tags for email", { templateSlug, missingTags })
    try {
      const Sentry = await import("@sentry/nextjs")
      Sentry.captureMessage(`Missing merge tags in email template: ${templateSlug}`, {
        level: "warning",
        extra: { templateSlug, missingTags },
      })
    } catch {
      // Sentry not available - warning already logged
    }
  }

  // Replace merge tags
  const subject = replaceMergeTags(template.subject, data)
  const html = replaceMergeTags(template.body_html, data)

  // Send email
  const emailParams = {
    to,
    subject,
    html,
    tags: [
      { name: "template", value: templateSlug },
      ...(intakeId ? [{ name: "intake_id", value: intakeId }] : []),
    ],
    attachments,
  }

  let result
  if (isCritical) {
    // sendCriticalEmail already manages its own outbox record.
    result = await sendCriticalEmail(emailParams, {
      emailType: templateSlug,
      intakeId,
      patientId,
    })
    await logEmailSend({
      templateSlug,
      recipient: to,
      intakeId,
      patientId,
      subject,
      success: result.success,
      resendId: result.id,
      error: result.error,
      idempotencyKey,
      metadata,
    })
  } else {
    // TWO-PHASE WRITE: insert a pending outbox row BEFORE attempting the send.
    // If the process crashes between sendViaResend() and the status update, the
    // dispatcher can retry the pending row. Mirrors the pattern in send-email.ts.
    const supabase = createServiceRoleClient()
    let outboxId: string | null = null
    try {
      if (idempotencyKey) {
        const pending = await createPendingOutbox({
          email_type: templateSlug as EmailType,
          to_email: to,
          subject,
          provider: "resend",
          intake_id: intakeId,
          patient_id: patientId,
          metadata: metadata ?? {},
          idempotency_key: idempotencyKey,
          initialStatus: "sending",
        })

        if (pending.duplicate) {
          log.info("Template email suppressed by idempotency guard", {
            templateSlug,
            intakeId,
            outboxId: pending.id,
          })
          return {
            success: true,
            emailId: pending.id ? `duplicate-outbox-${pending.id}` : undefined,
          }
        }

        outboxId = pending.id
      } else {
        const { data: pendingRow } = await supabase
          .from("email_outbox")
          .insert({
            email_type: templateSlug,
            to_email: to,
            intake_id: intakeId ?? null,
            patient_id: patientId ?? null,
            subject,
            status: "sending",
            metadata: metadata ?? {},
          })
          .select("id")
          .single()
        outboxId = pendingRow?.id ?? null
      }
    } catch {
      // Non-blocking — proceed even if pre-send record fails
    }

    result = await sendViaResend(emailParams)

    // Update the pending row with the final status.
    if (outboxId) {
      try {
        if (idempotencyKey) {
          await updateOutboxStatus(outboxId, result.success ? "sent" : "failed", {
            provider_message_id: result.id ?? undefined,
            error_message: result.error ?? undefined,
            attempts: 1,
          })
        } else {
          await supabase
            .from("email_outbox")
            .update({
              status: result.success ? "sent" : "failed",
              provider_message_id: result.id ?? null,
              sent_at: result.success ? new Date().toISOString() : null,
              error_message: result.error ?? null,
              metadata: { ...(metadata ?? {}), sent: result.success },
            })
            .eq("id", outboxId)
        }
      } catch {
        // Non-blocking — the pending row is enough for the dispatcher to retry
      }
    } else {
      // Fallback: pre-send insert failed; write a post-send record so the row exists.
      await logEmailSend({
        templateSlug,
        recipient: to,
        intakeId,
        patientId,
        subject,
        success: result.success,
        resendId: result.id,
        error: result.error,
        idempotencyKey,
        metadata,
      })
    }
  }

  if (result.success) {
    log.info("Template email sent", { templateSlug, to: sanitizeEmailForLog(to), resendId: result.id })
  } else {
    log.error("Template email failed", { templateSlug, to: sanitizeEmailForLog(to), error: result.error })
  }

  return {
    success: result.success,
    emailId: result.id,
    error: result.error,
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS FOR COMMON EMAILS
// ============================================================================

function buildPaymentFailedEmailIdempotencyKey(input: {
  checkoutSessionId?: string
  intakeId?: string
}): string | undefined {
  if (!input.intakeId || !input.checkoutSessionId) return undefined
  return `email:payment_failed:${input.intakeId}:${input.checkoutSessionId}`
}

/**
 * Send refund processed notification
 */
export async function sendRefundEmail(params: {
  to: string
  patientName: string
  amount: string
  refundReason: string
  serviceName?: string
  intakeId?: string
  patientId?: string
}): Promise<SendResult> {
  return sendTemplateEmail({
    to: params.to,
    templateSlug: "refund-processed",
    data: {
      patient_name: params.patientName,
      amount: params.amount,
      service_name: params.serviceName || "your request",
      refund_reason: params.refundReason,
    },
    intakeId: params.intakeId,
    patientId: params.patientId,
    isCritical: true,
  })
}

/**
 * Send payment received confirmation
 */
export async function sendPaymentReceivedEmail(params: {
  to: string
  patientName: string
  amount: string
  serviceName: string
  intakeId: string
  patientId?: string
}): Promise<SendResult> {
  return sendTemplateEmail({
    to: params.to,
    templateSlug: "payment-received",
    data: {
      patient_name: params.patientName,
      amount: params.amount,
      service_name: params.serviceName,
    },
    intakeId: params.intakeId,
    patientId: params.patientId,
  })
}

/**
 * Send payment failed notification to patient.
 *
 * Renders the React PaymentFailedEmail via the standard send pipeline. This
 * previously pointed at an email_templates DB slug ("payment_failed") that was
 * never seeded, so every send failed with "Template not found" and patients
 * whose payment failed were never notified (found in the 2026-07-06 email audit).
 */
export async function sendPaymentFailedEmail(params: {
  to: string
  patientName: string
  serviceName: string
  failureReason: string
  retryUrl: string
  intakeId?: string
  patientId?: string
  checkoutSessionId?: string
}): Promise<SendResult> {
  const result = await sendEmail({
    to: params.to,
    toName: params.patientName,
    subject: paymentFailedSubject(),
    template: React.createElement(PaymentFailedEmail, {
      patientName: params.patientName,
      serviceName: params.serviceName,
      failureReason: params.failureReason,
      retryUrl: params.retryUrl,
    }),
    emailType: "payment_failed",
    intakeId: params.intakeId,
    patientId: params.patientId,
    idempotencyKey: buildPaymentFailedEmailIdempotencyKey({
      checkoutSessionId: params.checkoutSessionId,
      intakeId: params.intakeId,
    }),
    metadata: params.checkoutSessionId
      ? { checkout_session_id: params.checkoutSessionId }
      : undefined,
  })

  return { success: result.success, emailId: result.outboxId, error: result.error }
}

/**
 * Send dispute alert to admin team
 */
export async function sendDisputeAlertEmail(params: {
  disputeId: string
  chargeId: string
  intakeId?: string
  amount: string
  currency: string
  reason: string
  evidenceDueBy?: string
}): Promise<SendResult> {
  const adminEmail = process.env.ADMIN_EMAILS?.split(",")[0] || CONTACT_EMAIL
  
  return sendTemplateEmail({
    to: adminEmail,
    templateSlug: "dispute_alert",
    data: {
      dispute_id: params.disputeId,
      charge_id: params.chargeId,
      intake_id: params.intakeId || "Unknown",
      amount: `${params.currency} ${params.amount}`,
      reason: params.reason,
      evidence_due_by: params.evidenceDueBy || "Check Stripe Dashboard",
      stripe_dashboard_url: `https://dashboard.stripe.com/disputes/${params.disputeId}`,
    },
    isCritical: true,
  })
}

/**
 * Send checkout session expired notification to patient
 * Sent when a Stripe checkout session expires before payment completes
 */
export async function sendSessionExpiredEmail(params: {
  to: string
  patientName: string
  serviceName: string
  resumeUrl: string
  intakeId?: string
  patientId?: string
}): Promise<SendResult> {
  return sendTemplateEmail({
    to: params.to,
    templateSlug: "session_expired",
    data: {
      patient_name: params.patientName,
      service_name: params.serviceName,
      resume_url: params.resumeUrl,
    },
    intakeId: params.intakeId,
    patientId: params.patientId,
  })
}

/**
 * Send guest account completion reminder
 * Sent after successful guest checkout to encourage account creation
 */
export async function sendGuestCompleteAccountEmail(params: {
  to: string
  patientName: string
  serviceName: string
  intakeId: string
  patientId?: string
}): Promise<SendResult> {
  const completeAccountUrl = `${env.appUrl}/auth/complete-account?intake_id=${params.intakeId}`
  
  return sendTemplateEmail({
    to: params.to,
    templateSlug: "guest_complete_account",
    data: {
      patient_name: params.patientName,
      service_name: params.serviceName,
      intake_id: params.intakeId,
      complete_account_url: completeAccountUrl,
    },
    intakeId: params.intakeId,
    patientId: params.patientId,
  })
}
