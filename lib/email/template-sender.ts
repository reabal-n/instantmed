/**
 * Email Template Sender
 * Sends emails using database-stored templates with merge tag support
 */

import "server-only"
import { createClient } from "@supabase/supabase-js"
import { sendViaResend, sendCriticalEmail } from "./resend"
import { createLogger } from "../observability/logger"
import { env } from "../env"

const log = createLogger("template-sender")

function getServiceClient() {
  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey)
}

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
  const supabase = getServiceClient()

  const { data, error } = await supabase
    .from("email_templates")
    .select("*")
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
    const tag = new RegExp(`\\{\\{${key}\\}\\}`, "g")
    result = result.replace(tag, value || "")
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
}): Promise<void> {
  const supabase = getServiceClient()

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
      metadata: {
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
  const { to, templateSlug, data, intakeId, patientId, isCritical = false, attachments } = params

  // Fetch template
  const template = await getTemplate(templateSlug)
  if (!template) {
    log.error("Email template not found or inactive", { templateSlug })
    return { success: false, error: `Template not found: ${templateSlug}` }
  }

  // Validate merge tags (warn but don't fail)
  const missingTags = validateMergeTags(template, data)
  if (missingTags.length > 0) {
    log.warn("Missing merge tags for email", { templateSlug, missingTags })
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
    result = await sendCriticalEmail(emailParams, {
      emailType: templateSlug,
      intakeId,
      patientId,
    })
  } else {
    result = await sendViaResend(emailParams)
  }

  // Log the send attempt
  await logEmailSend({
    templateSlug,
    recipient: to,
    intakeId,
    patientId,
    subject,
    success: result.success,
    resendId: result.id,
    error: result.error,
  })

  if (result.success) {
    log.info("Template email sent", { templateSlug, to, resendId: result.id })
  } else {
    log.error("Template email failed", { templateSlug, to, error: result.error })
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

/**
 * Send refund processed notification
 */
export async function sendRefundEmail(params: {
  to: string
  patientName: string
  amount: string
  refundReason: string
  intakeId?: string
  patientId?: string
}): Promise<SendResult> {
  return sendTemplateEmail({
    to: params.to,
    templateSlug: "refund_processed",
    data: {
      patient_name: params.patientName,
      amount: params.amount,
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
    templateSlug: "payment_received",
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
 * Send payment failed notification to patient
 */
export async function sendPaymentFailedEmail(params: {
  to: string
  patientName: string
  serviceName: string
  failureReason: string
  retryUrl: string
  intakeId?: string
  patientId?: string
}): Promise<SendResult> {
  return sendTemplateEmail({
    to: params.to,
    templateSlug: "payment_failed",
    data: {
      patient_name: params.patientName,
      service_name: params.serviceName,
      failure_reason: params.failureReason,
      retry_url: params.retryUrl,
    },
    intakeId: params.intakeId,
    patientId: params.patientId,
  })
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
  const adminEmail = process.env.ADMIN_EMAILS?.split(",")[0] || "support@instantmed.com.au"
  
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
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au"
  const completeAccountUrl = `${appUrl}/auth/complete-account?intake_id=${params.intakeId}`
  
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
