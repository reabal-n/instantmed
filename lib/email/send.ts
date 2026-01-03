import "server-only"
import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { createClient } from "@supabase/supabase-js"
import { RequestReceivedEmail } from "./templates/request-received"
import { PaymentConfirmedEmail } from "./templates/payment-confirmed"
import { RequestApprovedEmail } from "./templates/request-approved"
import { NeedsMoreInfoEmail } from "./templates/needs-more-info"
import { RequestDeclinedEmail } from "./templates/request-declined"
import { sendViaResend } from "./resend"
import { logger } from "../logger"

function getServiceClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error("Missing Supabase credentials")
  return createClient(url, key)
}

export type EmailTemplate =
  | "request_received"
  | "payment_confirmed"
  | "request_approved"
  | "needs_more_info"
  | "request_declined"

interface SendEmailParams {
  to: string
  template: EmailTemplate
  data: Record<string, unknown>
  requestId?: string
}

/**
 * Render email template to HTML string
 */
function renderTemplate(template: EmailTemplate, data: Record<string, unknown>): { html: string; subject: string } {
  let element: React.ReactElement
  let subject: string

  switch (template) {
    case "request_received":
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      element = React.createElement(RequestReceivedEmail, data as any)
      subject = `Your ${data.requestType} request has been received`
      break
    case "payment_confirmed":
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      element = React.createElement(PaymentConfirmedEmail, data as any)
      subject = `Payment confirmed for your ${data.requestType}`
      break
    case "request_approved":
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      element = React.createElement(RequestApprovedEmail, data as any)
      subject = `Good news! Your ${data.requestType} has been approved`
      break
    case "needs_more_info":
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      element = React.createElement(NeedsMoreInfoEmail, data as any)
      subject = `Action needed: Additional information required`
      break
    case "request_declined":
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      element = React.createElement(RequestDeclinedEmail, data as any)
      subject = `Update on your ${data.requestType} request`
      break
    default:
      throw new Error(`Unknown template: ${template}`)
  }

  const html = renderToStaticMarkup(element)
  return { html: `<!DOCTYPE html>${html}`, subject }
}

/**
 * Send an email via Resend and log to database
 */
export async function sendEmail(params: SendEmailParams): Promise<{ success: boolean; error?: string }> {
  const { to, template, data, requestId } = params

  try {
    const { html, subject } = renderTemplate(template, data)

    // Log to database first
    const supabase = getServiceClient()
    const { data: logEntry } = await supabase.from("email_logs").insert({
      request_id: requestId,
      recipient_email: to,
      template_type: template,
      subject,
      metadata: { data },
    }).select().single()

    // Send via Resend
    const result = await sendViaResend({
      to,
      subject,
      html,
      tags: [
        { name: "template", value: template },
        ...(requestId ? [{ name: "request_id", value: requestId }] : []),
      ],
    })

    // Update log with send status
    if (logEntry) {
      await supabase.from("email_logs").update({
        metadata: { 
          ...data, 
          resend_id: result.id,
          sent: result.success,
          error: result.error,
        },
      }).eq("id", logEntry.id)
    }

    if (!result.success) {
      logger.warn(`[Email] Failed to send to ${to}: ${result.error}`, { subject, template })
      return { success: false, error: result.error }
    }

    logger.info(`[Email] Sent to ${to}`, { subject, template, resendId: result.id })
    return { success: true }
  } catch (error) {
    logger.error("Error sending email: " + String(error), { error })
    return { success: false, error: String(error) }
  }
}

/**
 * Send email triggered by state transition
 */
export async function sendStateTransitionEmail(
  requestId: string,
  templateType: string,
  additionalData?: Record<string, unknown>,
): Promise<void> {
  const supabase = getServiceClient()

  // Fetch request and patient details
  const { data: request } = await supabase
    .from("requests")
    .select(`
      *,
      patient:profiles!patient_id (*)
    `)
    .eq("id", requestId)
    .single()

  if (!request || !request.patient) {
    logger.error("Could not fetch request details for email")
    return
  }

  // Get patient email from auth
  const { data: authUser } = await supabase.auth.admin.getUserById(request.patient.auth_user_id)
  const email = authUser?.user?.email

  if (!email) {
    logger.error("Could not find patient email")
    return
  }

  const baseData = {
    patientName: request.patient.full_name || "there",
    requestType: formatRequestType(request.category, request.subtype),
    requestId: request.id,
    ...additionalData,
  }

  await sendEmail({
    to: email,
    template: templateType as EmailTemplate,
    data: baseData,
    requestId,
  })
}

function formatRequestType(category: string | null, subtype: string | null): string {
  if (category === "medical_certificate") {
    return "medical certificate"
  }
  if (category === "prescription") {
    return "prescription"
  }
  if (category === "consult") {
    return "general consultation"
  }
  if (category === "referral") {
    if (subtype === "imaging") return "imaging referral"
    if (subtype === "pathology") return "pathology referral"
    return "referral"
  }
  return "request"
}
