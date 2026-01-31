"use server"

/**
 * Centralized Email Sending Service
 * 
 * Routes all transactional emails through a single function that:
 * 1. Renders React email templates to HTML
 * 2. Sends via Resend (or skips in E2E mode)
 * 3. Logs all attempts to email_outbox table
 * 4. Includes Sentry instrumentation
 */

import * as Sentry from "@sentry/nextjs"
import { renderEmailToHtml } from "./react-renderer-server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { env } from "@/lib/env"
import { logger } from "@/lib/observability/logger"
import { isEmailSuppressed, htmlToPlainText } from "./utils"

// ============================================
// TYPES
// ============================================

export type EmailType =
  | "welcome"
  | "med_cert_patient"
  | "med_cert_employer"
  | "script_sent"
  | "request_declined"
  | "needs_more_info"
  | "generic"

interface SendEmailParams {
  to: string
  toName?: string
  subject: string
  template: React.ReactElement
  emailType: EmailType
  // Context for logging/linking
  intakeId?: string
  patientId?: string
  certificateId?: string
  // Optional metadata (non-sensitive)
  metadata?: Record<string, unknown>
  // Optional overrides
  from?: string
  replyTo?: string
  tags?: { name: string; value: string }[]
}

interface SendEmailResult {
  success: boolean
  messageId?: string
  outboxId?: string
  error?: string
  skipped?: boolean  // True if skipped due to E2E mode
}

// ============================================
// E2E DETECTION
// ============================================

function isE2EMode(): boolean {
  return process.env.PLAYWRIGHT === "1" || process.env.E2E === "true"
}

// ============================================
// RETRY CONFIGURATION
// ============================================

const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
}

function getRetryDelay(attempt: number): number {
  const delay = RETRY_CONFIG.baseDelayMs * Math.pow(2, attempt)
  return Math.min(delay, RETRY_CONFIG.maxDelayMs)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isRetryableError(statusCode?: number, errorMessage?: string): boolean {
  if (statusCode === 429) return true
  if (statusCode && statusCode >= 500) return true
  if (errorMessage?.includes("fetch failed")) return true
  if (errorMessage?.includes("ECONNRESET")) return true
  if (errorMessage?.includes("ETIMEDOUT")) return true
  return false
}

// ============================================
// EMAIL VALIDATION
// ============================================

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email) && email.length <= 254
}

function sanitizeEmailForLog(email: string): string {
  if (env.isDev) return email
  const [local, domain] = email.split("@")
  if (!domain) return "[invalid-email]"
  return `${local.slice(0, 2)}***@${domain.slice(0, 3)}***.${domain.split(".").pop()}`
}

// ============================================
// OUTBOX LOGGING
// ============================================

interface OutboxEntry {
  email_type: EmailType
  to_email: string
  to_name?: string
  subject: string
  status: "pending" | "sent" | "failed" | "skipped_e2e"
  provider: string
  provider_message_id?: string
  error_message?: string
  intake_id?: string
  patient_id?: string
  certificate_id?: string
  metadata?: Record<string, unknown>
  sent_at?: string
}

async function logToOutbox(entry: OutboxEntry): Promise<string | null> {
  try {
    const supabase = createServiceRoleClient()
    const { data, error } = await supabase
      .from("email_outbox")
      .insert({
        email_type: entry.email_type,
        to_email: entry.to_email,
        to_name: entry.to_name,
        subject: entry.subject,
        status: entry.status,
        provider: entry.provider,
        provider_message_id: entry.provider_message_id,
        error_message: entry.error_message,
        intake_id: entry.intake_id,
        patient_id: entry.patient_id,
        certificate_id: entry.certificate_id,
        metadata: entry.metadata || {},
        sent_at: entry.sent_at,
      })
      .select("id")
      .single()

    if (error) {
      logger.error("[Email] Failed to log to outbox", { error: error.message })
      return null
    }
    return data?.id || null
  } catch (err) {
    logger.error("[Email] Outbox logging error", { error: err })
    return null
  }
}

