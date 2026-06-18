import "server-only"

/**
 * Centralized Email Sending Service
 *
 * Routes all transactional emails through a single function that:
 * 1. Renders React email templates to HTML
 * 2. Sends via Resend (or skips in E2E mode)
 * 3. Logs all attempts to email_outbox table
 * 4. Includes Sentry instrumentation
 *
 * Split into sub-modules under ./send/ for maintainability:
 * - types.ts: Type definitions (EmailType, SendEmailParams, etc.)
 * - helpers.ts: Validation, retry, unsubscribe injection
 * - outbox.ts: Outbox DB operations (create, claim, update, log)
 * - reconstruct.ts: Email reconstruction for dispatcher retries
 */
import * as Sentry from "@sentry/nextjs"

import { env } from "@/lib/config/env"
import { CONTACT_EMAIL } from "@/lib/constants"
import { signUnsubscribeToken } from "@/lib/crypto/unsubscribe-token"
import { recordDeliverySent } from "@/lib/monitoring/delivery-tracking"
import { logger } from "@/lib/observability/logger"

import { renderEmailToHtml } from "./react-renderer-server"
import { htmlToPlainText,isEmailSuppressed } from "./utils"
import { checkDailySendLimit, incrementDailySendCount } from "./warmup"

// Re-export types for backwards compatibility
// Note: Only async functions can be exported from "use server" files.
// Non-async re-exports must be imported directly from their source modules:
//   MARKETING_EMAIL_TYPES → "@/lib/email/send/types"
//   claimOutboxRow → "@/lib/email/send/outbox"
//   reconstructEmailContent → "@/lib/email/send/reconstruct"
export type { EmailType, OutboxRow,SendEmailParams, SendEmailResult } from "./send/types"

