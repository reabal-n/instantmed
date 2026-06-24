import "server-only"

import * as Sentry from "@sentry/nextjs"

import { claimOutboxRow } from "@/lib/email/send/outbox"
import { MARKETING_EMAIL_TYPES } from "@/lib/email/send/types"
import { sendFromOutboxRow } from "@/lib/email/send-email"
import { checkDailySendLimit, incrementDailySendCount } from "@/lib/email/warmup"
import { createLogger } from "@/lib/observability/logger"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const logger = createLogger("email-dispatcher")

/**
 * Email Dispatcher Core Logic
 * 
 * Fetches pending/failed emails from email_outbox and retries sending.
 * Uses atomic claiming to prevent duplicate sends.
 * 
 * Backoff schedule (by retry_count):
 * 0: immediate, 1: 1m, 2: 2m, 3: 5m, 4: 10m, 5: 30m, 6: 60m, 7+: hourly
 */

export const MAX_BATCH_SIZE = 25
export const MAX_RETRIES = 10

// Backoff schedule in minutes
const BACKOFF_MINUTES = [0, 1, 2, 5, 10, 30, 60, 60, 60, 60]
const STALE_SENDING_MINUTES = 15

// Email types that the dispatcher can reconstruct and resend.
// MUST match the types handled by reconstructEmailContent() in send/reconstruct.ts
// — parity is pinned by email-dispatcher-reconstruct-parity-contract.test.ts so a
// type can't be claimed "supported" here without a reconstruct branch (the bug
// that silently dropped cron-owned retries + Sentry-warned them).
export const SUPPORTED_EMAIL_TYPES = [
  // Core approvals & outcomes
  "med_cert_patient",
  "med_cert_employer",
  "script_sent",
  "request_declined",
  "prescription_approved",
  "consult_approved",
  "ed_approved",
  "hair_loss_approved",
  "weight_loss_approved",
  "womens_health_approved",
  "needs_more_info",
  // Payments
  "payment_received",
  "refund_notification",
  "payment_failed",
  "payment_confirmed",
  "refund_issued",
  // Lifecycle
  "welcome",
  "guest_complete_account",
  "intake_submitted",
  "request_received",
  "request_approved",
  "still_reviewing",
  "payment_retry",
  "verification_code",
  // Engagement & retention
  "referral_credit",
] as const

function isSupportedEmailType(emailType: string): boolean {
  return SUPPORTED_EMAIL_TYPES.includes(emailType as typeof SUPPORTED_EMAIL_TYPES[number])
}

// One-off marketing emails owned by their own cron/route (refill-reminder cron,
// heard-about-us backfill route). They are NOT reconstructable by the generic
// dispatcher and must NOT be retried here — the cron self-heals on its next
// eligible run. We still permanently-fail the outbox row, but at info level so
// it is not treated (and Sentry-alerted) as a reconstruct anomaly.
export const CRON_OWNED_NON_RECONSTRUCTABLE = new Set<string>([
  "refill_reminder",
  "cert_reactivation",
  "heard_about_us_backfill",
  // Abandoned-intake recovery is sent directly by its own cron; a deferred/retry
  // outbox copy is not reconstructable here. Was permanently-failing + Sentry-
  // warning as "Unsupported email_type" while the cron delivered it fine.
  "partial_intake_recovery",
  // Abandoned-checkout + day-2 review-request are also cron-owned: their crons
  // own the (re)send and reconstruct.ts has no branch for them, so a stray outbox
  // copy must quiet-fail here instead of burning retries + Sentry-warning. Moved
  // out of SUPPORTED_EMAIL_TYPES (2026-06-24, R1) where they had silently failed
  // STEP 4 reconstruction on every retry.
  "abandoned_checkout",
  "abandoned_checkout_followup",
  "review_request",
])

/**
 * Permanently fail an outbox row so it won't be retried.
 * Sets retry_count=MAX_RETRIES and status=failed with clear error message.
 * Fires a Sentry warning so exhausted emails are visible in error monitoring.
 */
async function permanentlyFailOutboxRow(outboxId: string, errorMessage: string, context?: { emailType?: string; toEmail?: string; intakeId?: string | null }): Promise<void> {
  const supabase = createServiceRoleClient()
  await supabase
    .from("email_outbox")
    .update({
      status: "failed",
      retry_count: MAX_RETRIES,
      error_message: errorMessage,
      last_attempt_at: new Date().toISOString(),
    })
    .eq("id", outboxId)

  // Alert: permanently failed emails need ops visibility
  Sentry.captureMessage(`Email permanently failed after ${MAX_RETRIES} retries: ${errorMessage}`, {
    level: "warning",
    tags: { subsystem: "email-dispatcher", email_type: context?.emailType ?? "unknown" },
    extra: { outboxId, intakeId: context?.intakeId ?? null },
  })
  logger.error("[Email Dispatcher] Email permanently failed - exhausted all retries", {
    outboxId,
    emailType: context?.emailType,
    intakeId: context?.intakeId,
    error: errorMessage,
  })
}