// ============================================
// MAIN SEND FUNCTION
// ============================================

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const {
    to,
    toName,
    subject,
    template,
    emailType,
    intakeId,
    patientId,
    certificateId,
    metadata = {},
    from = env.resendFromEmail,
    replyTo = "support@instantmed.com.au",
    tags = [],
  } = params

  // Add Sentry context
  Sentry.setTag("email_type", emailType)
  Sentry.setTag("service_type", emailType.startsWith("med_cert") ? "med_cert" : "other")
  if (intakeId) Sentry.setTag("intake_id", intakeId)

  // Validate email format
  if (!isValidEmail(to)) {
    const error = "Invalid email address format"
    logger.warn("[Email] " + error, { to: sanitizeEmailForLog(to), emailType })
    
    await logToOutbox({
      email_type: emailType,
      to_email: to,
      to_name: toName,
      subject,
      status: "failed",
      provider: "resend",
      error_message: error,
      intake_id: intakeId,
      patient_id: patientId,
      certificate_id: certificateId,
      metadata,
    })

    return { success: false, error }
  }

  // Render React template to HTML
  let html: string
  try {
    html = await renderEmailToHtml(template)
  } catch (err) {
    const error = `Template render failed: ${err instanceof Error ? err.message : "Unknown"}`
    logger.error("[Email] " + error, { emailType })
    Sentry.captureException(err, { tags: { action: "render_email_template" } })
    
    await logToOutbox({
      email_type: emailType,
      to_email: to,
      to_name: toName,
      subject,
      status: "failed",
      provider: "resend",
      error_message: error,
      intake_id: intakeId,
      patient_id: patientId,
      certificate_id: certificateId,
      metadata,
    })

    return { success: false, error }
  }

  // E2E MODE: Skip actual sending, log as skipped
  if (isE2EMode()) {
    logger.info("[Email] E2E mode - skipping Resend, logging to outbox", {
      to: sanitizeEmailForLog(to),
      emailType,
      subject,
    })

    const outboxId = await logToOutbox({
      email_type: emailType,
      to_email: to,
      to_name: toName,
      subject,
      status: "skipped_e2e",
      provider: "resend",
      provider_message_id: `e2e-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      intake_id: intakeId,
      patient_id: patientId,
      certificate_id: certificateId,
      metadata: { ...metadata, e2e_mode: true },
      sent_at: new Date().toISOString(),
    })

    return {
      success: true,
      messageId: `e2e-${Date.now()}`,
      outboxId: outboxId || undefined,
      skipped: true,
    }
  }

  // DEV MODE: No API key, just log
  const apiKey = env.resendApiKey
  if (!apiKey) {
    logger.debug(`[Email Dev Mode] Would send to: ${sanitizeEmailForLog(to)}`, { subject, emailType })
    
    const outboxId = await logToOutbox({
      email_type: emailType,
      to_email: to,
      to_name: toName,
      subject,
      status: "sent",
      provider: "resend",
      provider_message_id: `dev-${Date.now()}`,
      intake_id: intakeId,
      patient_id: patientId,
      certificate_id: certificateId,
      metadata: { ...metadata, dev_mode: true },
      sent_at: new Date().toISOString(),
    })

    return { success: true, messageId: `dev-${Date.now()}`, outboxId: outboxId || undefined }
  }

  // Check bounce suppression
  const suppressed = await isEmailSuppressed(to)
  if (suppressed) {
    const error = "Email address previously bounced or complained"
    logger.warn("[Email] Suppressed", { to: sanitizeEmailForLog(to) })
    
    await logToOutbox({
      email_type: emailType,
      to_email: to,
      to_name: toName,
      subject,
      status: "failed",
      provider: "resend",
      error_message: error,
      intake_id: intakeId,
      patient_id: patientId,
      certificate_id: certificateId,
      metadata,
    })

    return { success: false, error }
  }

  // Build request body
  const body: Record<string, unknown> = {
    from,
    to: [to],
    subject,
    html,
    text: htmlToPlainText(html),
    reply_to: replyTo,
    tags: [
      { name: "email_type", value: emailType },
      ...tags,
    ],
  }

  // Send with retries
  let lastError: string | undefined
  
  for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = getRetryDelay(attempt - 1)
        logger.info(`[Email] Retry ${attempt}/${RETRY_CONFIG.maxRetries} after ${delay}ms`, { to, subject })
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

      const data = await response.json()

      if (!response.ok) {
        lastError = data.error?.message || "Failed to send email"
        
        if (isRetryableError(response.status, lastError) && attempt < RETRY_CONFIG.maxRetries) {
          logger.warn(`[Email] Retryable error (${response.status}): ${lastError}`, { to, attempt })
          continue
        }
        
        logger.error("[Email] Send failed", { error: lastError, emailType, to: sanitizeEmailForLog(to) })
        Sentry.captureMessage(`Email send failed: ${emailType}`, {
          level: "error",
          tags: { action: "send_email", email_type: emailType },
          extra: { error: lastError, statusCode: response.status },
        })

        await logToOutbox({
          email_type: emailType,
          to_email: to,
          to_name: toName,
          subject,
          status: "failed",
          provider: "resend",
          error_message: lastError,
          intake_id: intakeId,
          patient_id: patientId,
          certificate_id: certificateId,
          metadata: { ...metadata, attempts: attempt + 1 },
        })

        return { success: false, error: lastError }
      }

      // Success!
      logger.info(`[Email] Sent successfully`, {
        to: sanitizeEmailForLog(to),
        emailType,
        messageId: data.id,
        attempts: attempt + 1,
      })

      const outboxId = await logToOutbox({
        email_type: emailType,
        to_email: to,
        to_name: toName,
        subject,
        status: "sent",
        provider: "resend",
        provider_message_id: data.id,
        intake_id: intakeId,
        patient_id: patientId,
        certificate_id: certificateId,
        metadata: { ...metadata, attempts: attempt + 1 },
        sent_at: new Date().toISOString(),
      })

      return { success: true, messageId: data.id, outboxId: outboxId || undefined }

    } catch (err) {
      lastError = err instanceof Error ? err.message : "Unknown error"
      
      if (isRetryableError(undefined, lastError) && attempt < RETRY_CONFIG.maxRetries) {
        logger.warn(`[Email] Network error, will retry: ${lastError}`, { to, attempt })
        continue
      }
      
      logger.error("[Email] Network error", { error: lastError, emailType })
      Sentry.captureException(err, { tags: { action: "send_email", email_type: emailType } })

      await logToOutbox({
        email_type: emailType,
        to_email: to,
        to_name: toName,
        subject,
        status: "failed",
        provider: "resend",
        error_message: lastError,
        intake_id: intakeId,
        patient_id: patientId,
        certificate_id: certificateId,
        metadata: { ...metadata, attempts: attempt + 1 },
      })

      return { success: false, error: lastError }
    }
  }

  return { success: false, error: lastError || "Max retries exceeded" }
}

// ============================================
// EMPLOYER EMAIL RATE LIMIT CHECK
// ============================================

export async function checkEmployerEmailRateLimit(intakeId: string): Promise<{
  allowed: boolean
  currentCount: number
  resetAt: Date | null
}> {
  try {
    const supabase = createServiceRoleClient()
    const { data, error } = await supabase.rpc("check_employer_email_rate_limit", {
      p_intake_id: intakeId,
    })

    if (error) {
      logger.error("[Email] Rate limit check failed", { error: error.message, intakeId })
      // Fail open - allow the send
      return { allowed: true, currentCount: 0, resetAt: null }
    }

    const result = Array.isArray(data) ? data[0] : data
    return {
      allowed: result?.allowed ?? true,
      currentCount: result?.current_count ?? 0,
      resetAt: result?.reset_at ? new Date(result.reset_at) : null,
    }
  } catch (err) {
    logger.error("[Email] Rate limit check error", { error: err, intakeId })
    return { allowed: true, currentCount: 0, resetAt: null }
  }
}
