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
  | "prescription_approved"
  | "ed_approved"
  | "hair_loss_approved"
  | "womens_health_approved"
  | "weight_loss_approved"
  | "consult_approved"
  | "generic"
  // Database-template email types (sent via template-sender, retried via dispatcher)
  | "payment_received"
  | "refund_notification"
  | "payment_failed"
  | "guest_complete_account"
  | "payment_confirmed"

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
// OUTBOX LOGGING (Two-Phase Write)
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
  last_attempt_at?: string
  retry_count?: number
}

/**
 * Create a pending outbox row BEFORE attempting to send.
 * This ensures we have a record even if the process crashes mid-send.
 * Does NOT store email body - dispatcher will reconstruct from intake/certificate data.
 */
async function createPendingOutbox(entry: Omit<OutboxEntry, "status">): Promise<string | null> {
  try {
    const supabase = createServiceRoleClient()
    const { data, error } = await supabase
      .from("email_outbox")
      .insert({
        email_type: entry.email_type,
        to_email: entry.to_email,
        to_name: entry.to_name,
        subject: entry.subject,
        status: "pending",
        provider: entry.provider,
        intake_id: entry.intake_id,
        patient_id: entry.patient_id,
        certificate_id: entry.certificate_id,
        metadata: entry.metadata || {},
        last_attempt_at: new Date().toISOString(),
        retry_count: 0,
      })
      .select("id")
      .single()

    if (error) {
      logger.error("[Email] Failed to create pending outbox", { error: error.message })
      return null
    }
    return data?.id || null
  } catch (err) {
    logger.error("[Email] Pending outbox error", { error: err })
    return null
  }
}

/**
 * Atomically claim an outbox row for processing.
 * Uses UPDATE with WHERE to prevent duplicate processing by concurrent dispatchers.
 * 
 * CONCURRENCY SAFETY:
 * - Only one process can successfully claim a row (atomic UPDATE)
 * - If another cron/admin already claimed it, this returns false
 * - Row is set to 'sending' status during processing
 * 
 * Returns: { claimed: true, row } if successfully claimed, { claimed: false } otherwise
 */
export async function claimOutboxRow(outboxId: string): Promise<{
  claimed: boolean
  row?: OutboxRow
  error?: string
}> {
  const supabase = createServiceRoleClient()
  
  // Atomic claim: UPDATE only if status is still pending/failed
  // This prevents race conditions between concurrent dispatchers
  const { data, error } = await supabase
    .from("email_outbox")
    .update({
      status: "sending",
      last_attempt_at: new Date().toISOString(),
    })
    .in("status", ["pending", "failed"])
    .eq("id", outboxId)
    .select("id, email_type, to_email, to_name, subject, status, provider, provider_message_id, error_message, retry_count, intake_id, patient_id, certificate_id, metadata, created_at, sent_at, last_attempt_at")
    .single()

  if (error) {
    // Row was already claimed by another process or doesn't exist
    if (error.code === "PGRST116") {
      return { claimed: false, error: "Already claimed or not found" }
    }
    logger.warn("[Email] Failed to claim outbox row", { outboxId, error: error.message })
    return { claimed: false, error: error.message }
  }

  return { claimed: true, row: data as OutboxRow }
}

/**
 * Update an existing outbox row after send attempt.
 */
async function updateOutboxStatus(
  outboxId: string,
  status: "sent" | "failed" | "skipped_e2e",
  details: {
    provider_message_id?: string
    error_message?: string
    attempts?: number
  }
): Promise<void> {
  try {
    const supabase = createServiceRoleClient()
    const updateData: Record<string, unknown> = {
      status,
      last_attempt_at: new Date().toISOString(),
    }
    
    if (status === "sent") {
      updateData.sent_at = new Date().toISOString()
      updateData.provider_message_id = details.provider_message_id
      updateData.error_message = null
    } else if (status === "failed") {
      updateData.error_message = details.error_message
    }
    
    if (details.attempts !== undefined) {
      updateData.retry_count = details.attempts
    }

    const { error } = await supabase
      .from("email_outbox")
      .update(updateData)
      .eq("id", outboxId)

    if (error) {
      logger.error("[Email] Failed to update outbox status", { outboxId, error: error.message })
    }
  } catch (err) {
    logger.error("[Email] Outbox update error", { outboxId, error: err })
  }
}

