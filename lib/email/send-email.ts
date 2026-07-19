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
import { getEmployerCertificateStorageVersion } from "@/lib/crypto/employer-certificate-token"
import { signEmailUnsubscribeToken, signUnsubscribeToken } from "@/lib/crypto/unsubscribe-token"
import { getMarketingEmailDecision } from "@/lib/email/preferences"
import { EMAIL_DISPATCHER_MAX_RETRIES } from "@/lib/email/retry-policy"
import {
  evaluateReviewRequestPolicy,
  markReviewRequestCommunicationOutcome,
} from "@/lib/email/review-request-policy"
import { getEmailSuppressionDecisions } from "@/lib/email/suppression"
import { reconcileCertificateEmailDelivery } from "@/lib/medical-certificates/email-delivery-reconciliation"
import { recordDeliverySent } from "@/lib/monitoring/delivery-tracking"
import { logger } from "@/lib/observability/logger"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

import { renderEmailToHtml } from "./react-renderer-server"
import { reconstructEmailContent } from "./send/reconstruct"
import {
  getEmailBounceSuppressionDecision,
  htmlToPlainText,
  isEmailSuppressed,
} from "./utils"
import { checkDailySendLimit, incrementDailySendCount } from "./warmup"

// Re-export types for backwards compatibility
// Note: Only async functions can be exported from "use server" files.
// Non-async re-exports must be imported directly from their source modules:
//   MARKETING_EMAIL_TYPES → "@/lib/email/send/types"
//   claimOutboxRow → "@/lib/email/send/outbox"
//   reconstructEmailContent → "@/lib/email/send/reconstruct"
export type { EmailType, OutboxRow, SendEmailParams, SendEmailResult } from "./send/types"

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
import { buildResendEmailIdempotencyKey } from "./send/idempotency"
import {
  createPendingOutbox,
  deferOutboxRow,
  logToOutbox,
  persistFrozenProviderPayload,
  updateOutboxStatus,
} from "./send/outbox"
import {
  freezeResendProviderPayload,
  FROZEN_PROVIDER_PAYLOAD_KEY,
  hasFrozenResendProviderPayload,
  readFrozenResendProviderPayload,
  type ResendProviderPayload,
} from "./send/provider-payload"
import type {
  CommunicationOutcome,
  EmailType,
  OutboxRow,
  SendEmailParams,
  SendEmailResult,
} from "./send/types"
import { MARKETING_EMAIL_TYPES } from "./send/types"

interface ResendResponseData {
  id?: string
  message?: string
  error?: { message?: string }
  name?: string
}

async function readResendResponseData(response: Response): Promise<ResendResponseData> {
  const data: unknown = await response.json().catch(() => null)
  return data && typeof data === "object" ? data as ResendResponseData : {}
}

type MarketingDeliveryDecision =
  | { kind: "allowed" }
  | { kind: "policy_suppressed"; reason: string }
  | { kind: "transiently_blocked"; reason: string }

async function getMarketingDeliveryDecision(
  emailType: EmailType,
  patientId: string | undefined | null,
  toEmail: string,
): Promise<MarketingDeliveryDecision> {
  if (!MARKETING_EMAIL_TYPES.has(emailType)) return { kind: "allowed" }

  const bounceDecision = await getEmailBounceSuppressionDecision(toEmail)
  if (bounceDecision.kind === "policy_suppressed") {
    return { kind: "policy_suppressed", reason: "address_bounced_or_complained" }
  }
  if (bounceDecision.kind === "transiently_blocked") {
    return { kind: "transiently_blocked", reason: "bounce_lookup_or_soft_bounce" }
  }

  // Address-level suppression always runs even when a patient profile exists.
  const normalizedEmail = toEmail.trim().toLowerCase()
  const addressDecision = (await getEmailSuppressionDecisions([toEmail]))
    .get(normalizedEmail) ?? { kind: "transiently_blocked" as const }
  if (addressDecision.kind === "policy_suppressed") {
    return { kind: "policy_suppressed", reason: "address_suppressed" }
  }
  if (addressDecision.kind === "transiently_blocked") {
    return { kind: "transiently_blocked", reason: "address_suppression_read_failed" }
  }

  if (patientId) {
    const preferenceDecision = await getMarketingEmailDecision(patientId)
    if (preferenceDecision.kind === "policy_suppressed") {
      return { kind: "policy_suppressed", reason: "marketing_opt_out" }
    }
    if (preferenceDecision.kind === "transiently_blocked") {
      return { kind: "transiently_blocked", reason: "preference_read_failed" }
    }
  }

  return { kind: "allowed" }
}

function providerFailureOutcome(input: {
  error: string
  retryable: boolean
  outboxId?: string | null
}): CommunicationOutcome {
  return {
    kind: "provider_failed",
    error: input.error,
    retryable: input.retryable,
    ...(input.outboxId ? { outboxId: input.outboxId } : {}),
  }
}

function transientRetryAt(minutes = 5): string {
  return new Date(Date.now() + minutes * 60 * 1000).toISOString()
}

function transientOutcome(input: {
  reason: string
  retryAt?: string
}): CommunicationOutcome {
  return {
    kind: "transiently_blocked",
    reason: input.reason,
    ...(input.retryAt ? { retryAt: input.retryAt } : {}),
  }
}

