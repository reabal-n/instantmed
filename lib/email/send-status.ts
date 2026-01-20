import "server-only"
import { createClient } from "@supabase/supabase-js"
import { sendViaResend } from "./resend"
import { logger } from "@/lib/observability/logger"

function getServiceClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error("Missing Supabase credentials")
  return createClient(url, key)
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au"

/**
 * Base HTML wrapper for all emails
 */
function wrapInBaseLayout(previewText: string, content: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <title>${previewText}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #1a1a1a;
      background-color: #f5f5f5;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    .card {
      background: #ffffff;
      border-radius: 12px;
      padding: 32px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .logo {
      font-size: 24px;
      font-weight: 700;
      color: #1a1a1a;
      text-decoration: none;
      margin-bottom: 24px;
      display: block;
    }
    h1 {
      font-size: 20px;
      font-weight: 600;
      margin: 0 0 16px 0;
    }
    p {
      margin: 0 0 16px 0;
      color: #4a4a4a;
    }
    .button {
      display: inline-block;
      background: #1a1a1a;
      color: #ffffff !important;
      padding: 12px 24px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 500;
      margin: 8px 0;
    }
    .button-secondary {
      background: #f5f5f5;
      color: #1a1a1a !important;
    }
    .info-box {
      background: #f0f9ff;
      border: 1px solid #bae6fd;
      border-radius: 8px;
      padding: 16px;
      margin: 16px 0;
    }
    .warning-box {
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 8px;
      padding: 16px;
      margin: 16px 0;
    }
    .success-box {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 8px;
      padding: 16px;
      margin: 16px 0;
    }
    .footer {
      text-align: center;
      padding-top: 24px;
      margin-top: 24px;
      border-top: 1px solid #e5e5e5;
      font-size: 13px;
      color: #737373;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <a href="${APP_URL}" class="logo">
        Instant<span style="color: #00E2B5;">Med</span>
      </a>
      ${content}
      <div class="footer">
        <p>© ${new Date().getFullYear()} InstantMed. All rights reserved.</p>
        <p>
          <a href="${APP_URL}/privacy">Privacy</a> · 
          <a href="${APP_URL}/terms">Terms</a> · 
          <a href="${APP_URL}/contact">Contact</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>`
}

/**
 * Email templates as inline HTML functions
 */
const emailTemplates = {
  request_approved: (data: { patientName: string; requestType: string; requestId: string; doctorName?: string; documentUrl?: string }) => ({
    subject: `Good news! Your ${data.requestType} has been approved`,
    html: wrapInBaseLayout(`Your ${data.requestType} has been approved`, `
      <h1>Good news! Your request is approved ✓</h1>
      <p>Hi ${data.patientName},</p>
      <p>
        Dr ${data.doctorName || "Your Doctor"} has reviewed and approved your <strong>${data.requestType}</strong> request.
        ${data.documentUrl ? " Your document is ready to download." : ""}
      </p>
      ${data.documentUrl ? `
        <p>
          <a href="${data.documentUrl}" class="button">Download Your Document</a>
        </p>
      ` : ""}
      <p>
        <a href="${APP_URL}/patient/intakes/${data.requestId}" class="button button-secondary">View in Dashboard</a>
      </p>
      <div class="info-box">
        <p style="margin: 0; font-size: 14px;">
          <strong>Tips:</strong>
        </p>
        <ul style="margin: 8px 0 0 0; padding-left: 20px; font-size: 14px;">
          <li>Save or print your document for your records</li>
          <li>Forward it to your employer/university if required</li>
          <li>The document includes a verification code</li>
        </ul>
      </div>
      <p style="font-size: 14px; color: #737373;">
        Thank you for using InstantMed. We hope you feel better soon!
      </p>
    `),
  }),

  request_declined: (data: { patientName: string; requestType: string; requestId: string; reason?: string }) => ({
    subject: `Update on your ${data.requestType} request`,
    html: wrapInBaseLayout(`Update on your ${data.requestType} request`, `
      <h1>About your request</h1>
      <p>Hi ${data.patientName},</p>
      <p>
        After careful review, the doctor was unable to approve your <strong>${data.requestType}</strong>
        request at this time.
      </p>
      <div class="info-box">
        <p style="margin: 0; font-weight: 500;">Reason:</p>
        <p style="margin: 8px 0 0 0;">${data.reason || "After careful review, the doctor was unable to approve this request through our telehealth service."}</p>
      </div>
      <p><strong>What happens next?</strong></p>
      <p>A full refund will be processed to your original payment method within 5-7 business days.</p>
      <div class="warning-box">
        <p style="margin: 0; font-size: 14px;">
          <strong>Need to see a doctor?</strong><br>
          If your symptoms are concerning, please consider booking an in-person appointment with your regular GP or
          visiting a medical centre.
        </p>
      </div>
      <p>
        <a href="${APP_URL}/patient/intakes/${data.requestId}" class="button button-secondary">View Details</a>
      </p>
      <p style="font-size: 14px; color: #737373;">
        If you have questions about this decision, please reply to this email.
      </p>
    `),
  }),

  needs_more_info: (data: { patientName: string; requestType: string; requestId: string; message?: string }) => ({
    subject: `Action needed: Additional information required`,
    html: wrapInBaseLayout(`Additional information required`, `
      <h1>We need a bit more information</h1>
      <p>Hi ${data.patientName},</p>
      <p>
        Our doctor has reviewed your <strong>${data.requestType}</strong> request and needs some additional information before making a decision.
      </p>
      <div class="info-box">
        <p style="margin: 0; font-weight: 500;">Message from the doctor:</p>
        <p style="margin: 8px 0 0 0;">${data.message || "Please provide additional details about your request."}</p>
      </div>
      <p>
        <a href="${APP_URL}/patient/intakes/${data.requestId}" class="button">Respond Now</a>
      </p>
      <p style="font-size: 14px; color: #737373;">
        Please respond as soon as possible so we can continue processing your request.
      </p>
    `),
  }),
}

export type EmailTemplateType = keyof typeof emailTemplates

interface SendStatusEmailParams {
  to: string
  template: EmailTemplateType
  data: Record<string, unknown>
  requestId?: string
}

/**
 * Send a status change email via Resend
 */
export async function sendStatusEmail(params: SendStatusEmailParams): Promise<{ success: boolean; error?: string }> {
  const { to, template, data, requestId } = params

  try {
    const templateFn = emailTemplates[template]
    if (!templateFn) {
      throw new Error(`Unknown template: ${template}`)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { html, subject } = templateFn(data as any)

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
 * Send email triggered by state transition - fetches intake details and sends
 */
export async function sendStatusTransitionEmail(
  intakeId: string,
  templateType: EmailTemplateType,
  additionalData?: Record<string, unknown>,
): Promise<void> {
  const supabase = getServiceClient()

  // Fetch intake and patient details (intakes is single source of truth)
  const { data: intake } = await supabase
    .from("intakes")
    .select(`
      *,
      patient:profiles!patient_id (*)
    `)
    .eq("id", intakeId)
    .single()

  if (!intake || !intake.patient) {
    logger.error("Could not fetch intake details for email")
    return
  }

  // Get patient email from auth
  const { data: authUser } = await supabase.auth.admin.getUserById(intake.patient.auth_user_id)
  const email = authUser?.user?.email

  if (!email) {
    logger.error("Could not find patient email")
    return
  }

  const baseData = {
    patientName: intake.patient.full_name || "there",
    requestType: formatRequestType(intake.category, intake.subtype),
    requestId: intake.id,
    ...additionalData,
  }

  await sendStatusEmail({
    to: email,
    template: templateType,
    data: baseData,
    requestId: intakeId,
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