/**
 * Permanently fail an outbox row WITHOUT a Sentry warning. For cron-owned one-off
 * emails the generic dispatcher cannot reconstruct (refill reminder, heard-about-us,
 * partial-intake recovery): their owning cron handles the resend, so an
 * unreconstructable outbox copy is expected — not a reconstruct anomaly worth alerting.
 */
async function quietlyFailOutboxRow(outboxId: string, errorMessage: string): Promise<void> {
  const supabase = createServiceRoleClient()
  await supabase
    .from("email_outbox")
    .update({
      status: "failed",
      retry_count: MAX_RETRIES,
      error_message: errorMessage,
      last_attempt_at: new Date().toISOString(),
    })
    .eq("id", outboxId)
}

function getBackoffMinutes(retryCount: number): number {
  if (retryCount >= BACKOFF_MINUTES.length) return 60
  return BACKOFF_MINUTES[retryCount]
}

function isEligibleForRetry(row: { retry_count: number; last_attempt_at: string | null }): boolean {
  if (row.retry_count >= MAX_RETRIES) return false
  if (!row.last_attempt_at) return true
  
  const lastAttempt = new Date(row.last_attempt_at)
  const backoffMs = getBackoffMinutes(row.retry_count) * 60 * 1000
  const eligibleAt = new Date(lastAttempt.getTime() + backoffMs)
  
  return new Date() >= eligibleAt
}

function isMarketingEmailType(emailType: string): boolean {
  return MARKETING_EMAIL_TYPES.has(emailType as Parameters<typeof MARKETING_EMAIL_TYPES.has>[0])
}