async function deferReviewInfrastructureFailure(
  row: OutboxRow,
  reason: string,
  error: string,
): Promise<{
  success: false
  error: string
  outcome: CommunicationOutcome
} | null> {
  if (row.email_type !== "review_request") return null

  const retryAt = transientRetryAt()
  const deferred = await deferOutboxRow(row.id, retryAt, error)
  return {
    success: false,
    error: deferred ? error : "Failed to defer review request",
    outcome: transientOutcome({
      reason: deferred ? reason : "outbox_deferral_failed",
      ...(deferred ? { retryAt } : {}),
    }),
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
    unsubscribeEmail,
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

    return {
      success: false,
      error,
      suppressed: MARKETING_EMAIL_TYPES.has(emailType),
      ...(emailType === "review_request"
        ? {
            outcome: {
              kind: "policy_suppressed",
              reason: "invalid_recipient",
            } satisfies CommunicationOutcome,
          }
        : {}),
    }
  }

  // Render React template to HTML, then inject signed unsubscribe URL
  let html: string
  try {
    html = injectUnsubscribeUrl(await renderEmailToHtml(template), patientId, unsubscribeEmail)
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

    return {
      success: false,
      error,
      ...(emailType === "review_request"
        ? {
            outcome: transientOutcome({
              reason: "template_render_failed",
            }),
          }
        : {}),
    }
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
      ...(emailType === "review_request"
        ? {}
        : { sent_at: new Date().toISOString() }),
    })

    return {
      success: true,
      messageId: `e2e-${Date.now()}`,
      outboxId: outboxId || undefined,
      skipped: true,
      ...(emailType === "review_request"
        ? {
            outcome: {
              kind: "pending",
              ...(outboxId ? { outboxId } : {}),
            } satisfies CommunicationOutcome,
          }
        : {}),
    }
  }

  // DEV MODE: non-review mail keeps the legacy log-only behavior. Review
  // requests need a durable pending row so a restored provider key can retry.
  const apiKey = env.resendApiKey
  if (!apiKey && emailType !== "review_request") {
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

    return {
      success: true,
      messageId: `dev-${Date.now()}`,
      outboxId: outboxId || undefined,
    }
  }

  // Transactional sends keep the legacy boolean bounce gate. Marketing sends
  // use the detailed final policy decision after their durable row exists.
  const suppressed = !MARKETING_EMAIL_TYPES.has(emailType) &&
    await isEmailSuppressed(to)
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

    return {
      success: false,
      error,
      suppressed: MARKETING_EMAIL_TYPES.has(emailType),
    }
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

    return {
      success: false,
      error,
      ...(emailType === "review_request"
        ? {
            outcome: {
              kind: "transiently_blocked",
              reason: "marketing_warmup_limit",
              retryAt: transientRetryAt(60),
            } satisfies CommunicationOutcome,
          }
        : {}),
    }
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

  // Auto-inject headers for marketing emails (Australian Spam Act + RFC 8058).
  // Recipients without a profile (e.g. draft recovery) get an email-keyed
  // token so the one-click unsubscribe works for them too.
  if (MARKETING_EMAIL_TYPES.has(emailType)) {
    body.headers = {
      ...(body.headers as Record<string, string> || {}),
      "Precedence": "bulk", // Reduces auto-reply storms, signals bulk mail to ESPs
    }
    if (patientId || unsubscribeEmail) {
      try {
        const unsubToken = patientId
          ? signUnsubscribeToken(patientId)
          : signEmailUnsubscribeToken(unsubscribeEmail!)
        const appUrl = env.appUrl
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

  let frozenProviderPayload: string
  try {
    frozenProviderPayload = freezeResendProviderPayload(body)
  } catch (error) {
    logger.error("[Email] Failed to encrypt provider payload", {
      emailType,
      certificateId,
      intakeId,
    })
    Sentry.captureException(error, {
      tags: { action: "freeze_email_provider_payload", email_type: emailType },
    })
    return {
      success: false,
      error: "Failed to secure the email delivery record; please retry.",
      retryable: false,
      ...(emailType === "review_request"
        ? {
            outcome: transientOutcome({
              reason: "provider_payload_freeze_failed",
            }),
          }
        : {}),
    }
  }

  // TWO-PHASE WRITE: Create pending outbox row BEFORE attempting send
  // This ensures we have a record for the dispatcher to retry if process crashes
  // The exact provider body is encrypted before storage. Reconstructing HTML,
  // dynamic tokens, or tags later can produce a different request body; Resend
  // rejects that under the same idempotency key and an ambiguous success can no
  // longer be resolved safely.
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
    metadata: {
      ...metadata,
      [FROZEN_PROVIDER_PAYLOAD_KEY]: frozenProviderPayload,
    },
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
        ...(emailType === "review_request"
          ? {
              outcome: transientOutcome({
                reason: "outbox_write_failed",
              }),
            }
          : {}),
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
      ...(emailType === "review_request"
        ? {
            outcome: {
              kind: "pending",
              outboxId,
              scheduledFor,
            } satisfies CommunicationOutcome,
          }
        : {}),
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
    const reviewDuplicateOutcome = emailType === "review_request"
      ? outboxResult.existingStatus === "sent"
        ? {
            kind: "sent" as const,
            ...(outboxId ? { outboxId } : {}),
          }
        : outboxResult.existingStatus === "failed"
          ? providerFailureOutcome({
              error: "Existing review request delivery exhausted retries",
              retryable: false,
              outboxId,
            })
          : {
              kind: "pending" as const,
              ...(outboxId ? { outboxId } : {}),
            }
      : undefined
    return {
      success: !(
        emailType === "review_request" &&
        outboxResult.existingStatus === "failed"
      ),
      messageId: outboxId ? `duplicate-outbox-${outboxId}` : undefined,
      outboxId: outboxId || undefined,
      skipped: true,
      ...(reviewDuplicateOutcome ? { outcome: reviewDuplicateOutcome } : {}),
    }
  }

  // A provider send without its durable outbox row cannot be safely retried:
  // an ambiguous network response could deliver twice and leave no stable key
  // for the dispatcher. Fail before contacting Resend instead.
  if (!outboxId) {
    logger.error("[Email] Provider send blocked because outbox creation failed", {
      emailType,
      certificateId,
      intakeId,
    })
    return {
      success: false,
      error: "Failed to create the email delivery record; please retry.",
      ...(emailType === "review_request"
        ? {
            outcome: transientOutcome({ reason: "outbox_write_failed" }),
          }
        : {}),
    }
  }

  if (!apiKey) {
    const error = "No Resend API key configured"
    const retryAt = transientRetryAt()
    const deferred = await deferOutboxRow(outboxId, retryAt, error)
    return {
      success: false,
      error: deferred ? error : "Failed to defer review request",
      outboxId,
      retryable: true,
      outcome: transientOutcome({
        reason: deferred
          ? "provider_configuration_missing"
          : "outbox_deferral_failed",
        ...(deferred ? { retryAt } : {}),
      }),
    }
  }

  const providerIdempotencyKey = buildResendEmailIdempotencyKey(outboxId)
  const providerBody = readFrozenResendProviderPayload({
    [FROZEN_PROVIDER_PAYLOAD_KEY]: outboxResult.providerPayloadEnc ?? frozenProviderPayload,
  })
  if (!providerBody) {
    const error = "Encrypted provider payload could not be read"
    if (emailType === "review_request") {
      const retryAt = transientRetryAt()
      const deferred = await deferOutboxRow(outboxId, retryAt, error)
      return {
        success: false,
        error: deferred ? error : "Failed to defer review request",
        outboxId,
        retryable: true,
        outcome: transientOutcome({
          reason: deferred
            ? "provider_payload_read_failed"
            : "outbox_deferral_failed",
          ...(deferred ? { retryAt } : {}),
        }),
      }
    }
    await updateOutboxStatus(outboxId, "failed", {
      error_message: error,
      attempts: EMAIL_DISPATCHER_MAX_RETRIES,
    })
    return {
      success: false,
      error: "The email delivery record could not be opened safely.",
      outboxId,
      retryable: false,
    }
  }

  // DEBUG: Log outbox write result - critical for diagnosing missing outbox rows
  logger.info("OUTBOX_ROW_CREATED", { outboxId, emailType, certificateId, intakeId })

  // Send with retries
  let lastError: string | undefined
  const persistedCertificateStorageVersion = outboxResult.certificateStorageVersion ?? (
    typeof metadata.certificate_storage_version === "string"
      ? metadata.certificate_storage_version
      : undefined
  )

  for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    let providerAttempted = false
    try {
      if (attempt > 0) {
        const delay = getRetryDelay(attempt - 1)
        logger.info(`[Email] Retry ${attempt}/${RETRY_CONFIG.maxRetries} after ${delay}ms`, {
          to: sanitizeEmailForLog(to),
          emailType,
        })
        await sleep(delay)
      }

      const certificateValidation = await validateCertificateEmailReference({
        emailType,
        certificateId,
        expectedStorageVersion: persistedCertificateStorageVersion,
      })
      if (!certificateValidation.success) {
        lastError = certificateValidation.error || "Certificate email could not be validated"
        const retryable = !certificateValidation.terminal
        if (retryable && attempt < RETRY_CONFIG.maxRetries) {
          continue
        }

        await updateOutboxStatus(outboxId, "failed", {
          error_message: lastError,
          attempts: retryable ? attempt + 1 : EMAIL_DISPATCHER_MAX_RETRIES,
        })
        return {
          success: false,
          error: lastError,
          outboxId,
          retryable,
        }
      }

      if (emailType === "review_request") {
        const reviewDecision = intakeId
          ? await evaluateReviewRequestPolicy({
              intakeId,
              expectedRecipient: to,
              currentOutboxId: outboxId,
            })
          : {
              kind: "policy_suppressed" as const,
              reason: "request_missing",
            }
        if (reviewDecision.kind === "transiently_blocked") {
          const retryAt = reviewDecision.retryAt ?? transientRetryAt()
          const deferred = await deferOutboxRow(
            outboxId,
            retryAt,
            reviewDecision.reason,
          )
          return {
            success: false,
            error: deferred ? undefined : "Failed to defer review request",
            outboxId,
            retryable: true,
            outcome: deferred
              ? reviewDecision
              : transientOutcome({
                  reason: "outbox_deferral_failed",
                }),
          }
        }
        if (reviewDecision.kind === "policy_suppressed") {
          const marked = intakeId
            ? await markReviewRequestCommunicationOutcome(
                intakeId,
                reviewDecision,
              )
            : reviewDecision
          if (marked.kind === "transiently_blocked") {
            const retryAt = marked.retryAt ?? transientRetryAt()
            const deferred = await deferOutboxRow(
              outboxId,
              retryAt,
              marked.reason,
            )
            return {
              success: false,
              error: deferred ? undefined : "Failed to defer review request",
              outboxId,
              retryable: true,
              outcome: deferred
                ? { ...marked, retryAt }
                : transientOutcome({
                    reason: "outbox_deferral_failed",
                  }),
            }
          }
          const error = `Suppressed before delivery: ${reviewDecision.reason}`
          await updateOutboxStatus(outboxId, "failed", {
            error_message: error,
            attempts: EMAIL_DISPATCHER_MAX_RETRIES,
          })
          return {
            success: false,
            error,
            outboxId,
            retryable: false,
            suppressed: true,
            outcome: reviewDecision,
          }
        }
      }

      // Address suppression runs before profile consent on every provider
      // attempt, including a dispatcher replay.
      const marketingDecision = emailType === "review_request"
        ? { kind: "allowed" as const }
        : await getMarketingDeliveryDecision(emailType, patientId, to)
      if (marketingDecision.kind === "transiently_blocked") {
        const retryAt = transientRetryAt()
        const deferred = await deferOutboxRow(
          outboxId,
          retryAt,
          marketingDecision.reason,
        )
        return {
          success: false,
          error: deferred ? undefined : "Failed to defer marketing email",
          outboxId,
          retryable: true,
          outcome: deferred
            ? { ...marketingDecision, retryAt }
            : transientOutcome({
                reason: "outbox_deferral_failed",
              }),
        }
      }
      if (marketingDecision.kind === "policy_suppressed") {
        const error = `Suppressed before delivery: ${marketingDecision.reason}`
        await updateOutboxStatus(outboxId, "failed", {
          error_message: error,
          attempts: EMAIL_DISPATCHER_MAX_RETRIES,
        })
        return {
          success: false,
          error,
          outboxId,
          retryable: false,
          suppressed: true,
          outcome: marketingDecision,
        }
      }

      providerAttempted = true
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": providerIdempotencyKey,
        },
        body: JSON.stringify(providerBody),
      })

      const data = await readResendResponseData(response)

      if (!response.ok) {
        // Resend API returns { message, statusCode, name } at top level, not nested under .error
        lastError = data.message || data.error?.message || `Resend API error (${response.status})`

        const retryable = isRetryableError(response.status, lastError)
        if (retryable && attempt < RETRY_CONFIG.maxRetries) {
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
            attempts: retryable ? attempt + 1 : EMAIL_DISPATCHER_MAX_RETRIES,
          })
        }

        return {
          success: false,
          error: lastError,
          outboxId: outboxId || undefined,
          retryable,
          ...(emailType === "review_request"
            ? {
                outcome: providerFailureOutcome({
                  error: lastError,
                  retryable,
                  outboxId,
                }),
              }
            : {}),
        }
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
      if (data.id) {
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
      }

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
          logger.warn("[Email] incrementDailySendCount failed, warmup counter may under-count", {}, err)
        })
      }

      return {
        success: true,
        messageId: data.id,
        outboxId: outboxId || undefined,
        ...(emailType === "review_request"
          ? {
              outcome: {
                kind: "sent",
                messageId: data.id,
                outboxId,
              } satisfies CommunicationOutcome,
            }
          : {}),
      }

    } catch (err) {
      lastError = err instanceof Error ? err.message : "Unknown error"
      if (emailType === "review_request" && !providerAttempted) {
        const retryAt = transientRetryAt()
        const deferred = await deferOutboxRow(
          outboxId,
          retryAt,
          lastError,
        )
        return {
          success: false,
          error: lastError,
          outboxId,
          retryable: true,
          outcome: transientOutcome({
            reason: deferred
              ? "pre_provider_infrastructure_failed"
              : "outbox_deferral_failed",
            ...(deferred ? { retryAt } : {}),
          }),
        }
      }
      const retryable = isRetryableError(undefined, lastError)

      if (retryable && attempt < RETRY_CONFIG.maxRetries) {
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
          attempts: retryable ? attempt + 1 : EMAIL_DISPATCHER_MAX_RETRIES,
        })
      }

      return {
        success: false,
        error: lastError,
        outboxId: outboxId || undefined,
        retryable,
        ...(emailType === "review_request"
          ? {
              outcome: providerFailureOutcome({
                error: lastError,
                retryable,
                outboxId,
              }),
            }
          : {}),
      }
    }
  }

  // Max retries exceeded - update outbox to failed
  if (outboxId) {
    await updateOutboxStatus(outboxId, "failed", {
      error_message: lastError || "Max retries exceeded",
      attempts: RETRY_CONFIG.maxRetries + 1,
    })
  }

  return {
    success: false,
    error: lastError || "Max retries exceeded",
    outboxId: outboxId || undefined,
    retryable: true,
    ...(emailType === "review_request"
      ? {
          outcome: providerFailureOutcome({
            error: lastError || "Max retries exceeded",
            retryable: true,
            outboxId,
          }),
        }
      : {}),
  }
}

