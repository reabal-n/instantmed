/**
 * Document Generation Retry Queue
 * 
 * Handles retrying failed PDF generation attempts with exponential backoff.
 * Uses the database as a persistent queue to survive server restarts.
 */

import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createLogger } from "@/lib/observability/logger"
import * as Sentry from "@sentry/nextjs"

const logger = createLogger("document-retry-queue")

const MAX_RETRIES = 3
const INITIAL_DELAY_MS = 5000 // 5 seconds
const MAX_DELAY_MS = 60000    // 1 minute

export interface RetryableDocument {
  intakeId: string
  documentType: "med_cert" | "pathology" | "prescription"
  subtype?: string
  attemptCount: number
  lastError?: string
  nextRetryAt: Date
}

/**
 * Queue a document for retry after generation failure
 */
export async function queueDocumentRetry(
  intakeId: string,
  documentType: "med_cert" | "pathology" | "prescription",
  error: Error,
  subtype?: string
): Promise<void> {
  const supabase = createServiceRoleClient()

  // Check existing retry record
  const { data: existing } = await supabase
    .from("document_generation_retries")
    .select("attempt_count")
    .eq("intake_id", intakeId)
    .eq("document_type", documentType)
    .single()

  const attemptCount = (existing?.attempt_count ?? 0) + 1

  if (attemptCount > MAX_RETRIES) {
    logger.error("Document generation max retries exceeded", {
      intakeId,
      documentType,
      attemptCount,
    })

    // Alert operations team
    Sentry.captureMessage("Document generation permanently failed", {
      level: "error",
      tags: {
        source: "document-retry-queue",
        alert_type: "action_required",
      },
      extra: {
        intakeId,
        documentType,
        attemptCount,
        lastError: error.message,
      },
    })

    // Mark as permanently failed
    await supabase
      .from("document_generation_retries")
      .upsert({
        intake_id: intakeId,
        document_type: documentType,
        subtype,
        status: "permanently_failed",
        attempt_count: attemptCount,
        last_error: error.message,
        updated_at: new Date().toISOString(),
      })

    return
  }

  // Calculate next retry time with exponential backoff
  const delay = Math.min(INITIAL_DELAY_MS * Math.pow(2, attemptCount - 1), MAX_DELAY_MS)
  const nextRetryAt = new Date(Date.now() + delay)

  logger.info("Queueing document for retry", {
    intakeId,
    documentType,
    attemptCount,
    nextRetryAt: nextRetryAt.toISOString(),
  })

  await supabase
    .from("document_generation_retries")
    .upsert({
      intake_id: intakeId,
      document_type: documentType,
      subtype,
      status: "pending_retry",
      attempt_count: attemptCount,
      last_error: error.message,
      next_retry_at: nextRetryAt.toISOString(),
      updated_at: new Date().toISOString(),
    })
}

/**
 * Get documents ready for retry
 */
export async function getDocumentsReadyForRetry(): Promise<RetryableDocument[]> {
  const supabase = createServiceRoleClient()
  
  const { data, error } = await supabase
    .from("document_generation_retries")
    .select("intake_id, document_type, subtype, attempt_count, last_error, next_retry_at")
    .eq("status", "pending_retry")
    .lte("next_retry_at", new Date().toISOString())
    .order("next_retry_at", { ascending: true })
    .limit(10)
  
  if (error) {
    logger.error("Failed to fetch retry queue", {}, new Error(error.message))
    return []
  }
  
  return (data || []).map(row => ({
    intakeId: row.intake_id,
    documentType: row.document_type,
    subtype: row.subtype,
    attemptCount: row.attempt_count,
    lastError: row.last_error,
    nextRetryAt: new Date(row.next_retry_at),
  }))
}

/**
 * Mark a document retry as successful
 */
export async function markRetrySuccess(
  intakeId: string,
  documentType: "med_cert" | "pathology" | "prescription"
): Promise<void> {
  const supabase = createServiceRoleClient()

  await supabase
    .from("document_generation_retries")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("intake_id", intakeId)
    .eq("document_type", documentType)

  logger.info("Document retry completed successfully", { intakeId, documentType })
}

/**
 * Mark a document as being processed (to prevent duplicate processing)
 */
export async function markRetryInProgress(
  intakeId: string,
  documentType: "med_cert" | "pathology" | "prescription"
): Promise<boolean> {
  const supabase = createServiceRoleClient()

  // Use optimistic locking to prevent race conditions
  const { error } = await supabase
    .from("document_generation_retries")
    .update({
      status: "processing",
      updated_at: new Date().toISOString(),
    })
    .eq("intake_id", intakeId)
    .eq("document_type", documentType)
    .eq("status", "pending_retry")

  return !error
}