// Import internals from split modules
import {
  getRetryDelay,
  injectUnsubscribeUrl,
  isE2EMode,
  isRetryableError,
  isValidEmail,
  RETRY_CONFIG,
  sanitizeEmailForLog,
  sleep,
} from "./send/helpers"
import {
  createPendingOutbox,
  logToOutbox,
  updateOutboxStatus,
} from "./send/outbox"
import type { SendEmailParams, SendEmailResult } from "./send/types"
import { MARKETING_EMAIL_TYPES } from "./send/types"

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
    replyTo = CONTACT_EMAIL,
    tags = [],
    headers,
    attachments,
    idempotencyKey,
    scheduledFor,
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

  // Render React template to HTML, then inject signed unsubscribe URL
  let html: string
  try {
    html = injectUnsubscribeUrl(await renderEmailToHtml(template), patientId)
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

  // Check daily send limit for marketing warmup only. Transactional clinical
  // and payment emails must not be blocked by a launch deliverability cap.
  const isMarketingEmail = MARKETING_EMAIL_TYPES.has(emailType)
  const warmupCheck = isMarketingEmail
    ? await checkDailySendLimit()
    : { allowed: true, current: 0, limit: 0 }
  if (!warmupCheck.allowed) {
    const error = `Daily marketing email limit reached (${warmupCheck.current}/${warmupCheck.limit})`
    logger.warn("[Email] " + error, { emailType })

    // Log to outbox as failed so dispatcher can retry later
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
      metadata: { ...metadata, warmup_limited: true, warmup_scope: "marketing" },
    })

    return { success: false, error }
  }

  // Build request body
  const textBody = htmlToPlainText(html)
  const body: Record<string, unknown> = {
    from,
    to: [to],
    subject,
    html,
    text: textBody,
    reply_to: replyTo,
    tags: [
      { name: "email_type", value: emailType },
      ...tags,
    ],
    ...(headers && Object.keys(headers).length > 0 && { headers }),
    ...(attachments && attachments.length > 0 && { attachments }),
  }

  // Auto-inject headers for marketing emails (Australian Spam Act + RFC 8058)
  if (MARKETING_EMAIL_TYPES.has(emailType)) {
    body.headers = {
      ...(body.headers as Record<string, string> || {}),
      "Precedence": "bulk", // Reduces auto-reply storms, signals bulk mail to ESPs
    }
    if (patientId) {
      try {
        const unsubToken = signUnsubscribeToken(patientId)
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au"
        const unsubUrl = `${appUrl}/api/unsubscribe?token=${unsubToken}&type=marketing`
        body.headers = {
          ...(body.headers as Record<string, string>),
          "List-Unsubscribe": `<${unsubUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        }
      } catch {
        logger.warn("[Email] Failed to generate unsubscribe token", { emailType })
      }
    }
  }

  // TWO-PHASE WRITE: Create pending outbox row BEFORE attempting send
  // This ensures we have a record for the dispatcher to retry if process crashes
  // Body is NOT stored - dispatcher reconstructs from intake/certificate data
  //
  // DEFERRED SEND: when `scheduledFor` is set to a future timestamp (e.g. the
  // 30s cert approval undo window), we still write the pending row with the
  // schedule applied, then return immediately. The dispatcher skips rows whose
  // scheduled_for is still in the future, so the send fires the next cron tick
  // after the schedule passes. Undoing the queued send is just a DELETE on the
  // outbox row before `scheduled_for` lapses.
  const outboxResult = await createPendingOutbox({
    email_type: emailType,
    to_email: to,
    to_name: toName,
    subject,
    provider: "resend",
    intake_id: intakeId,
    patient_id: patientId,
    certificate_id: certificateId,
    metadata,
    idempotency_key: idempotencyKey,
    scheduled_for: scheduledFor,
    initialStatus: scheduledFor && new Date(scheduledFor).getTime() > Date.now()
      ? "pending"
      : "sending",
  })
  const outboxId = outboxResult.id

  // Short-circuit on deferred send: we leave the row in pending state with
  // scheduled_for set; the dispatcher will pick it up on the next tick after
  // the schedule lapses. Returns success so the caller's UX flow continues.
  //
  // Require a real outbox row id before reporting success. Without a row
  // the dispatcher has nothing to pick up, the patient never gets the
  // email, and the UI silently shows an "Undo" toast for a send that does
  // not exist. Falling through to the synchronous send path is also wrong
  // (the doctor expected a deferred send), so we surface the failure.
  if (scheduledFor && new Date(scheduledFor).getTime() > Date.now()) {
    if (!outboxId) {
      logger.error("[Email] Deferred send requested but outbox insert failed", {
        emailType,
        scheduledFor,
        certificateId,
        intakeId,
        duplicate: outboxResult.duplicate,
      })
      return {
        success: false,
        error: "Failed to queue the deferred email; please retry.",
      }
    }
    logger.info("[Email] Queued for deferred send", {
      outboxId,
      emailType,
      scheduledFor,
      certificateId,
      intakeId,
    })
    return {
      success: true,
      messageId: `deferred-${outboxId}`,
      outboxId,
    }
  }

  if (outboxResult.duplicate) {
    logger.info("[Email] Duplicate send suppressed by outbox guard", {
      outboxId,
      emailType,
      certificateId,
      intakeId,
    })
    Sentry.addBreadcrumb({
      category: "email.outbox",
      message: "Duplicate send suppressed by outbox guard",
      level: "info",
      data: {
        emailType,
        outboxId,
        hasCertificateId: Boolean(certificateId),
        hasIntakeId: Boolean(intakeId),
      },
    })
    return {
      success: true,
      messageId: outboxId ? `duplicate-outbox-${outboxId}` : undefined,
      outboxId: outboxId || undefined,
      skipped: true,
    }
  }

  // DEBUG: Log outbox write result - critical for diagnosing missing outbox rows
  if (outboxId) {
    logger.info("OUTBOX_ROW_CREATED", { outboxId, emailType, certificateId, intakeId })
  } else {
    logger.error("OUTBOX_ROW_FAILED", { emailType, certificateId, intakeId, to: sanitizeEmailForLog(to) })
  }

  // Send with retries
  let lastError: string | undefined

  for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = getRetryDelay(attempt - 1)
        logger.info(`[Email] Retry ${attempt}/${RETRY_CONFIG.maxRetries} after ${delay}ms`, {
          to: sanitizeEmailForLog(to),
          emailType,
        })
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
        // Resend API returns { message, statusCode, name } at top level, not nested under .error
        lastError = data.message || data.error?.message || `Resend API error (${response.status})`

        if (isRetryableError(response.status, lastError) && attempt < RETRY_CONFIG.maxRetries) {
          logger.warn(`[Email] Retryable error (${response.status}): ${lastError}`, {
            to: sanitizeEmailForLog(to),
            emailType,
            attempt,
          })
          continue
        }

        logger.error("[Email] Send failed", { error: lastError, emailType, to: sanitizeEmailForLog(to), statusCode: response.status, resendErrorName: data.name })
        Sentry.captureMessage(`Email send failed: ${emailType}`, {
          level: "error",
          tags: { action: "send_email", email_type: emailType },
          extra: { error: lastError, statusCode: response.status, resendErrorName: data.name },
        })

        // TWO-PHASE WRITE: Update existing row to failed
        if (outboxId) {
          await updateOutboxStatus(outboxId, "failed", {
            error_message: lastError,
            attempts: attempt + 1,
          })
        }

        return { success: false, error: lastError, outboxId: outboxId || undefined }
      }

      // Success!
      logger.info(`[Email] Sent successfully`, {
        to: sanitizeEmailForLog(to),
        emailType,
        messageId: data.id,
        attempts: attempt + 1,
      })

      // Track in PostHog for email->conversion funnels
      try {
        const { getPostHogClient } = await import("@/lib/analytics/posthog-server")
        getPostHogClient().capture({
          distinctId: patientId || "system",
          event: "email_sent",
          properties: {
            email_type: emailType,
            intake_id: intakeId,
            is_marketing: MARKETING_EMAIL_TYPES.has(emailType),
            provider_message_id: data.id,
          },
        })
      } catch {
        // Non-blocking
      }

      // Record delivery for health monitoring
      recordDeliverySent({
        messageId: data.id,
        requestId: intakeId,
        patientId,
        channel: "email",
        templateType: emailType,
        providerId: data.id,
        recipient: to,
      }).catch((err) => {
        // Non-blocking but observable — silent failures corrupt CertHealthChip and ops dashboard.
        logger.warn("[Email] recordDeliverySent failed", { to: sanitizeEmailForLog(to), emailType }, err)
      })

      // TWO-PHASE WRITE: Update existing row to sent
      if (outboxId) {
        await updateOutboxStatus(outboxId, "sent", {
          provider_message_id: data.id,
          attempts: attempt + 1,
        })
      }

      // Increment daily warmup counter for marketing sends only.
      if (isMarketingEmail) {
        incrementDailySendCount().catch((err) => {
          logger.warn("[Email] incrementDailySendCount failed — warmup counter may under-count", {}, err)
        })
      }

      return { success: true, messageId: data.id, outboxId: outboxId || undefined }

    } catch (err) {
      lastError = err instanceof Error ? err.message : "Unknown error"

      if (isRetryableError(undefined, lastError) && attempt < RETRY_CONFIG.maxRetries) {
        logger.warn(`[Email] Network error, will retry: ${lastError}`, {
          to: sanitizeEmailForLog(to),
          emailType,
          attempt,
        })
        continue
      }

      logger.error("[Email] Network error", { error: lastError, emailType })
      Sentry.captureException(err, { tags: { action: "send_email", email_type: emailType } })

      // TWO-PHASE WRITE: Update existing row to failed
      if (outboxId) {
        await updateOutboxStatus(outboxId, "failed", {
          error_message: lastError,
          attempts: attempt + 1,
        })
      }

      return { success: false, error: lastError, outboxId: outboxId || undefined }
    }
  }

  // Max retries exceeded - update outbox to failed
  if (outboxId) {
    await updateOutboxStatus(outboxId, "failed", {
      error_message: lastError || "Max retries exceeded",
      attempts: RETRY_CONFIG.maxRetries + 1,
    })
  }

  return { success: false, error: lastError || "Max retries exceeded", outboxId: outboxId || undefined }
}

// ============================================
// DISPATCHER: SEND FROM OUTBOX ROW
// ============================================

import { reconstructEmailContent } from "./send/reconstruct"
import type { OutboxRow } from "./send/types"

/**
 * Reconstruct and send an email from an outbox row (used by dispatcher).
 * Fetches intake/certificate data to re-render the template.
 * Updates the row with new status after attempt.
 */
export async function sendFromOutboxRow(row: OutboxRow): Promise<{ success: boolean; error?: string }> {
  const apiKey = env.resendApiKey
  if (!apiKey) {
    logger.warn("[Email Dispatcher] No API key, skipping", { outboxId: row.id })
    return { success: false, error: "No API key configured" }
  }

  // Check suppression
  const suppressed = await isEmailSuppressed(row.to_email)
  if (suppressed) {
    await updateOutboxStatus(row.id, "failed", {
      error_message: "Email address previously bounced or complained",
      attempts: row.retry_count + 1,
    })
    return { success: false, error: "Email suppressed" }
  }

  // Reconstruct email content based on email_type
  let html: string
  let textBody: string

  try {
    const reconstructed = await reconstructEmailContent(row)
    if (!reconstructed.success) {
      await updateOutboxStatus(row.id, "failed", {
        error_message: reconstructed.error || "Failed to reconstruct email",
        attempts: row.retry_count + 1,
      })
      return { success: false, error: reconstructed.error }
    }
    html = injectUnsubscribeUrl(reconstructed.html!, row.patient_id || undefined)
    textBody = reconstructed.text || htmlToPlainText(html)
  } catch (err) {
    const error = err instanceof Error ? err.message : "Reconstruction failed"
    logger.error("[Email Dispatcher] Failed to reconstruct email", { outboxId: row.id, error })
    await updateOutboxStatus(row.id, "failed", {
      error_message: error,
      attempts: row.retry_count + 1,
    })
    return { success: false, error }
  }

  // Build request body
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au"
  const sendBody: Record<string, unknown> = {
    from: env.resendFromEmail,
    to: [row.to_email],
    subject: row.subject,
    html,
    text: textBody,
    reply_to: CONTACT_EMAIL,
    tags: [{ name: "email_type", value: row.email_type }],
  }

  // Inject List-Unsubscribe headers for marketing emails on retry (mirrors sendEmail)
  if (MARKETING_EMAIL_TYPES.has(row.email_type)) {
    sendBody.headers = { "Precedence": "bulk" }
    if (row.patient_id) {
      try {
        const unsubToken = signUnsubscribeToken(row.patient_id)
        const unsubUrl = `${appUrl}/api/unsubscribe?token=${unsubToken}&type=marketing`
        ;(sendBody.headers as Record<string, string>)["List-Unsubscribe"] = `<${unsubUrl}>`
        ;(sendBody.headers as Record<string, string>)["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click"
      } catch {
        // Non-blocking
      }
    }
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(sendBody),
    })

    const data = await response.json()

    if (!response.ok) {
      // Resend API returns { message, statusCode, name } at top level, not nested under .error
      const error = data.message || data.error?.message || `Resend API error (${response.status})`
      logger.error("[Email Dispatcher] Send failed", { outboxId: row.id, error, statusCode: response.status, resendErrorName: data.name })

      await updateOutboxStatus(row.id, "failed", {
        error_message: error,
        attempts: row.retry_count + 1,
      })

      return { success: false, error }
    }

    logger.info("[Email Dispatcher] Sent successfully", {
      outboxId: row.id,
      messageId: data.id,
    })

    await updateOutboxStatus(row.id, "sent", {
      provider_message_id: data.id,
      attempts: row.retry_count + 1,
    })

    // Mirror the dispatcher send onto the cert delivery state so the
    // CertHealthChip and patient timeline stay accurate for deferred
    // sends (e.g. cert approval undo window). Fire-and-forget; never block
    // the dispatcher batch on this housekeeping.
    if (row.certificate_id && row.email_type === "med_cert_patient") {
      try {
        const { updateEmailStatus: updateCertEmailStatus } = await import("@/lib/data/issued-certificates")
        await updateCertEmailStatus(row.certificate_id, "sent", { deliveryId: data.id })
      } catch (mirrorErr) {
        logger.warn("[Email Dispatcher] Failed to mirror send onto issued_certificates", {
          outboxId: row.id,
          certificateId: row.certificate_id,
          error: mirrorErr instanceof Error ? mirrorErr.message : String(mirrorErr),
        })
      }
    }

    return { success: true }
  } catch (err) {
    const error = err instanceof Error ? err.message : "Unknown error"
    logger.error("[Email Dispatcher] Network error", { outboxId: row.id, error })

    await updateOutboxStatus(row.id, "failed", {
      error_message: error,
      attempts: row.retry_count + 1,
    })

    return { success: false, error }
  }
}

// ============================================
// EMPLOYER EMAIL RATE LIMIT CHECK
// ============================================

import { createServiceRoleClient } from "@/lib/supabase/service-role"

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