// ============================================
// DISPATCHER: SEND FROM OUTBOX ROW
// ============================================

function resendAttemptId(row: OutboxRow): string | null {
  const value = row.metadata?.resend_attempt_id
  return typeof value === "string" && value.length > 0 ? value : null
}

async function finalizeOutboxCertificateResend(
  row: OutboxRow,
  input: {
    deliverySucceeded: boolean
    providerMessageId?: string | null
    failureReason?: string | null
  },
): Promise<boolean> {
  const attemptId = resendAttemptId(row)
  if (!attemptId) return true

  try {
    const { finalizeCertificateResend } = await import("@/lib/data/issued-certificates")
    const result = await finalizeCertificateResend({
      attemptId,
      deliverySucceeded: input.deliverySucceeded,
      emailOutboxId: row.id,
      providerMessageId: input.providerMessageId,
      failureReason: input.failureReason,
    })
    if (result.success) return true

    logger.error("[Email Dispatcher] Certificate resend finalization failed", {
      outboxId: row.id,
      certificateId: row.certificate_id,
      deliverySucceeded: input.deliverySucceeded,
    })
    Sentry.captureMessage("Certificate resend outbox finalization failed", {
      level: "error",
      tags: { subsystem: "certificate-resend-reconciliation" },
      extra: {
        outboxId: row.id,
        certificateId: row.certificate_id,
        deliverySucceeded: input.deliverySucceeded,
      },
    })
    return false
  } catch (error) {
    logger.error("[Email Dispatcher] Certificate resend finalization threw", {
      outboxId: row.id,
      certificateId: row.certificate_id,
      error: error instanceof Error ? error.message : String(error),
    })
    return false
  }
}

