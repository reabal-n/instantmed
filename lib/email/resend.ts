"use server"

import { logger } from "@/lib/observability/logger"
import * as Sentry from "@sentry/nextjs"
import { captureRedisWarning } from "@/lib/observability/redis-sentry"

import { env } from "../env"
import { isEmailSuppressed, htmlToPlainText } from "./utils"
import { Redis } from "@upstash/redis"

/**
 * Email delivery service using Resend
 *
 * Environment variables required:
 * - RESEND_API_KEY (server-only, never NEXT_PUBLIC_)
 * - RESEND_FROM_EMAIL (e.g., "InstantMed <noreply@instantmed.com.au>")
 * - NEXT_PUBLIC_APP_URL (for generating links)
 */

// ============================================
// VALIDATION
// ============================================

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Validate email format before sending
 */
function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email) && email.length <= 254
}

/**
 * Sanitize email for logging (hide domain details in production)
 */
function sanitizeEmailForLog(email: string): string {
  if (env.isDev) return email
  const [local, domain] = email.split("@")
  if (!domain) return "[invalid-email]"
  return `${local.slice(0, 2)}***@${domain.slice(0, 3)}***.${domain.split(".").pop()}`
}

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
  subject: string
  html: string
  text?: string // Plain text fallback
  from?: string
  replyTo?: string
  tags?: { name: string; value: string }[]
  attachments?: ResendEmailAttachment[]
  headers?: Record<string, string> // Custom headers like List-Unsubscribe
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

// P1 FIX: Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 1000, // 1 second
  maxDelayMs: 10000, // 10 seconds
}

/**
 * Calculate exponential backoff delay
 */
