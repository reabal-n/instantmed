import "server-only"
import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { createClient } from "@supabase/supabase-js"
import { Resend } from "resend"
import { RequestReceivedEmail } from "./templates/request-received"
import { PaymentConfirmedEmail } from "./templates/payment-confirmed"
import { RequestApprovedEmail } from "./templates/request-approved"
import { NeedsMoreInfoEmail } from "./templates/needs-more-info"
import { RequestDeclinedEmail } from "./templates/request-declined"
import { logger } from "../logger"
import { env } from "../env"

function getServiceClient() {
  const url = env.supabaseUrl
  const key = env.supabaseServiceRoleKey
  return createClient(url, key)
}

function getResendClient(): Resend | null {
  const apiKey = env.resendApiKey
  if (!apiKey) {
    return null
  }
  return new Resend(apiKey)
}

export type EmailTemplate =
  | "request_received"
  | "payment_confirmed"
  | "request_approved"
  | "needs_more_info"
  | "request_declined"

interface EmailTemplateProps {
  patientName?: string
  requestType?: string
  requestId?: string
  documentUrl?: string
  doctorNotes?: string
  amount?: number
  [key: string]: unknown
}

interface SendEmailParams {
  to: string
  template: EmailTemplate
  data: EmailTemplateProps
  requestId?: string
}

/**
 * Render email template to HTML string
 */
function renderTemplate(template: EmailTemplate, data: EmailTemplateProps): { html: string; subject: string } {
  let element: React.ReactElement
  let subject: string

  switch (template) {
    case "request_received":
      element = React.createElement(RequestReceivedEmail, data)
      subject = `Your ${data.requestType || 'request'} has been received`
      break
    case "payment_confirmed":
      element = React.createElement(PaymentConfirmedEmail, data)
      subject = `Payment confirmed for your ${data.requestType || 'request'}`
      break
    case "request_approved":
      element = React.createElement(RequestApprovedEmail, data)
      subject = `Good news! Your ${data.requestType || 'request'} has been approved`
      break
    case "needs_more_info":
      element = React.createElement(NeedsMoreInfoEmail, data)
      subject = `Action needed: Additional information required`
      break
    case "request_declined":
      element = React.createElement(RequestDeclinedEmail, data)
      subject = `Update on your ${data.requestType || 'request'} request`
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
    const fromEmail = env.resendFromEmail

    // Log to database first (even if sending fails)
    const supabase = getServiceClient()
    const logResult = await supabase.from("email_logs").insert({
      request_id: requestId,
      recipient_email: to,
      template_type: template,
      subject,
      metadata: { data },
    })

    if (logResult.error) {
      logger.warn("Failed to log email to database", { error: logResult.error })
    }

    // Attempt to send via Resend
    const resend = getResendClient()

    if (!resend) {
      // No Resend API key configured - log only (for development/testing)
      if (env.isDev) {
        logger.info(`[Email] Would send to ${to}`, { subject, template })
      } else {
        logger.error("RESEND_API_KEY not configured in production - email not sent", { to, subject })
      }
      return { success: false, error: "Email service not configured" }
    }

    // Send email via Resend
    const { data: resendData, error: resendError } = await resend.emails.send({
      from: fromEmail,
      to: [to],
      subject,
      html,
    })

    if (resendError) {
      logger.error("Resend email send failed", {
        error: resendError,
        to,
        subject,
        template
      })
      return { success: false, error: resendError.message || String(resendError) }
    }

    logger.info("Email sent successfully", {
      to,
      subject,
      template,
      emailId: resendData?.id
    })

    return { success: true }
  } catch (error) {
    logger.error("Error sending email", {
      error: error instanceof Error ? error.message : String(error),
      to,
      template
    })
    return { success: false, error: error instanceof Error ? error.message : String(error) }
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
  const { data: request, error: requestError } = await supabase
    .from("requests")
    .select(`
      id,
      category,
      subtype,
      patient_id,
      patient:profiles!patient_id (
        id,
        full_name,
        auth_user_id
      )
    `)
    .eq("id", requestId)
    .single()

  if (requestError || !request) {
    logger.error("Could not fetch request details for email", {
      error: requestError,
      requestId
    })
    return
  }

  // Handle patient data (can be array due to Supabase join behavior)
  const patientRaw = request.patient
  const patient = Array.isArray(patientRaw) ? patientRaw[0] : patientRaw

  if (!patient) {
    logger.error("No patient data found", { requestId })
    return
  }

  // Get patient email from auth
  const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(
    patient.auth_user_id
  )

  if (authError || !authUser?.user?.email) {
    logger.error("Could not find patient email", {
      error: authError,
      requestId,
      patientId: patient.id
    })
    return
  }

  const email = authUser.user.email

  const baseData: EmailTemplateProps = {
    patientName: patient.full_name || "there",
    requestType: formatRequestType(request.category, request.subtype),
    requestId: request.id,
    ...additionalData,
  }

  const result = await sendEmail({
    to: email,
    template: templateType as EmailTemplate,
    data: baseData,
    requestId,
  })

  if (!result.success) {
    logger.error("Failed to send state transition email", {
      requestId,
      template: templateType,
      error: result.error
    })
  }
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
  if (category === "pathology") {
    if (subtype === "imaging") return "imaging request"
    if (subtype === "bloods") return "pathology request"
    return "pathology request"
  }
  return "request"
}