/**
 * Legacy function for immediate status logging (validation failures, E2E mode, dev mode).
 */
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
        last_attempt_at: entry.last_attempt_at || new Date().toISOString(),
        retry_count: entry.retry_count || 0,
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
  }

  // TWO-PHASE WRITE: Create pending outbox row BEFORE attempting send
  // This ensures we have a record for the dispatcher to retry if process crashes
  // Body is NOT stored - dispatcher reconstructs from intake/certificate data
  const outboxId = await createPendingOutbox({
    email_type: emailType,
    to_email: to,
    to_name: toName,
    subject,
    provider: "resend",
    intake_id: intakeId,
    patient_id: patientId,
    certificate_id: certificateId,
    metadata,
  })

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

      // TWO-PHASE WRITE: Update existing row to sent
      if (outboxId) {
        await updateOutboxStatus(outboxId, "sent", {
          provider_message_id: data.id,
          attempts: attempt + 1,
        })
      }

      return { success: true, messageId: data.id, outboxId: outboxId || undefined }

    } catch (err) {
      lastError = err instanceof Error ? err.message : "Unknown error"
      
      if (isRetryableError(undefined, lastError) && attempt < RETRY_CONFIG.maxRetries) {
        logger.warn(`[Email] Network error, will retry: ${lastError}`, { to, attempt })
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

export interface OutboxRow {
  id: string
  email_type: EmailType
  to_email: string
  to_name: string | null
  subject: string
  status: string
  retry_count: number
  last_attempt_at: string | null
  intake_id: string | null
  patient_id: string | null
  certificate_id: string | null
  metadata: Record<string, unknown> | null
}

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
    html = reconstructed.html!
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
  const body: Record<string, unknown> = {
    from: env.resendFromEmail,
    to: [row.to_email],
    subject: row.subject,
    html,
    text: textBody,
    reply_to: "support@instantmed.com.au",
    tags: [{ name: "email_type", value: row.email_type }],
  }

  try {
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
      const error = data.error?.message || "Failed to send email"
      logger.error("[Email Dispatcher] Send failed", { outboxId: row.id, error })
      
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

/**
 * Reconstruct email HTML from intake/certificate data based on email_type.
 * Also handles PDF generation for certificates that need it (needs_pdf_generation in metadata).
 */
async function reconstructEmailContent(row: OutboxRow): Promise<{
  success: boolean
  html?: string
  text?: string
  error?: string
}> {
  const supabase = createServiceRoleClient()

  // Handle med_cert_patient emails
  if (row.email_type === "med_cert_patient" && row.certificate_id) {
    // Check if PDF needs to be generated first
    const metadata = row.metadata as { needs_pdf_generation?: boolean } | null
    if (metadata?.needs_pdf_generation) {
      const pdfResult = await generateAndUploadPdfForCertificate(row.certificate_id, row.metadata)
      if (!pdfResult.success) {
        return { success: false, error: pdfResult.error || "PDF generation failed" }
      }
    }

    // Fetch certificate and patient data
    const { data: cert, error: certError } = await supabase
      .from("issued_certificates")
      .select("intake_id, patient_name, verification_code, certificate_type")
      .eq("id", row.certificate_id)
      .single()

    if (certError || !cert) {
      return { success: false, error: "Certificate not found for retry" }
    }

    // Render the template
    const { MedCertPatientEmail } = await import("@/components/email/templates")
    const dashboardUrl = `${env.appUrl}/patient/intakes/${cert.intake_id}`
    
    const template = MedCertPatientEmail({
      patientName: cert.patient_name,
      dashboardUrl,
      verificationCode: cert.verification_code,
      certType: cert.certificate_type as "work" | "study" | "carer",
      appUrl: env.appUrl,
    })

    const html = await renderEmailToHtml(template)
    return { success: true, html }
  }

  // ----------------------------------------------------------------
  // Helper: fetch intake + patient + service data for reconstruction
  // ----------------------------------------------------------------
  async function fetchIntakeContext(intakeId: string) {
    const { data: intake, error: intakeError } = await supabase
      .from("intakes")
      .select("id, patient_id, service_id, reference_number, amount_cents, paid_at, decline_reason, decline_reason_note, refund_amount_cents, parchment_reference")
      .eq("id", intakeId)
      .single()

    if (intakeError || !intake) {
      return { error: `Intake not found: ${intakeId}` } as const
    }

    const { data: patient, error: patientError } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("id", intake.patient_id)
      .single()

    if (patientError || !patient) {
      return { error: `Patient not found for intake: ${intakeId}` } as const
    }

    const { data: service, error: serviceError } = await supabase
      .from("services")
      .select("id, name, short_name, slug, type")
      .eq("id", intake.service_id)
      .single()

    if (serviceError || !service) {
      return { error: `Service not found for intake: ${intakeId}` } as const
    }

    // Fetch answers from intake_answers table (separate from intakes)
    const { data: intakeAnswersRow } = await supabase
      .from("intake_answers")
      .select("answers")
      .eq("intake_id", intakeId)
      .single()
    const answers = (intakeAnswersRow?.answers || {}) as Record<string, unknown>

    return { intake: { ...intake, answers }, patient, service } as const
  }

  // ----------------------------------------------------------------
  // Helper: fetch a database-stored email template and fill merge tags
  // ----------------------------------------------------------------
  async function renderDatabaseTemplate(
    templateSlug: string,
    mergeData: Record<string, string>,
  ): Promise<{ success: boolean; html?: string; error?: string }> {
    const { data: tpl, error: tplError } = await supabase
      .from("email_templates")
      .select("body_html, available_tags")
      .eq("slug", templateSlug)
      .eq("is_active", true)
      .single()

    if (tplError || !tpl) {
      return { success: false, error: `Email template '${templateSlug}' not found or inactive` }
    }

    let html = tpl.body_html as string
    for (const [key, value] of Object.entries(mergeData)) {
      const tag = new RegExp(`\\{\\{${key}\\}\\}`, "g")
      html = html.replace(tag, value || "")
    }

    return { success: true, html }
  }

  // ----------------------------------------------------------------
  // welcome — React template, needs only patientName
  // ----------------------------------------------------------------
  if (row.email_type === "welcome") {
    const patientName = row.to_name || "there"

    const { WelcomeEmail } = await import("@/components/email/templates")
    const template = WelcomeEmail({
      patientName,
      appUrl: env.appUrl,
    })

    const html = await renderEmailToHtml(template)
    return { success: true, html }
  }

  // ----------------------------------------------------------------
  // script_sent — React template, needs intake data
  // ----------------------------------------------------------------
  if (row.email_type === "script_sent") {
    if (!row.intake_id) {
      return { success: false, error: "script_sent requires intake_id for reconstruction" }
    }

    const ctx = await fetchIntakeContext(row.intake_id)
    if ("error" in ctx) return { success: false, error: ctx.error }

    const { ScriptSentEmail } = await import("@/components/email/templates")
    const template = ScriptSentEmail({
      patientName: ctx.patient.full_name || row.to_name || "there",
      requestId: ctx.intake.id,
      escriptReference: ctx.intake.parchment_reference || undefined,
      appUrl: env.appUrl,
    })

    const html = await renderEmailToHtml(template)
    return { success: true, html }
  }

  // ----------------------------------------------------------------
  // request_declined — React template, needs intake data + reason
  // ----------------------------------------------------------------
  if (row.email_type === "request_declined") {
    if (!row.intake_id) {
      return { success: false, error: "request_declined requires intake_id for reconstruction" }
    }

    const ctx = await fetchIntakeContext(row.intake_id)
    if ("error" in ctx) return { success: false, error: ctx.error }

    const requestType = ctx.service.short_name || ctx.service.name
    const reason = ctx.intake.decline_reason_note || ctx.intake.decline_reason || undefined

    const { RequestDeclinedEmail } = await import("@/components/email/templates")
    const template = RequestDeclinedEmail({
      patientName: ctx.patient.full_name || row.to_name || "there",
      requestType,
      requestId: ctx.intake.id,
      reason,
      appUrl: env.appUrl,
    })

    const html = await renderEmailToHtml(template)
    return { success: true, html }
  }

  // ----------------------------------------------------------------
  // prescription_approved — React template, needs intake + medication
  // ----------------------------------------------------------------
  if (row.email_type === "prescription_approved") {
    if (!row.intake_id) {
      return { success: false, error: "prescription_approved requires intake_id for reconstruction" }
    }

    const ctx = await fetchIntakeContext(row.intake_id)
    if ("error" in ctx) return { success: false, error: ctx.error }

    const metadata = row.metadata as { medicationName?: string } | null
    const answers = (ctx.intake.answers || {}) as Record<string, unknown>
    const medicationName = metadata?.medicationName
      || String(answers.medicationName || "")
      || ctx.service.short_name
      || "medication"

    const { PrescriptionApprovedEmail } = await import("@/components/email/templates/prescription-approved")
    const template = PrescriptionApprovedEmail({
      patientName: ctx.patient.full_name || row.to_name || "there",
      medicationName,
      intakeId: ctx.intake.id,
      appUrl: env.appUrl,
    })

    const html = await renderEmailToHtml(template)
    return { success: true, html }
  }

  // ----------------------------------------------------------------
  // payment_received — database template with merge tags
  // ----------------------------------------------------------------
  if (row.email_type === "payment_received") {
    if (!row.intake_id) {
      return { success: false, error: "payment_received requires intake_id for reconstruction" }
    }

    const ctx = await fetchIntakeContext(row.intake_id)
    if ("error" in ctx) return { success: false, error: ctx.error }

    const amountCents = ctx.intake.amount_cents || 0
    const amount = `$${(amountCents / 100).toFixed(2)}`
    const serviceName = ctx.service.short_name || ctx.service.name

    return renderDatabaseTemplate("payment_received", {
      patient_name: ctx.patient.full_name || row.to_name || "there",
      amount,
      service_name: serviceName,
    })
  }

  // ----------------------------------------------------------------
  // refund_notification — database template (slug: refund_processed)
  // ----------------------------------------------------------------
  if (row.email_type === "refund_notification") {
    if (!row.intake_id) {
      return { success: false, error: "refund_notification requires intake_id for reconstruction" }
    }

    const ctx = await fetchIntakeContext(row.intake_id)
    if ("error" in ctx) return { success: false, error: ctx.error }

    const refundCents = ctx.intake.refund_amount_cents || ctx.intake.amount_cents || 0
    const amount = `$${(refundCents / 100).toFixed(2)}`
    const reason = ctx.intake.decline_reason || "Refund processed"

    return renderDatabaseTemplate("refund_processed", {
      patient_name: ctx.patient.full_name || row.to_name || "there",
      amount,
      refund_reason: reason,
    })
  }

  // ----------------------------------------------------------------
  // payment_failed — database template with merge tags
  // ----------------------------------------------------------------
  if (row.email_type === "payment_failed") {
    if (!row.intake_id) {
      return { success: false, error: "payment_failed requires intake_id for reconstruction" }
    }

    const ctx = await fetchIntakeContext(row.intake_id)
    if ("error" in ctx) return { success: false, error: ctx.error }

    const serviceName = ctx.service.short_name || ctx.service.name
    const retryUrl = `${env.appUrl}/patient/intakes/${ctx.intake.id}`

    return renderDatabaseTemplate("payment_failed", {
      patient_name: ctx.patient.full_name || row.to_name || "there",
      service_name: serviceName,
      failure_reason: "Your payment could not be processed. Please try again.",
      retry_url: retryUrl,
    })
  }

  // ----------------------------------------------------------------
  // guest_complete_account — database template with merge tags
  // ----------------------------------------------------------------
  if (row.email_type === "guest_complete_account") {
    if (!row.intake_id) {
      return { success: false, error: "guest_complete_account requires intake_id for reconstruction" }
    }

    const ctx = await fetchIntakeContext(row.intake_id)
    if ("error" in ctx) return { success: false, error: ctx.error }

    const serviceName = ctx.service.short_name || ctx.service.name
    const completeAccountUrl = `${env.appUrl}/auth/complete-account?intake_id=${ctx.intake.id}`

    return renderDatabaseTemplate("guest_complete_account", {
      patient_name: ctx.patient.full_name || row.to_name || "there",
      service_name: serviceName,
      intake_id: ctx.intake.id,
      complete_account_url: completeAccountUrl,
    })
  }

  // ----------------------------------------------------------------
  // needs_more_info — lib React template, needs intake + doctor message
  // ----------------------------------------------------------------
  if (row.email_type === "needs_more_info") {
    if (!row.intake_id) {
      return { success: false, error: "needs_more_info requires intake_id for reconstruction" }
    }

    const ctx = await fetchIntakeContext(row.intake_id)
    if ("error" in ctx) return { success: false, error: ctx.error }

    const metadata = row.metadata as { doctorMessage?: string } | null
    const doctorMessage = metadata?.doctorMessage || "Please provide additional information."

    const { NeedsMoreInfoEmail } = await import("@/lib/email/templates/needs-more-info")
    const template = NeedsMoreInfoEmail({
      patientName: ctx.patient.full_name || row.to_name || "there",
      requestType: ctx.service.short_name || ctx.service.name,
      requestId: ctx.intake.id,
      doctorMessage,
    })

    const html = await renderEmailToHtml(template)
    return { success: true, html }
  }

  // ----------------------------------------------------------------
  // consult_approved — component React template
  // ----------------------------------------------------------------
  if (row.email_type === "consult_approved") {
    if (!row.intake_id) {
      return { success: false, error: "consult_approved requires intake_id for reconstruction" }
    }

    const ctx = await fetchIntakeContext(row.intake_id)
    if ("error" in ctx) return { success: false, error: ctx.error }

    const metadata = row.metadata as { doctorNotes?: string } | null

    const { ConsultApprovedEmail } = await import("@/components/email/templates/consult-approved")
    const template = ConsultApprovedEmail({
      patientName: ctx.patient.full_name || row.to_name || "there",
      requestId: ctx.intake.id,
      doctorNotes: metadata?.doctorNotes || undefined,
      appUrl: env.appUrl,
    })

    const html = await renderEmailToHtml(template)
    return { success: true, html }
  }

  // ----------------------------------------------------------------
  // ed_approved — component React template, needs medication name
  // ----------------------------------------------------------------
  if (row.email_type === "ed_approved") {
    if (!row.intake_id) {
      return { success: false, error: "ed_approved requires intake_id for reconstruction" }
    }

    const ctx = await fetchIntakeContext(row.intake_id)
    if ("error" in ctx) return { success: false, error: ctx.error }

    const metadata = row.metadata as { medicationName?: string } | null
    const answers = (ctx.intake.answers || {}) as Record<string, unknown>
    const medicationName = metadata?.medicationName
      || String(answers.medicationName || answers.medication_name || "")
      || "medication"

    const { EdApprovedEmail } = await import("@/components/email/templates/ed-approved")
    const template = EdApprovedEmail({
      patientName: ctx.patient.full_name || row.to_name || "there",
      medicationName,
      requestId: ctx.intake.id,
      appUrl: env.appUrl,
    })

    const html = await renderEmailToHtml(template)
    return { success: true, html }
  }

  // ----------------------------------------------------------------
  // hair_loss_approved — component React template
  // ----------------------------------------------------------------
  if (row.email_type === "hair_loss_approved") {
    if (!row.intake_id) {
      return { success: false, error: "hair_loss_approved requires intake_id for reconstruction" }
    }

    const ctx = await fetchIntakeContext(row.intake_id)
    if ("error" in ctx) return { success: false, error: ctx.error }

    const metadata = row.metadata as { medicationName?: string } | null
    const answers = (ctx.intake.answers || {}) as Record<string, unknown>
    const medicationName = metadata?.medicationName
      || String(answers.medicationName || answers.medication_name || "")
      || "medication"

    const { HairLossApprovedEmail } = await import("@/components/email/templates/hair-loss-approved")
    const template = HairLossApprovedEmail({
      patientName: ctx.patient.full_name || row.to_name || "there",
      medicationName,
      requestId: ctx.intake.id,
      appUrl: env.appUrl,
    })

    const html = await renderEmailToHtml(template)
    return { success: true, html }
  }

  // ----------------------------------------------------------------
  // weight_loss_approved — component React template
  // ----------------------------------------------------------------
  if (row.email_type === "weight_loss_approved") {
    if (!row.intake_id) {
      return { success: false, error: "weight_loss_approved requires intake_id for reconstruction" }
    }

    const ctx = await fetchIntakeContext(row.intake_id)
    if ("error" in ctx) return { success: false, error: ctx.error }

    const metadata = row.metadata as { medicationName?: string } | null
    const answers = (ctx.intake.answers || {}) as Record<string, unknown>
    const medicationName = metadata?.medicationName
      || String(answers.medicationName || answers.medication_name || "")
      || "medication"

    const { WeightLossApprovedEmail } = await import("@/components/email/templates/weight-loss-approved")
    const template = WeightLossApprovedEmail({
      patientName: ctx.patient.full_name || row.to_name || "there",
      medicationName,
      requestId: ctx.intake.id,
      appUrl: env.appUrl,
    })

    const html = await renderEmailToHtml(template)
    return { success: true, html }
  }

  // ----------------------------------------------------------------
  // womens_health_approved — component React template
  // ----------------------------------------------------------------
  if (row.email_type === "womens_health_approved") {
    if (!row.intake_id) {
      return { success: false, error: "womens_health_approved requires intake_id for reconstruction" }
    }

    const ctx = await fetchIntakeContext(row.intake_id)
    if ("error" in ctx) return { success: false, error: ctx.error }

    const metadata = row.metadata as { medicationName?: string; treatmentType?: string } | null
    const answers = (ctx.intake.answers || {}) as Record<string, unknown>
    const medicationName = metadata?.medicationName
      || String(answers.medicationName || answers.medication_name || "")
      || "medication"

    const { WomensHealthApprovedEmail } = await import("@/components/email/templates/womens-health-approved")
    const template = WomensHealthApprovedEmail({
      patientName: ctx.patient.full_name || row.to_name || "there",
      medicationName,
      treatmentType: metadata?.treatmentType || undefined,
      requestId: ctx.intake.id,
      appUrl: env.appUrl,
    })

    const html = await renderEmailToHtml(template)
    return { success: true, html }
  }

  // ----------------------------------------------------------------
  // med_cert_employer — component React template, needs cert + employer data
  // ----------------------------------------------------------------
  if (row.email_type === "med_cert_employer") {
    if (!row.certificate_id) {
      return { success: false, error: "med_cert_employer requires certificate_id for reconstruction" }
    }

    const { data: cert, error: certError } = await supabase
      .from("issued_certificates")
      .select("intake_id, patient_name, verification_code, start_date, end_date, storage_path")
      .eq("id", row.certificate_id)
      .single()

    if (certError || !cert) {
      return { success: false, error: "Certificate not found for employer email reconstruction" }
    }

    // Generate a signed download URL (7-day expiry)
    const { data: signedUrlData } = await supabase.storage
      .from("documents")
      .createSignedUrl(cert.storage_path, 60 * 60 * 24 * 7)

    const downloadUrl = signedUrlData?.signedUrl || `${env.appUrl}/api/certificates/${row.certificate_id}/download`

    // Employer info from metadata or intake answers
    const metadata = row.metadata as { employerName?: string; companyName?: string; patientNote?: string } | null

    const { MedCertEmployerEmail } = await import("@/components/email/templates/med-cert-employer")
    const template = MedCertEmployerEmail({
      patientName: cert.patient_name,
      downloadUrl,
      verificationCode: cert.verification_code,
      certStartDate: cert.start_date,
      certEndDate: cert.end_date,
      employerName: metadata?.employerName || undefined,
      companyName: metadata?.companyName || undefined,
      patientNote: metadata?.patientNote || undefined,
      appUrl: env.appUrl,
    })

    const html = await renderEmailToHtml(template)
    return { success: true, html }
  }

  // ----------------------------------------------------------------
  // payment_confirmed — lib React template, needs intake + amount
  // ----------------------------------------------------------------
  if (row.email_type === "payment_confirmed") {
    if (!row.intake_id) {
      return { success: false, error: "payment_confirmed requires intake_id for reconstruction" }
    }

    const ctx = await fetchIntakeContext(row.intake_id)
    if ("error" in ctx) return { success: false, error: ctx.error }

    const metadata = row.metadata as { amount_cents?: number; service_slug?: string } | null
    const amountCents = metadata?.amount_cents || 0
    const amountFormatted = amountCents > 0 ? `$${(amountCents / 100).toFixed(2)}` : "N/A"
    const serviceName = metadata?.service_slug
      ?.replace(/-/g, " ")
      ?.replace(/\b\w/g, (c: string) => c.toUpperCase())
      || ctx.service.short_name || ctx.service.name || "medical request"

    const { PaymentConfirmedEmail } = await import("@/lib/email/templates/payment-confirmed")
    const template = PaymentConfirmedEmail({
      patientName: ctx.patient.full_name || row.to_name || "there",
      requestType: serviceName,
      amount: amountFormatted,
      requestId: ctx.intake.id,
    })

    const html = await renderEmailToHtml(template)
    return { success: true, html }
  }

  // Fallback: unrecognized email type
  return {
    success: false,
    error: `Cannot reconstruct email type '${row.email_type}' - unsupported type`
  }
}

/**
 * Generate PDF for a certificate and upload to storage.
 * Called by the email dispatcher when metadata.needs_pdf_generation is true.
 */
async function generateAndUploadPdfForCertificate(
  certificateId: string,
  _metadata: Record<string, unknown> | null // Data now fetched from certificate record
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceRoleClient()

  try {
    // Fetch certificate with all needed fields
    const { data: cert, error: certError } = await supabase
      .from("issued_certificates")
      .select("id, intake_id, certificate_number, verification_code, certificate_type, status, issue_date, start_date, end_date, patient_id, patient_name, patient_dob, doctor_id, doctor_name, doctor_nominals, doctor_provider_number, doctor_ahpra_number, template_id, template_version, template_config_snapshot, clinic_identity_snapshot, storage_path, pdf_hash, file_size_bytes, created_at, updated_at")
      .eq("id", certificateId)
      .single()

    if (certError || !cert) {
      return { success: false, error: "Certificate not found" }
    }

    // Skip if PDF already generated (storage_path doesn't start with 'pending:')
    if (!cert.storage_path.startsWith("pending:")) {
      logger.info("[Email Dispatcher] PDF already exists, skipping generation", { certificateId })
      return { success: true }
    }

    // Calculate duration days
    const startDate = new Date(cert.start_date)
    const endDate = new Date(cert.end_date)
    const durationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1

    // Build render input matching CertificateRenderInput interface
    const renderInput = {
      certificateNumber: cert.certificate_number,
      verificationCode: cert.verification_code,
      certificateType: cert.certificate_type as "work" | "study" | "carer",
      patientName: cert.patient_name,
      patientDob: cert.patient_dob,
      issueDate: cert.issue_date,
      startDate: cert.start_date,
      endDate: cert.end_date,
      durationDays,
      doctorProfileId: cert.doctor_id,
      generatedAt: new Date().toISOString(),
    }

    // Generate PDF using canonical render function
    const { renderMedCertPdf } = await import("@/lib/pdf/med-cert-render")
    const result = await renderMedCertPdf(renderInput)

    if (!result.success || !result.buffer) {
      logger.error("[Email Dispatcher] PDF render failed", { certificateId, error: result.error })
      return { success: false, error: result.error || "PDF render failed" }
    }

    // Upload to storage
    const storagePath = `med-certs/${cert.patient_id}/${cert.certificate_number}.pdf`
    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(storagePath, result.buffer, {
        contentType: "application/pdf",
        upsert: true,
      })

    if (uploadError) {
      logger.error("[Email Dispatcher] PDF upload failed", { certificateId, error: uploadError.message })
      return { success: false, error: `PDF upload failed: ${uploadError.message}` }
    }

    // Update certificate with real storage path and snapshots
    const { error: updateError } = await supabase
      .from("issued_certificates")
      .update({ 
        storage_path: storagePath,
        template_config_snapshot: result.templateConfig || cert.template_config_snapshot,
        clinic_identity_snapshot: result.clinicIdentity || cert.clinic_identity_snapshot,
      })
      .eq("id", certificateId)

    if (updateError) {
      logger.error("[Email Dispatcher] Certificate update failed", { certificateId, error: updateError.message })
      // Don't fail - PDF exists, can be fixed later
    }

    logger.info("[Email Dispatcher] PDF generated and uploaded", { certificateId, storagePath })
    return { success: true }

  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    logger.error("[Email Dispatcher] PDF generation error", { certificateId, error })
    Sentry.captureException(err, {
      tags: { component: "email_dispatcher", action: "pdf_generation", certificate_id: certificateId },
    })
    return { success: false, error }
  }
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