function getRetryDelay(attempt: number): number {
  const delay = RETRY_CONFIG.baseDelayMs * Math.pow(2, attempt)
  return Math.min(delay, RETRY_CONFIG.maxDelayMs)
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Check if error is retryable (network issues, rate limits, server errors)
 */
function isRetryableError(statusCode?: number, errorMessage?: string): boolean {
  // Rate limit
  if (statusCode === 429) return true
  // Server errors
  if (statusCode && statusCode >= 500) return true
  // Network errors
  if (errorMessage?.includes("fetch failed")) return true
  if (errorMessage?.includes("ECONNRESET")) return true
  if (errorMessage?.includes("ETIMEDOUT")) return true
  return false
}

// ============================================
// RATE LIMITING
// ============================================

const RATE_LIMIT_CONFIG = {
  maxEmailsPerHour: 10, // Max emails to single address per hour
  maxEmailsPerDay: 50, // Max emails to single address per day
  globalMaxPerMinute: 100, // Global rate limit per minute
}

/**
 * Check if email sending is rate limited
 * Returns true if rate limited, false if allowed
 */
async function checkEmailRateLimit(email: string): Promise<boolean> {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return false // No rate limiting if Redis not configured
  }

  try {
    const redis = Redis.fromEnv()
    const emailKey = `email:ratelimit:${email.toLowerCase()}`
    const hourKey = `${emailKey}:hour`
    const dayKey = `${emailKey}:day`

    // Check hourly limit
    const hourCount = await redis.incr(hourKey)
    if (hourCount === 1) {
      await redis.expire(hourKey, 3600) // 1 hour TTL
    }
    if (hourCount > RATE_LIMIT_CONFIG.maxEmailsPerHour) {
      return true
    }

    // Check daily limit
    const dayCount = await redis.incr(dayKey)
    if (dayCount === 1) {
      await redis.expire(dayKey, 86400) // 24 hour TTL
    }
    if (dayCount > RATE_LIMIT_CONFIG.maxEmailsPerDay) {
      return true
    }

    return false
  } catch (error) {
    logger.warn("[Resend] Rate limit check failed, allowing send", { error })
    captureRedisWarning(error, {
      operation: 'limit',
      keyPrefix: 'email:ratelimit',
      subsystem: 'email',
    })
    return false // Allow on error to not block emails
  }
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

  // E2E TEST ONLY: Force email failure for failure-mode testing
  // This flag is only checked when PLAYWRIGHT=1 to ensure production safety
  if (process.env.PLAYWRIGHT === "1" && process.env.E2E_FORCE_EMAIL_FAIL === "true") {
    logger.info("[Resend] E2E forced email failure", { to: sanitizeEmailForLog(to), subject })
    return { success: false, error: "E2E_FORCE_EMAIL_FAIL: Simulated email delivery failure" }
  }

  // Validate email format before sending
  if (!isValidEmail(to)) {
    logger.warn("[Resend] Invalid email format", { to: sanitizeEmailForLog(to) })
    return { success: false, error: "Invalid email address format" }
  }

  // Check bounce suppression list (skip in dev mode)
  if (apiKey) {
    const suppressed = await isEmailSuppressed(to)
    if (suppressed) {
      logger.warn("[Resend] Email suppressed (previous bounce/complaint)", { to: sanitizeEmailForLog(to) })
      return { success: false, error: "Email address previously bounced or complained" }
    }
  }

  // Rate limiting (skip in dev mode)
  if (apiKey && process.env.UPSTASH_REDIS_REST_URL) {
    const rateLimited = await checkEmailRateLimit(to)
    if (rateLimited) {
      logger.warn("[Resend] Rate limited", { to: sanitizeEmailForLog(to) })
      return { success: false, error: "Too many emails sent to this address recently" }
    }
  }

  // If no API key, log and return success (development mode)
  // Note: In dev mode we log sanitized email for debugging
  if (!apiKey) {
    logger.debug(`[Email Dev Mode] Would send email to: ${sanitizeEmailForLog(to)}`)
    logger.debug(`[Email Dev Mode] Subject: ${subject}`)
    return { success: true, id: `dev-${Date.now()}` }
  }

  const body: Record<string, unknown> = {
    from,
    to: [to],
    subject,
    html,
    reply_to: replyTo,
    tags,
  }

  // Add plain text fallback (auto-generate if not provided)
  if (params.text) {
    body.text = params.text
  } else {
    body.text = htmlToPlainText(html)
  }

  // Add custom headers (e.g., List-Unsubscribe for marketing emails)
  if (params.headers) {
    body.headers = params.headers
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

  // P1 FIX: Retry loop with exponential backoff
  let lastError: string | undefined
  
  for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = getRetryDelay(attempt - 1)
        logger.info(`[Resend] Retry attempt ${attempt}/${RETRY_CONFIG.maxRetries} after ${delay}ms`, { to, subject })
        await sleep(delay)
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
        lastError = data.error?.message || "Failed to send email"
        
        // Check if we should retry
        if (isRetryableError(response.status, lastError) && attempt < RETRY_CONFIG.maxRetries) {
          logger.warn(`[Resend] Retryable error (${response.status}): ${lastError}`, { to, attempt })
          continue
        }
        
        logger.error("[Resend Error] " + lastError, data.error)
        return { success: false, error: lastError }
      }
      
      logger.info(`[Resend] Email sent to ${to}, id: ${data.id}${attempt > 0 ? ` (attempt ${attempt + 1})` : ""})`)
      return { success: true, id: data.id }
      
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Unknown error"
      
      // Check if we should retry network errors
      if (isRetryableError(undefined, lastError) && attempt < RETRY_CONFIG.maxRetries) {
        logger.warn(`[Resend] Network error, will retry: ${lastError}`, { to, attempt })
        continue
      }
      
      logger.error("[Resend Error] " + lastError, { error })
      return { success: false, error: lastError }
    }
  }

  // Should not reach here, but safety return
  return { success: false, error: lastError || "Max retries exceeded" }
}

/**
 * Send email with Sentry alerting for critical email types
 * Use this for emails that must reach the patient (cert ready, script sent, etc.)
 */
export async function sendCriticalEmail(
  params: ResendEmailParams,
  context: { emailType: string; intakeId?: string; patientId?: string }
): Promise<EmailResult> {
  const result = await sendViaResend(params)
  
  if (!result.success) {
    // Alert operators - critical email failed to send
    Sentry.captureMessage(`Critical email failed: ${context.emailType}`, {
      level: "error",
      tags: {
        source: "email-delivery",
        email_type: context.emailType,
      },
      extra: {
        to: params.to,
        subject: params.subject,
        intakeId: context.intakeId,
        patientId: context.patientId,
        error: result.error,
      },
    })
    logger.error(`[Resend] Critical email failed - alerting operators`, {
      emailType: context.emailType,
      to: params.to,
      error: result.error,
    })
  }
  
  return result
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
  pdfContent?: string // Base64 encoded PDF for attachment
  attachPdf?: boolean // Whether to attach the PDF directly
}

