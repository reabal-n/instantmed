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
    .select("*")
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
    })

    const html = await renderEmailToHtml(template)
    return { success: true, html }
  }

  // For other email types, we cannot reconstruct without stored template props
  // Mark as failed with clear reason
  return { 
    success: false, 
    error: `Cannot reconstruct email type '${row.email_type}' - no certificate_id or unsupported type` 
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
      .select("*")
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
    const storagePath = `certificates/${cert.intake_id}/${cert.certificate_number}.pdf`
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