async function finalizeOutboxFailure(
  row: OutboxRow,
  failureReason: string,
  attempts: number,
  terminal = false,
  certificateStorageVersion?: string,
): Promise<boolean> {
  if (!terminal && attempts < EMAIL_DISPATCHER_MAX_RETRIES) return true

  if (resendAttemptId(row)) {
    return finalizeOutboxCertificateResend(row, {
      deliverySucceeded: false,
      failureReason,
    })
  }

  if (
    row.email_type === "med_cert_patient" &&
    row.certificate_id &&
    row.intake_id &&
    certificateStorageVersion
  ) {
    const result = await reconcileCertificateEmailDelivery({
      intakeId: row.intake_id,
      certificateId: row.certificate_id,
      expectedStorageVersion: certificateStorageVersion,
      outcome: "failed",
      failureReason,
      outboxId: row.id,
      actorId: null,
      actorRole: "system",
      source: "outbox_dispatcher",
    })
    return result.success
  }

  return true
}

interface CertificateEmailReferenceValidation {
  success: boolean
  error?: string
  terminal?: boolean
  certificateStorageVersion?: string
  certificateIntakeId?: string
}

async function validateCertificateEmailReference(input: {
  emailType: string
  certificateId?: string | null
  expectedStorageVersion?: string
}): Promise<CertificateEmailReferenceValidation> {
  if (!["med_cert_patient", "med_cert_employer"].includes(input.emailType)) {
    return { success: true }
  }
  if (!input.certificateId) {
    return { success: false, error: "Certificate email has no certificate", terminal: true }
  }

  const supabase = createServiceRoleClient()
  const { data: certificate, error: certificateError } = await supabase
    .from("issued_certificates")
    .select("id, intake_id, status, storage_path")
    .eq("id", input.certificateId)
    .maybeSingle()

  if (certificateError) {
    return { success: false, error: "Certificate could not be checked before email delivery" }
  }
  if (!certificate || certificate.status !== "valid") {
    return { success: false, error: "Certificate is no longer valid for email delivery", terminal: true }
  }

  const { data: currentCertificate, error: currentCertificateError } = await supabase
    .from("issued_certificates")
    .select("id")
    .eq("intake_id", certificate.intake_id)
    .eq("status", "valid")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (currentCertificateError) {
    return { success: false, error: "Current certificate could not be checked before email delivery" }
  }
  if (!currentCertificate || currentCertificate.id !== certificate.id) {
    return { success: false, error: "Certificate is no longer current for email delivery", terminal: true }
  }

  if (
    input.expectedStorageVersion &&
    input.expectedStorageVersion !== getEmployerCertificateStorageVersion(certificate.storage_path)
  ) {
    return {
      success: false,
      error: "Certificate email belongs to an older document version",
      terminal: true,
    }
  }

  return {
    success: true,
    certificateIntakeId: certificate.intake_id,
    certificateStorageVersion: getEmployerCertificateStorageVersion(
      certificate.storage_path,
    ),
  }
}

