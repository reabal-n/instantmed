/**
 * Email Retry Queue
 * 
 * Handles failed email notifications by queuing them for retry.
 * Uses the database as a simple queue for reliability.
 */

import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createLogger } from "@/lib/observability/logger"
import { sendViaResend } from "./resend"

const logger = createLogger("email-retry")

const MAX_RETRIES = 3
const RETRY_DELAYS_MS = [
  5 * 60 * 1000,   // 5 minutes
  30 * 60 * 1000,  // 30 minutes
  2 * 60 * 60 * 1000, // 2 hours
]

export interface QueuedEmail {
  id: string
  intake_id: string
  email_type: string
  recipient: string
  subject: string
  html: string
  retry_count: number
  last_error: string | null
  next_retry_at: string | null
  created_at: string
}

/**
 * Queue a failed email for retry
 */
export async function queueEmailForRetry(params: {
  intakeId: string
  emailType: string
  recipient: string
  subject: string
  html: string
  error: string
}): Promise<void> {
  const supabase = createServiceRoleClient()
  
  const nextRetryAt = new Date(Date.now() + RETRY_DELAYS_MS[0]).toISOString()
  
  const { error } = await supabase
    .from("email_retry_queue")
    .insert({
      intake_id: params.intakeId,
      email_type: params.emailType,
      recipient: params.recipient,
      subject: params.subject,
      html: params.html,
      retry_count: 0,
      last_error: params.error,
      next_retry_at: nextRetryAt,
    })

  if (error) {
    logger.error("Failed to queue email for retry", { intakeId: params.intakeId }, error)
  } else {
    logger.info("Email queued for retry", {
      intakeId: params.intakeId,
      emailType: params.emailType,
      nextRetryAt,
    })
  }
}

/**
 * Process pending email retries
 * Should be called by a cron job or edge function
 */
export async function processEmailRetries(): Promise<{
  processed: number
  succeeded: number
  failed: number
  exhausted: number
}> {
  const supabase = createServiceRoleClient()
  const now = new Date().toISOString()
  
  // Fetch emails ready for retry
  const { data: pendingEmails, error: fetchError } = await supabase
    .from("email_retry_queue")
    .select("*")
    .lte("next_retry_at", now)
    .lt("retry_count", MAX_RETRIES)
    .order("next_retry_at", { ascending: true })
    .limit(10) // Process in batches

  if (fetchError || !pendingEmails) {
    logger.error("Failed to fetch pending email retries", {}, fetchError)
    return { processed: 0, succeeded: 0, failed: 0, exhausted: 0 }
  }

  let succeeded = 0
  let failed = 0
  let exhausted = 0

  for (const email of pendingEmails) {
    const result = await sendViaResend({
      to: email.recipient,
      subject: email.subject,
      html: email.html,
    })

    if (result.success) {
      // Remove from queue on success
      await supabase
        .from("email_retry_queue")
        .delete()
        .eq("id", email.id)
      
      // Update intake notification status
      await supabase
        .from("intakes")
        .update({ 
          notification_email_status: "sent",
          notification_email_error: null,
          updated_at: now,
        })
        .eq("id", email.intake_id)
      
      succeeded++
      logger.info("Email retry succeeded", { 
        emailId: email.id, 
        intakeId: email.intake_id,
        retryCount: email.retry_count + 1,
      })
    } else {
      const newRetryCount = email.retry_count + 1
      
      if (newRetryCount >= MAX_RETRIES) {
        // Mark as exhausted
        await supabase
          .from("email_retry_queue")
          .update({
            retry_count: newRetryCount,
            last_error: result.error || "Unknown error",
            next_retry_at: null, // No more retries
          })
          .eq("id", email.id)
        
        exhausted++
        logger.warn("Email retries exhausted", {
          emailId: email.id,
          intakeId: email.intake_id,
          lastError: result.error,
        })
      } else {
        // Schedule next retry
        const nextDelay = RETRY_DELAYS_MS[newRetryCount] || RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1]
        const nextRetryAt = new Date(Date.now() + nextDelay).toISOString()
        
        await supabase
          .from("email_retry_queue")
          .update({
            retry_count: newRetryCount,
            last_error: result.error || "Unknown error",
            next_retry_at: nextRetryAt,
          })
          .eq("id", email.id)
        
        failed++
        logger.info("Email retry failed, scheduled next attempt", {
          emailId: email.id,
          intakeId: email.intake_id,
          retryCount: newRetryCount,
          nextRetryAt,
        })
      }
    }
  }

  return {
    processed: pendingEmails.length,
    succeeded,
    failed,
    exhausted,
  }
}

/**
 * Get retry queue stats
 */
export async function getRetryQueueStats(): Promise<{
  pending: number
  exhausted: number
}> {
  const supabase = createServiceRoleClient()
  
  const { count: pending } = await supabase
    .from("email_retry_queue")
    .select("id", { count: "exact", head: true })
    .lt("retry_count", MAX_RETRIES)
    .not("next_retry_at", "is", null)

  const { count: exhausted } = await supabase
    .from("email_retry_queue")
    .select("id", { count: "exact", head: true })
    .gte("retry_count", MAX_RETRIES)

  return {
    pending: pending ?? 0,
    exhausted: exhausted ?? 0,
  }
}