async function recoverStaleSendingRows(): Promise<number> {
  const supabase = createServiceRoleClient()
  const staleBefore = new Date(Date.now() - STALE_SENDING_MINUTES * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from("email_outbox")
    .update({
      status: "failed",
      error_message: "Recovered from stale sending claim",
      last_attempt_at: new Date().toISOString(),
    })
    .eq("status", "sending")
    .lt("last_attempt_at", staleBefore)
    .select("id")

  if (error) {
    logger.warn("[Email Dispatcher] Failed to recover stale sending rows", { error: error.message })
    return 0
  }

  const recovered = data?.length ?? 0
  if (recovered > 0) {
    logger.warn("[Email Dispatcher] Recovered stale sending rows", { recovered })
    Sentry.captureMessage("Recovered stale email_outbox sending claims", {
      level: "warning",
      tags: { subsystem: "email-dispatcher", alert_type: "stale_sending_recovered" },
      extra: { recovered },
    })
  }

  return recovered
}

export interface DispatcherResult {
  processed: number
  sent: number
  failed: number
  skipped: number
  pending?: number
  message?: string
  results: Array<{ id: string; success: boolean; error?: string; skipped?: boolean }>
}

/**
 * Process pending/failed emails from email_outbox.
 * This is the core dispatcher logic used by both cron and ops routes.
 */
export async function processEmailDispatch(): Promise<DispatcherResult> {
  await recoverStaleSendingRows()

  // Respect domain warmup for marketing only. Transactional clinical/payment
  // delivery must continue even when launch warmup is capped.
  const warmup = await checkDailySendLimit()
  const marketingPaused = !warmup.allowed
  if (marketingPaused) {
    logger.info("[Email Dispatcher] Skipping batch - daily send limit reached", {
      current: warmup.current,
      limit: warmup.limit,
    })
  }

  const supabase = createServiceRoleClient()

  // Fetch pending/failed emails that might be eligible for retry.
  //
  // DEFERRED SEND: rows with `scheduled_for` in the future are NOT eligible
  // yet; they must wait for the schedule to lapse before the dispatcher
  // claims them. The OR'd filter keeps rows with scheduled_for IS NULL
  // (instant sends, the default) and rows whose scheduled_for has lapsed.
  const nowIso = new Date().toISOString()
  const { data: candidates, error: fetchError } = await supabase
    .from("email_outbox")
    .select("id, email_type, to_email, to_name, subject, status, provider, provider_message_id, error_message, retry_count, intake_id, patient_id, certificate_id, metadata, created_at, sent_at, last_attempt_at, scheduled_for")
    .in("status", ["pending", "failed"])
    .lt("retry_count", MAX_RETRIES)
    .or(`scheduled_for.is.null,scheduled_for.lte.${nowIso}`)
    .order("created_at", { ascending: true })
    .limit(MAX_BATCH_SIZE * 2)

  if (fetchError) {
    logger.error("[Email Dispatcher] Failed to fetch outbox", { error: fetchError.message })
    throw new Error(`Failed to fetch outbox: ${fetchError.message}`)
  }

  if (!candidates || candidates.length === 0) {
    return { processed: 0, sent: 0, failed: 0, skipped: 0, results: [] }
  }

  // Filter by backoff eligibility
  const eligible = candidates
    .filter((row) => isEligibleForRetry(row))
    .filter((row) => !marketingPaused || !isMarketingEmailType(row.email_type))
    .slice(0, MAX_BATCH_SIZE)

  if (eligible.length === 0) {
    return { 
      processed: 0, 
      sent: 0, 
      failed: 0,
      skipped: 0,
      pending: candidates.length,
      message: marketingPaused
        ? `Daily marketing email limit reached (${warmup.current}/${warmup.limit}); no transactional emails eligible`
        : "All pending emails are in backoff",
      results: [],
    }
  }

  logger.info("[Email Dispatcher] Processing batch", { 
    eligible: eligible.length,
    totalPending: candidates.length 
  })

  // Process each eligible email
  // CONCURRENCY SAFETY: We claim each row atomically before processing.
  let sent = 0
  let failed = 0
  let skipped = 0
  const results: DispatcherResult["results"] = []

  for (const row of eligible) {
    // STEP 1: Atomically claim the row (prevents duplicate sends)
    const claim = await claimOutboxRow(row.id)
    if (!claim.claimed) {
      logger.info("[Email Dispatcher] Row already claimed, skipping", { id: row.id })
      skipped++
      results.push({ id: row.id, success: false, skipped: true, error: "Already claimed" })
      continue
    }

    const claimedRow = claim.row!

    // STEP 2: Validate required fields
    const rowContext = { emailType: claimedRow.email_type, toEmail: claimedRow.to_email, intakeId: claimedRow.intake_id }
    if (claimedRow.email_type === "med_cert_patient" && !claimedRow.certificate_id) {
      logger.warn("[Email Dispatcher] med_cert_patient without certificate_id - permanent fail", { id: row.id })
      await permanentlyFailOutboxRow(row.id, "Missing certificate_id - cannot reconstruct email", rowContext)
      failed++
      results.push({ id: row.id, success: false, error: "Missing certificate_id" })
      continue
    }

    // STEP 3: Check for unsupported email types
    if (!isSupportedEmailType(claimedRow.email_type)) {
      const cronOwned = CRON_OWNED_NON_RECONSTRUCTABLE.has(claimedRow.email_type)
      // Cron-owned one-off marketing emails are expected-unsupported: their cron
      // owns the resend, so fail the row quietly (info, no Sentry). Everything
      // else is a genuine reconstruct anomaly that keeps the Sentry-warning path.
      if (cronOwned) {
        logger.info("[Email Dispatcher] Cron-owned email_type not reconstructable - permanent fail (expected)", { id: row.id, type: claimedRow.email_type })
        await quietlyFailOutboxRow(row.id, `Unsupported email_type: ${claimedRow.email_type}`)
      } else {
        logger.warn("[Email Dispatcher] Unsupported email_type - permanent fail", { id: row.id, type: claimedRow.email_type })
        await permanentlyFailOutboxRow(row.id, `Unsupported email_type: ${claimedRow.email_type}`, rowContext)
      }
      failed++
      results.push({ id: row.id, success: false, error: `Unsupported email_type: ${claimedRow.email_type}` })
      continue
    }

    // STEP 4: Send the email
    const result = await sendFromOutboxRow(claimedRow)

    if (result.success) {
      sent++
      if (isMarketingEmailType(claimedRow.email_type)) {
        incrementDailySendCount().catch(() => {})
      }
    } else {
      failed++
      // Alert if this failure just exhausted all retries
      if (claimedRow.retry_count + 1 >= MAX_RETRIES) {
        Sentry.captureMessage(`Email exhausted all ${MAX_RETRIES} retries`, {
          level: "warning",
          tags: { subsystem: "email-dispatcher", email_type: claimedRow.email_type },
          extra: { outboxId: row.id, intakeId: claimedRow.intake_id, lastError: result.error },
        })
        logger.error("[Email Dispatcher] Email exhausted all retries", {
          outboxId: row.id,
          emailType: claimedRow.email_type,
          intakeId: claimedRow.intake_id,
          lastError: result.error,
        })
      }
    }

    results.push({ id: row.id, success: result.success, error: result.error })
  }

  logger.info("[Email Dispatcher] Batch complete", { sent, failed, skipped })

  return {
    processed: eligible.length,
    sent,
    failed,
    skipped,
    results,
  }
}

/**
 * Get email dispatcher queue stats using count queries (no full-table scan).
 */
export async function getEmailDispatcherStats(): Promise<{
  pending: number
  failed: number
  exhausted: number
  total: number
}> {
  const supabase = createServiceRoleClient()

  const [pendingRes, failedRes, exhaustedRes] = await Promise.all([
    supabase
      .from("email_outbox")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("email_outbox")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed")
      .lt("retry_count", MAX_RETRIES),
    supabase
      .from("email_outbox")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed")
      .gte("retry_count", MAX_RETRIES),
  ])

  const pending = pendingRes.count || 0
  const failed = failedRes.count || 0
  const exhausted = exhaustedRes.count || 0

  return {
    pending,
    failed,
    exhausted,
    total: pending + failed + exhausted,
  }
}
