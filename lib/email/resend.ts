"use server"

import { logger } from "../logger"

import { env } from "../env"

/**
 * Email delivery service using Resend
 *
 * Environment variables required:
 * - RESEND_API_KEY (server-only, never NEXT_PUBLIC_)
 * - RESEND_FROM_EMAIL (e.g., "InstantMed <noreply@instantmed.com.au>")
 * - NEXT_PUBLIC_APP_URL (for generating links)
 */

// ============================================
// TYPES
// ============================================

interface ResendEmailAttachment {
  filename: string
  content: string // Base64 encoded
  type?: string
  disposition?: "attachment" | "inline"
}

interface ResendEmailParams {
  to: string
  from?: string
  subject: string
  html: string
  replyTo?: string
  tags?: { name: string; value: string }[]
  attachments?: ResendEmailAttachment[]
}

interface ResendResponse {
  id?: string
  error?: { message: string; statusCode: number }
}

interface EmailResult {
  success: boolean
  id?: string
  error?: string
}

// ============================================
// CORE EMAIL SENDER
// ============================================

/**
 * Send email via Resend API
 * Falls back to console logging in development if no API key
 */
export async function sendViaResend(params: ResendEmailParams): Promise<EmailResult> {
  const { to, subject, html, replyTo = "support@instantmed.com.au", tags } = params
  const from = params.from || env.resendFromEmail
  const apiKey = env.resendApiKey

  // If no API key, log and return success (development mode)
  if (!apiKey) {
    logger.debug(`[Email Dev Mode] Would send email:`)
    logger.debug(`To: ${to}`)
    logger.debug(`From: ${from}`)
    logger.debug(`Subject: ${subject}`)
    logger.debug(`Tags: ${JSON.stringify(tags)}`)
    return { success: true, id: `dev-${Date.now()}` }
  }

  try {
    const body: Record<string, unknown> = {
      from,
      to: [to],
      subject,
      html,
      reply_to: replyTo,
      tags,
    }

    // Add attachments if provided
    if (params.attachments && params.attachments.length > 0) {
      body.attachments = params.attachments.map((att) => ({
        filename: att.filename,
        content: att.content,
        type: att.type || "application/pdf",
        disposition: att.disposition || "attachment",
      }))
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    const data: ResendResponse = await response.json()

    if (!response.ok) {
      logger.error("[Resend Error] " + (data.error?.message || JSON.stringify(data.error)), data.error)
      return { success: false, error: data.error?.message || "Failed to send email" }
    }
    logger.info(`[Resend] Email sent to ${to}, id: ${data.id}`)
    return { success: true, id: data.id }
  } catch (error) {
    logger.error("[Resend Error] " + (error instanceof Error ? error.message : String(error)), {
      error,
    })
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

// ============================================
// MEDICAL CERTIFICATE EMAIL
// ============================================

interface MedCertReadyEmailParams {
  to: string
  patientName: string
  pdfUrl: string
  verificationCode?: string
  requestId: string
  certType?: string // "work" | "uni" | "carer"
}

/**
 * Send email when medical certificate is approved and PDF is ready
 */
export async function sendMedCertReadyEmail(params: MedCertReadyEmailParams): Promise<EmailResult> {
  const { to, patientName, pdfUrl, verificationCode, requestId, certType = "work" } = params
  const appUrl = env.appUrl

  const certTypeLabel =
    certType === "uni"
      ? "University/School"
      : certType === "carer"
        ? "Carer's Leave"
        : "Work Absence"

  const verificationSection = verificationCode
    ? `
      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px; margin: 24px 0;">
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #166534;">
          <strong>Verification Code</strong>
        </p>
        <p style="margin: 0; font-size: 20px; font-family: monospace; font-weight: bold; color: #15803d; letter-spacing: 2px;">
          ${verificationCode}
        </p>
        <p style="margin: 8px 0 0 0; font-size: 12px; color: #166534;">
          Your employer can verify this certificate at 
          <a href="${appUrl}/verify" style="color: #16a34a;">${appUrl.replace("https://", "")}/verify</a>
        </p>
      </div>
    `
    : ""

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
      <div style="background: white; border-radius: 16px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 24px;">
          <img src="${appUrl}/logo.png" alt="InstantMed" style="height: 40px;" />
        </div>
        
        <!-- Success Banner -->
        <div style="background: linear-gradient(135deg, #dcfce7, #d1fae5); border-radius: 12px; padding: 24px; margin-bottom: 24px; text-align: center;">
          <span style="font-size: 48px;">✓</span>
          <h1 style="color: #166534; font-size: 24px; margin: 16px 0 0 0;">
            Your medical certificate is ready
          </h1>
        </div>
        
        <!-- Greeting -->
        <p style="font-size: 16px;">Hi ${patientName},</p>
        
        <p style="font-size: 16px;">
          Your <strong>Medical Certificate - ${certTypeLabel}</strong> has been reviewed and approved by one of our doctors.
        </p>
        
        <!-- Download Button -->
        <div style="text-align: center; margin: 32px 0;">
          <a href="${pdfUrl}" 
             style="display: inline-block; background: linear-gradient(135deg, #00E2B5, #00C9A7); color: #0A0F1C; padding: 14px 32px; border-radius: 999px; text-decoration: none; font-weight: 600; font-size: 16px;">
            📄 Download Certificate (PDF)
          </a>
        </div>
        
        ${verificationSection}
        
        <!-- What's Next -->
        <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin: 24px 0;">
          <h3 style="margin: 0 0 12px 0; color: #0A0F1C; font-size: 16px;">What happens next?</h3>
          <ul style="margin: 0; padding-left: 20px; color: #475569;">
            <li>Download your certificate using the button above</li>
            <li>Forward it to your employer, university, or relevant institution</li>
            <li>Keep a copy for your records</li>
          </ul>
        </div>
        
        <!-- View Request Link -->
        <p style="font-size: 14px; color: #666;">
          You can also view your request and download your certificate from your 
          <a href="${appUrl}/patient/requests/${requestId}" style="color: #00C9A7; font-weight: 500;">patient dashboard</a>.
        </p>
        
        <!-- Help -->
        <p style="font-size: 14px; color: #666; margin-top: 24px;">
          Questions? Just reply to this email or visit our 
          <a href="${appUrl}/contact" style="color: #00C9A7;">help center</a>.
        </p>
        
        <!-- Footer -->
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0 24px 0;" />
        
        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
          InstantMed Pty Ltd · Australia<br>
          <a href="${appUrl}/privacy" style="color: #9ca3af;">Privacy</a> · 
          <a href="${appUrl}/terms" style="color: #9ca3af;">Terms</a>
        </p>
      </div>
    </body>
    </html>
  `

  return sendViaResend({
    to,
    subject: `Your medical certificate is ready ✓`,
    html,
    tags: [
      { name: "category", value: "med_cert_approved" },
      { name: "request_id", value: requestId },
      { name: "cert_type", value: certType },
    ],
  })
}

// ============================================
// OTHER EMAIL TEMPLATES
// ============================================

/**
 * Send welcome email to new patients
 */
export async function sendWelcomeEmail(to: string, patientName: string): Promise<EmailResult> {
  const appUrl = env.appUrl

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <img src="${appUrl}/logo.png" alt="InstantMed" style="height: 40px;" />
      </div>
      
      <h1 style="color: #0A0F1C; font-size: 24px; margin-bottom: 16px;">Welcome to InstantMed! 👋</h1>
      
      <p>Hi ${patientName},</p>
      
      <p>Thanks for joining InstantMed. We're here to make healthcare simple and accessible.</p>
      
      <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin: 24px 0;">
        <h3 style="margin-top: 0; color: #0A0F1C;">What you can do:</h3>
        <ul style="padding-left: 20px;">
          <li>Get medical certificates in hours, not days</li>
          <li>Request prescriptions from registered doctors</li>
          <li>Access pathology test requests online</li>
        </ul>
      </div>
      
      <p>
        <a href="${appUrl}/start" style="display: inline-block; background: linear-gradient(135deg, #00E2B5, #00C9A7); color: #0A0F1C; padding: 12px 24px; border-radius: 999px; text-decoration: none; font-weight: 600;">
          Get Started
        </a>
      </p>
      
      <p style="color: #666; font-size: 14px; margin-top: 30px;">
        Questions? Just reply to this email or visit our <a href="${appUrl}/contact" style="color: #00C9A7;">help center</a>.
      </p>
      
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
      
      <p style="color: #999; font-size: 12px; text-align: center;">
        InstantMed Pty Ltd · Australia<br>
        <a href="${appUrl}/privacy" style="color: #999;">Privacy</a> · 
        <a href="${appUrl}/terms" style="color: #999;">Terms</a>
      </p>
    </body>
    </html>
  `

  return sendViaResend({
    to,
    subject: "Welcome to InstantMed! 🩺",
    html,
    tags: [{ name: "category", value: "welcome" }],
  })
}

/**
 * Send script sent notification (for prescriptions)
 */
export async function sendScriptSentEmail(
  to: string,
  patientName: string,
  requestId: string,
  parchmentReference?: string
): Promise<EmailResult> {
  const appUrl = env.appUrl

  const referenceSection = parchmentReference
    ? `
      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px; margin: 24px 0;">
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #166534;">
          <strong>eScript Reference</strong>
        </p>
        <p style="margin: 0; font-size: 20px; font-family: monospace; font-weight: bold; color: #15803d; letter-spacing: 1px;">
          ${parchmentReference}
        </p>
        <p style="margin: 8px 0 0 0; font-size: 12px; color: #166534;">
          Show this reference at your pharmacy to collect your prescription.
        </p>
      </div>
    `
    : ""

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
      <div style="background: white; border-radius: 16px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 24px;">
          <img src="${appUrl}/logo.png" alt="InstantMed" style="height: 40px;" />
        </div>
        
        <!-- Success Banner -->
        <div style="background: linear-gradient(135deg, #dbeafe, #e0e7ff); border-radius: 12px; padding: 24px; margin-bottom: 24px; text-align: center;">
          <span style="font-size: 48px;">💊</span>
          <h1 style="color: #1e40af; font-size: 24px; margin: 16px 0 0 0;">
            Your prescription has been sent
          </h1>
        </div>
        
        <!-- Greeting -->
        <p style="font-size: 16px;">Hi ${patientName},</p>
        
        <p style="font-size: 16px;">
          Great news! Your prescription has been approved and sent electronically to your nominated pharmacy.
        </p>
        
        ${referenceSection}
        
        <!-- What's Next -->
        <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin: 24px 0;">
          <h3 style="margin: 0 0 12px 0; color: #0A0F1C; font-size: 16px;">What happens next?</h3>
          <ul style="margin: 0; padding-left: 20px; color: #475569;">
            <li>Visit any pharmacy to collect your medication</li>
            <li>Show your Medicare card and the eScript reference (if provided)</li>
            <li>Your pharmacist will dispense your medication</li>
          </ul>
        </div>
        
        <!-- View Request Link -->
        <p style="font-size: 14px; color: #666;">
          You can view your request details on your 
          <a href="${appUrl}/patient/intakes/${requestId}" style="color: #00C9A7; font-weight: 500;">patient dashboard</a>.
        </p>
        
        <!-- Help -->
        <p style="font-size: 14px; color: #666; margin-top: 24px;">
          Questions? Just reply to this email or visit our 
          <a href="${appUrl}/contact" style="color: #00C9A7;">help center</a>.
        </p>
        
        <!-- Footer -->
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0 24px 0;" />
        
        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
          InstantMed Pty Ltd · Australia<br>
          <a href="${appUrl}/privacy" style="color: #9ca3af;">Privacy</a> · 
          <a href="${appUrl}/terms" style="color: #9ca3af;">Terms</a>
        </p>
      </div>
    </body>
    </html>
  `

  return sendViaResend({
    to,
    subject: `Your prescription has been sent 💊`,
    html,
    tags: [
      { name: "category", value: "script_sent" },
      { name: "request_id", value: requestId },
    ],
  })
}

/**
 * Send request declined notification
 */
export async function sendRequestDeclinedEmail(
  to: string,
  patientName: string,
  requestType: string,
  requestId: string,
  reason?: string
): Promise<EmailResult> {
  const appUrl = env.appUrl

  const reasonSection = reason
    ? `
      <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 16px; margin: 24px 0;">
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #991b1b; font-weight: 600;">
          Doctor's note:
        </p>
        <p style="margin: 0; font-size: 14px; color: #7f1d1d;">
          ${reason}
        </p>
      </div>
    `
    : ""

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <img src="${appUrl}/logo.png" alt="InstantMed" style="height: 40px;" />
      </div>
      
      <h1 style="color: #0A0F1C; font-size: 24px; margin-bottom: 16px;">Update on your ${requestType} request</h1>
      
      <p>Hi ${patientName},</p>
      
      <p>
        Unfortunately, our doctor was unable to approve your ${requestType} request at this time.
      </p>
      
      ${reasonSection}
      
      <p>
        We recommend consulting with a GP in person for further assessment.
      </p>
      
      <p>
        <a href="${appUrl}/patient/requests/${requestId}" style="display: inline-block; background: #f3f4f6; color: #374151; padding: 12px 24px; border-radius: 999px; text-decoration: none; font-weight: 600;">
          View Request Details
        </a>
      </p>
      
      <p style="color: #666; font-size: 14px; margin-top: 30px;">
        Questions? <a href="${appUrl}/contact" style="color: #00C9A7;">Contact our support team</a>.
      </p>
      
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
      
      <p style="color: #999; font-size: 12px; text-align: center;">
        InstantMed Pty Ltd · Australia
      </p>
    </body>
    </html>
  `

  return sendViaResend({
    to,
    subject: `Update on your ${requestType} request`,
    html,
    tags: [
      { name: "category", value: "request_declined" },
      { name: "request_id", value: requestId },
    ],
  })
}