async function validateCertificateOutboxRow(
  row: OutboxRow,
): Promise<CertificateEmailReferenceValidation> {
  const expectedStorageVersion = row.metadata?.certificate_storage_version
  return validateCertificateEmailReference({
    emailType: row.email_type,
    certificateId: row.certificate_id,
    expectedStorageVersion: typeof expectedStorageVersion === "string"
      ? expectedStorageVersion
      : undefined,
  })
}

/**
 * Reconstruct and send an email from an outbox row (used by dispatcher).
 * Fetches intake/certificate data to re-render the template.
 * Updates the row with new status after attempt.
 */
export async function sendFromOutboxRow(row: OutboxRow): Promise<{
  success: boolean
  error?: string
  suppressed?: boolean
  outcome?: CommunicationOutcome
  finalizationError?: string
}> {
  const apiKey = env.resendApiKey
  if (!apiKey) {
    logger.warn("[Email Dispatcher] No API key, skipping", { outboxId: row.id })
    const reviewFailure = await deferReviewInfrastructureFailure(
      row,
      "provider_configuration_missing",
      "No API key configured",
    )
    if (reviewFailure) return reviewFailure
    return { success: false, error: "No API key configured" }
  }

  const certificateValidation = await validateCertificateOutboxRow(row)
  if (!certificateValidation.success) {
    const error = certificateValidation.error || "Certificate email could not be validated"
    const attempts = certificateValidation.terminal
      ? EMAIL_DISPATCHER_MAX_RETRIES
      : row.retry_count + 1
    await updateOutboxStatus(row.id, "failed", { error_message: error, attempts })
    await finalizeOutboxFailure(row, error, attempts, Boolean(certificateValidation.terminal))
    return { success: false, error }
  }

  // Transactional rows keep the legacy boolean bounce gate. Marketing rows
  // use the detailed final policy check immediately before the provider.
  const suppressed = !MARKETING_EMAIL_TYPES.has(row.email_type) &&
    await isEmailSuppressed(row.to_email)
  if (suppressed) {
    const attempts = EMAIL_DISPATCHER_MAX_RETRIES
    await updateOutboxStatus(row.id, "failed", {
      error_message: "Email address previously bounced or complained",
      attempts,
    })
    await finalizeOutboxFailure(
      row,
      "Email address previously bounced or complained",
      attempts,
      true,
      certificateValidation.certificateStorageVersion,
    )
    return {
      success: false,
      error: "Email suppressed",
      suppressed: MARKETING_EMAIL_TYPES.has(row.email_type),
    }
  }

  let sendBody: ResendProviderPayload
  if (hasFrozenResendProviderPayload(row.metadata)) {
    const frozenPayload = readFrozenResendProviderPayload(row.metadata)
    if (!frozenPayload) {
      const error = "Encrypted provider payload could not be read"
      const reviewFailure = await deferReviewInfrastructureFailure(
        row,
        "provider_payload_read_failed",
        error,
      )
      if (reviewFailure) return reviewFailure
      await updateOutboxStatus(row.id, "failed", {
        error_message: error,
        attempts: EMAIL_DISPATCHER_MAX_RETRIES,
      })
      await finalizeOutboxFailure(
        row,
        error,
        EMAIL_DISPATCHER_MAX_RETRIES,
        true,
        certificateValidation.certificateStorageVersion,
      )
      return { success: false, error }
    }
    sendBody = frozenPayload
  } else {
    try {
      const reconstructed = await reconstructEmailContent(row)
      if (!reconstructed.success) {
        const error = reconstructed.error || "Failed to reconstruct email"
        const reviewFailure = await deferReviewInfrastructureFailure(
          row,
          "email_reconstruction_failed",
          error,
        )
        if (reviewFailure) return reviewFailure
        const attempts = reconstructed.terminal
          ? EMAIL_DISPATCHER_MAX_RETRIES
          : row.retry_count + 1
        if (reconstructed.terminal) {
          Sentry.captureMessage("Email reconstruction failed terminally", {
            level: "warning",
            tags: {
              email_type: row.email_type,
              subsystem: "email-dispatcher",
            },
            extra: {
              outboxId: row.id,
              intakeId: row.intake_id,
              error,
            },
          })
        }
        await updateOutboxStatus(row.id, "failed", { error_message: error, attempts })
        await finalizeOutboxFailure(
          row,
          error,
          attempts,
          Boolean(reconstructed.terminal),
          certificateValidation.certificateStorageVersion,
        )
        return { success: false, error }
      }

      const html = injectUnsubscribeUrl(reconstructed.html!, row.patient_id || undefined)
      const textBody = reconstructed.text || htmlToPlainText(html)
      sendBody = {
        from: env.resendFromEmail,
        to: [row.to_email],
        subject: row.subject,
        html,
        text: textBody,
        reply_to: CONTACT_EMAIL,
        tags: [{ name: "email_type", value: row.email_type }],
      }

      // Legacy rows predate frozen payloads. Reconstruct their unsubscribe
      // headers once; all new rows replay their encrypted original request.
      if (MARKETING_EMAIL_TYPES.has(row.email_type)) {
        sendBody.headers = { "Precedence": "bulk" }
        try {
          const unsubToken = row.patient_id
            ? signUnsubscribeToken(row.patient_id)
            : signEmailUnsubscribeToken(row.to_email)
          const unsubUrl = `${env.appUrl}/api/unsubscribe?token=${unsubToken}&type=marketing`
          ;(sendBody.headers as Record<string, string>)["List-Unsubscribe"] = `<${unsubUrl}>`
          ;(sendBody.headers as Record<string, string>)["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click"
        } catch {
          // Non-blocking
        }
      }

      // Legacy rows predate frozen provider bodies. Persist this first
      // reconstruction before contacting Resend so any ambiguous or retryable
      // response replays the exact same body under the same idempotency key.
      let encryptedPayload: string
      try {
        encryptedPayload = freezeResendProviderPayload(sendBody)
      } catch {
        const error = "Could not secure reconstructed email for retry"
        const reviewFailure = await deferReviewInfrastructureFailure(
          row,
          "provider_payload_freeze_failed",
          error,
        )
        if (reviewFailure) return reviewFailure
        const attempts = row.retry_count + 1
        await updateOutboxStatus(row.id, "failed", { error_message: error, attempts })
        await finalizeOutboxFailure(
          row,
          error,
          attempts,
          false,
          certificateValidation.certificateStorageVersion,
        )
        return { success: false, error }
      }

      const payloadPersisted = await persistFrozenProviderPayload(
        row.id,
        {
          ...(row.metadata ?? {}),
          ...(certificateValidation.certificateStorageVersion
            ? { certificate_storage_version: certificateValidation.certificateStorageVersion }
            : {}),
        },
        encryptedPayload,
      )
      if (!payloadPersisted) {
        const error = "Could not freeze reconstructed email before delivery"
        const reviewFailure = await deferReviewInfrastructureFailure(
          row,
          "provider_payload_write_failed",
          error,
        )
        if (reviewFailure) return reviewFailure
        const attempts = row.retry_count + 1
        await updateOutboxStatus(row.id, "failed", { error_message: error, attempts })
        await finalizeOutboxFailure(
          row,
          error,
          attempts,
          false,
          certificateValidation.certificateStorageVersion,
        )
        return { success: false, error }
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : "Reconstruction failed"
      const reviewFailure = await deferReviewInfrastructureFailure(
        row,
        "email_reconstruction_failed",
        error,
      )
      if (reviewFailure) return reviewFailure
      const attempts = row.retry_count + 1
      logger.error("[Email Dispatcher] Failed to reconstruct email", { outboxId: row.id, error })
      await updateOutboxStatus(row.id, "failed", { error_message: error, attempts })
      await finalizeOutboxFailure(
        row,
        error,
        attempts,
        false,
        certificateValidation.certificateStorageVersion,
      )
      return { success: false, error }
    }
  }

  let providerAttempted = false
  try {
    const providerIdempotencyKey = buildResendEmailIdempotencyKey(row.id)
    const preProviderCertificateValidation = await validateCertificateEmailReference({
      emailType: row.email_type,
      certificateId: row.certificate_id,
      expectedStorageVersion: certificateValidation.certificateStorageVersion,
    })
    if (!preProviderCertificateValidation.success) {
      const error = preProviderCertificateValidation.error ||
        "Certificate email could not be validated before delivery"
      const terminal = Boolean(preProviderCertificateValidation.terminal)
      const attempts = terminal
        ? EMAIL_DISPATCHER_MAX_RETRIES
        : row.retry_count + 1
      await updateOutboxStatus(row.id, "failed", { error_message: error, attempts })
      await finalizeOutboxFailure(row, error, attempts, terminal)
      return { success: false, error }
    }

    if (row.email_type === "review_request") {
      const reviewDecision = row.intake_id
        ? await evaluateReviewRequestPolicy({
            intakeId: row.intake_id,
            expectedRecipient: row.to_email,
            currentOutboxId: row.id,
          })
        : {
            kind: "policy_suppressed" as const,
            reason: "request_missing",
          }
      if (reviewDecision.kind === "transiently_blocked") {
        const retryAt = reviewDecision.retryAt ?? transientRetryAt()
        const deferred = await deferOutboxRow(
          row.id,
          retryAt,
          reviewDecision.reason,
        )
        return {
          success: false,
          error: deferred ? undefined : "Failed to defer review request",
          suppressed: false,
          outcome: deferred
            ? reviewDecision
            : transientOutcome({
                reason: "outbox_deferral_failed",
              }),
        }
      }
      if (reviewDecision.kind === "policy_suppressed") {
        const marked = row.intake_id
          ? await markReviewRequestCommunicationOutcome(
              row.intake_id,
              reviewDecision,
            )
          : reviewDecision
        if (marked.kind === "transiently_blocked") {
          const retryAt = marked.retryAt ?? transientRetryAt()
          await deferOutboxRow(row.id, retryAt, marked.reason)
          return { success: false, outcome: { ...marked, retryAt } }
        }
        const error = `Suppressed before delivery: ${reviewDecision.reason}`
        await updateOutboxStatus(row.id, "failed", {
          error_message: error,
          attempts: EMAIL_DISPATCHER_MAX_RETRIES,
        })
        logger.info("[Email Dispatcher] Review request suppressed before retry", {
          outboxId: row.id,
          intakeId: row.intake_id,
        })
        return {
          success: false,
          error,
          suppressed: true,
          outcome: reviewDecision,
        }
      }
    }

    // This is intentionally the final asynchronous policy check before the
    // provider call. It catches an unsubscribe made after the row was queued.
    const marketingDecision = row.email_type === "review_request"
      ? { kind: "allowed" as const }
      : await getMarketingDeliveryDecision(
          row.email_type,
          row.patient_id,
          row.to_email,
        )
    if (marketingDecision.kind === "transiently_blocked") {
      const retryAt = transientRetryAt()
      const deferred = await deferOutboxRow(
        row.id,
        retryAt,
        marketingDecision.reason,
      )
      return {
        success: false,
        error: deferred ? undefined : "Failed to defer marketing email",
        outcome: deferred
          ? { ...marketingDecision, retryAt }
          : transientOutcome({
              reason: "outbox_deferral_failed",
            }),
      }
    }
    if (marketingDecision.kind === "policy_suppressed") {
      const error = `Suppressed before delivery: ${marketingDecision.reason}`
      await updateOutboxStatus(row.id, "failed", {
        error_message: error,
        attempts: EMAIL_DISPATCHER_MAX_RETRIES,
      })
      logger.info("[Email Dispatcher] Marketing email suppressed before retry", {
        outboxId: row.id,
        emailType: row.email_type,
      })
      return {
        success: false,
        error,
        suppressed: true,
        outcome: marketingDecision,
      }
    }

    providerAttempted = true
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": providerIdempotencyKey,
      },
      body: JSON.stringify(sendBody),
    })

    const data = await readResendResponseData(response)

    if (!response.ok) {
      // Resend API returns { message, statusCode, name } at top level, not nested under .error
      const error = data.message || data.error?.message || `Resend API error (${response.status})`
      logger.error("[Email Dispatcher] Send failed", { outboxId: row.id, error, statusCode: response.status, resendErrorName: data.name })

      const retryable = isRetryableError(response.status, error)
      const attempts = retryable
        ? row.retry_count + 1
        : EMAIL_DISPATCHER_MAX_RETRIES
      await updateOutboxStatus(row.id, "failed", {
        error_message: error,
        attempts,
      })
      await finalizeOutboxFailure(
        row,
        error,
        attempts,
        !retryable,
        preProviderCertificateValidation.certificateStorageVersion,
      )

      return {
        success: false,
        error,
        ...(row.email_type === "review_request"
          ? {
              outcome: providerFailureOutcome({
                error,
                retryable,
                outboxId: row.id,
              }),
            }
          : {}),
      }
    }

    logger.info("[Email Dispatcher] Sent successfully", {
      outboxId: row.id,
      messageId: data.id,
    })

    const sentOutcome: CommunicationOutcome = {
      kind: "sent",
      messageId: data.id,
      outboxId: row.id,
    }
    const sentPersisted = await updateOutboxStatus(row.id, "sent", {
      provider_message_id: data.id,
      attempts: row.retry_count + 1,
    })

    if (sentPersisted === false && row.email_type === "review_request") {
      Sentry.captureMessage("Review request outbox sent state needs reconciliation", {
        level: "error",
        tags: {
          subsystem: "email-dispatcher",
          email_type: row.email_type,
        },
        extra: { outboxId: row.id, intakeId: row.intake_id },
      })
      return {
        success: true,
        outcome: sentOutcome,
        finalizationError: "outbox_sent_persistence_failed",
      }
    }

    if (row.email_type === "review_request" && row.intake_id) {
      try {
        const marked = await markReviewRequestCommunicationOutcome(
          row.intake_id,
          sentOutcome,
        )
        if (marked.kind !== "transiently_blocked") {
          return {
            success: true,
            outcome: sentOutcome,
          }
        }
        Sentry.captureMessage("Review request sent marker needs reconciliation", {
          level: "error",
          tags: {
            subsystem: "email-dispatcher",
            email_type: "review_request",
          },
          extra: {
            intakeId: row.intake_id,
            outboxId: row.id,
            reason: marked.reason,
          },
        })
        return {
          success: true,
          outcome: sentOutcome,
          finalizationError: marked.reason,
        }
      } catch (error) {
        logger.error("[Email Dispatcher] Review request sent marker threw", {
          outboxId: row.id,
          intakeId: row.intake_id,
          error: error instanceof Error ? error.message : String(error),
        })
        Sentry.captureException(error, {
          tags: {
            subsystem: "email-dispatcher",
            email_type: "review_request",
          },
          extra: { outboxId: row.id, intakeId: row.intake_id },
        })
        return {
          success: true,
          outcome: sentOutcome,
          finalizationError: "review_marker_write_failed",
        }
      }
    }

    // Mirror the dispatcher send onto the cert delivery state so the
    // CertHealthChip and patient timeline stay accurate for deferred sends
    // (e.g. cert approval undo window). Reconciliation retries only its two
    // bookkeeping writes; the provider request above is never repeated here.
    if (row.certificate_id && row.email_type === "med_cert_patient") {
      try {
        if (resendAttemptId(row)) {
          await finalizeOutboxCertificateResend(row, {
            deliverySucceeded: true,
            providerMessageId: data.id,
          })
        } else if (
          preProviderCertificateValidation.certificateIntakeId &&
          preProviderCertificateValidation.certificateStorageVersion
        ) {
          await reconcileCertificateEmailDelivery({
            intakeId: preProviderCertificateValidation.certificateIntakeId,
            certificateId: row.certificate_id,
            expectedStorageVersion: preProviderCertificateValidation.certificateStorageVersion,
            outcome: "sent",
            providerMessageId: data.id,
            outboxId: row.id,
            actorId: null,
            actorRole: "system",
            source: "outbox_dispatcher",
          })
        }
      } catch (mirrorErr) {
        logger.warn("[Email Dispatcher] Failed to mirror send onto issued_certificates", {
          outboxId: row.id,
          certificateId: row.certificate_id,
          error: mirrorErr instanceof Error ? mirrorErr.message : String(mirrorErr),
        })
      }
    }

    return {
      success: true,
      ...(row.email_type === "review_request"
        ? { outcome: sentOutcome }
        : {}),
    }
  } catch (err) {
    const error = err instanceof Error ? err.message : "Unknown error"
    if (row.email_type === "review_request" && !providerAttempted) {
      const reviewFailure = await deferReviewInfrastructureFailure(
        row,
        "pre_provider_infrastructure_failed",
        error,
      )
      if (reviewFailure) return reviewFailure
    }
    const retryable = isRetryableError(undefined, error)
    const attempts = retryable
      ? row.retry_count + 1
      : EMAIL_DISPATCHER_MAX_RETRIES
    logger.error("[Email Dispatcher] Network error", { outboxId: row.id, error })

    await updateOutboxStatus(row.id, "failed", {
      error_message: error,
      attempts,
    })
    await finalizeOutboxFailure(
      row,
      error,
      attempts,
      !retryable,
      certificateValidation.certificateStorageVersion,
    )

    return {
      success: false,
      error,
      ...(row.email_type === "review_request"
        ? {
            outcome: providerFailureOutcome({
              error,
              retryable,
              outboxId: row.id,
            }),
          }
        : {}),
    }
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