/**
 * Send email when medical certificate is approved and PDF is ready
 * Optionally attaches the PDF directly for better UX
 * 
 * @deprecated For med certs, use sendEmail() from lib/email/send-email.ts with MedCertPatientEmail template.
 * This function is kept only for non-med-cert document types in lib/notifications/service.ts.
 */
export async function sendMedCertReadyEmail(params: MedCertReadyEmailParams): Promise<EmailResult> {
  const { to, patientName, pdfUrl, verificationCode, requestId, certType = "work", pdfContent, attachPdf = true } = params
  const appUrl = env.appUrl

  // If PDF content is provided and attachment is enabled, include it
  const attachments: ResendEmailAttachment[] = []
  if (attachPdf && pdfContent) {
    attachments.push({
      filename: `medical-certificate-${requestId.slice(0, 8)}.pdf`,
      content: pdfContent,
      type: "application/pdf",
      disposition: "attachment",
    })
  }

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
          InstantMed Pty Ltd · ABN 64 694 559 334 · Sydney, Australia<br>
          <a href="${appUrl}/privacy" style="color: #9ca3af;">Privacy</a> · 
          <a href="${appUrl}/terms" style="color: #9ca3af;">Terms</a> ·
          <a href="${appUrl}/contact" style="color: #9ca3af;">Contact</a> ·
          <a href="${appUrl}/unsubscribe" style="color: #9ca3af;">Unsubscribe</a>
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
    attachments: attachments.length > 0 ? attachments : undefined,
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
        InstantMed Pty Ltd · ABN 64 694 559 334 · Sydney, Australia<br>
        <a href="${appUrl}/privacy" style="color: #999;">Privacy</a> · 
        <a href="${appUrl}/terms" style="color: #999;">Terms</a> ·
        <a href="${appUrl}/contact" style="color: #999;">Contact</a> ·
        <a href="${appUrl}/unsubscribe" style="color: #999;">Unsubscribe</a>
      </p>
    </body>
    </html>
  `

  return sendViaResend({
    to,
    subject: "Welcome to InstantMed",
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
          Great news! Your prescription has been approved and your eScript has been sent to your phone via SMS.
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
          InstantMed Pty Ltd · ABN 64 694 559 334 · Sydney, Australia<br>
          <a href="${appUrl}/privacy" style="color: #9ca3af;">Privacy</a> · 
          <a href="${appUrl}/terms" style="color: #9ca3af;">Terms</a> ·
          <a href="${appUrl}/contact" style="color: #9ca3af;">Contact</a> ·
          <a href="${appUrl}/unsubscribe" style="color: #9ca3af;">Unsubscribe</a>
        </p>
      </div>
    </body>
    </html>
  `

  return sendViaResend({
    to,
    subject: `Your eScript has been sent`,
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
        <a href="${appUrl}/patient/intakes/${requestId}" style="display: inline-block; background: #f3f4f6; color: #374151; padding: 12px 24px; border-radius: 999px; text-decoration: none; font-weight: 600;">
          View Request Details
        </a>
      </p>
      
      <p style="color: #666; font-size: 14px; margin-top: 30px;">
        Questions? <a href="${appUrl}/contact" style="color: #00C9A7;">Contact our support team</a>.
      </p>
      
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
      
      <p style="color: #999; font-size: 12px; text-align: center;">
        InstantMed Pty Ltd · ABN 64 694 559 334 · Sydney, Australia<br>
        <a href="${appUrl}/privacy" style="color: #999;">Privacy</a> · 
        <a href="${appUrl}/terms" style="color: #999;">Terms</a> ·
        <a href="${appUrl}/contact" style="color: #999;">Contact</a> ·
        <a href="${appUrl}/unsubscribe" style="color: #999;">Unsubscribe</a>
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
