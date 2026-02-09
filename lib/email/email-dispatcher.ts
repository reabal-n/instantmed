import "server-only"

import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { sendFromOutboxRow, claimOutboxRow } from "@/lib/email/send-email"
import { createLogger } from "@/lib/observability/logger"

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

// Email types that the dispatcher can reconstruct and resend
const SUPPORTED_EMAIL_TYPES = [
  "med_cert_patient",
  "script_sent",
  "request_declined",
  "payment_received",
  "prescription_approved",
  "refund_notification",
  "payment_failed",
  "guest_complete_account",
  "welcome",
] as const

function isSupportedEmailType(emailType: string): boolean {
  return SUPPORTED_EMAIL_TYPES.includes(emailType as typeof SUPPORTED_EMAIL_TYPES[number])
}

/**
 * Permanently fail an outbox row so it won't be retried.
 * Sets retry_count=MAX_RETRIES and status=failed with clear error message.
 */
async function permanentlyFailOutboxRow(outboxId: string, errorMessage: string): Promise<void> {
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
  const supabase = createServiceRoleClient()
  
  // Fetch pending/failed emails that might be eligible for retry
  const { data: candidates, error: fetchError } = await supabase
    .from("email_outbox")
    .select("*")
    .in("status", ["pending", "failed"])
    .lt("retry_count", MAX_RETRIES)
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
    .slice(0, MAX_BATCH_SIZE)

  if (eligible.length === 0) {
    return { 
      processed: 0, 
      sent: 0, 
      failed: 0,
      skipped: 0,
      pending: candidates.length,
      message: "All pending emails are in backoff",
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
    if (claimedRow.email_type === "med_cert_patient" && !claimedRow.certificate_id) {
      logger.warn("[Email Dispatcher] med_cert_patient without certificate_id - permanent fail", { id: row.id })
      await permanentlyFailOutboxRow(row.id, "Missing certificate_id - cannot reconstruct email")
      failed++
      results.push({ id: row.id, success: false, error: "Missing certificate_id" })
      continue
    }

    // STEP 3: Check for unsupported email types
    if (!isSupportedEmailType(claimedRow.email_type)) {
      logger.warn("[Email Dispatcher] Unsupported email_type - permanent fail", { id: row.id, type: claimedRow.email_type })
      await permanentlyFailOutboxRow(row.id, `Unsupported email_type: ${claimedRow.email_type}`)
      failed++
      results.push({ id: row.id, success: false, error: `Unsupported email_type: ${claimedRow.email_type}` })
      continue
    }

    // STEP 4: Send the email
    const result = await sendFromOutboxRow(claimedRow)
    
    if (result.success) {
      sent++
    } else {
      failed++
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
 * Get email dispatcher queue stats.
 */
export async function getEmailDispatcherStats(): Promise<{
  pending: number
  failed: number
  exhausted: number
  total: number
}> {
  const supabase = createServiceRoleClient()
  
  const { data: stats } = await supabase
    .from("email_outbox")
    .select("status, retry_count")
    .in("status", ["pending", "failed"])

  const pending = stats?.filter(r => r.status === "pending").length || 0
  const failed = stats?.filter(r => r.status === "failed").length || 0
  const exhausted = stats?.filter(r => r.retry_count >= MAX_RETRIES).length || 0

  return {
    pending,
    failed,
    exhausted,
    total: stats?.length || 0,
  }
}
