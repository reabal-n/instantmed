import "server-only"
import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { createClient } from "@supabase/supabase-js"
import { RequestReceivedEmail } from "./templates/request-received"
import { PaymentConfirmedEmail } from "./templates/payment-confirmed"
import { RequestApprovedEmail } from "./templates/request-approved"
import { NeedsMoreInfoEmail } from "./templates/needs-more-info"
import { RequestDeclinedEmail } from "./templates/request-declined"

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
      element = React.createElement(RequestReceivedEmail, data as any)
      subject = `Your ${data.requestType} request has been received`
      break
    case "payment_confirmed":
      element = React.createElement(PaymentConfirmedEmail, data as any)
      subject = `Payment confirmed for your ${data.requestType}`
      break
    case "request_approved":
      element = React.createElement(RequestApprovedEmail, data as any)
      subject = `Good news! Your ${data.requestType} has been approved`
      break
    case "needs_more_info":
      element = React.createElement(NeedsMoreInfoEmail, data as any)
      subject = `Action needed: Additional information required`
      break
    case "request_declined":
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
 * Send an email (logs to database, actual sending via Resend/SendGrid would be added)
 */
export async function sendEmail(params: SendEmailParams): Promise<{ success: boolean; error?: string }> {
  const { to, template, data, requestId } = params

  try {
    const { html, subject } = renderTemplate(template, data)

    // Log to database
    const supabase = getServiceClient()
    await supabase.from("email_logs").insert({
      request_id: requestId,
      recipient_email: to,
      template_type: template,
      subject,
      metadata: { data },
    })

    // TODO: Integrate with Resend or SendGrid for actual email delivery
    // For now, just log to console in development
    if (process.env.NODE_ENV === "development") {
      console.log(`[Email] Would send to ${to}:`, { subject, template })
    }

    return { success: true }
  } catch (error) {
    console.error("Error sending email:", error)
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
    console.error("Could not fetch request details for email")
    return
  }

  // Get patient email from auth
  const { data: authUser } = await supabase.auth.admin.getUserById(request.patient.auth_user_id)
  const email = authUser?.user?.email

  if (!email) {
    console.error("Could not find patient email")
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
