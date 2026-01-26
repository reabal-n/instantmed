import { NextRequest, NextResponse } from "next/server"
import { verifyCronRequest } from "@/lib/api/cron-auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { generateDraftsForIntake } from "@/app/actions/generate-drafts"
import { createLogger } from "@/lib/observability/logger"
import { captureCronError } from "@/lib/observability/sentry"

const logger = createLogger("cron-retry-drafts")

/**
 * GET /api/cron/retry-drafts
 * 
 * Retries failed AI draft generation with exponential backoff.
 * Should be called every 5 minutes via Vercel Cron.
 * 
 * Required env: CRON_SECRET
 */
export async function GET(request: NextRequest) {
  // Verify cron authentication (standardized)
  const authError = verifyCronRequest(request)
  if (authError) return authError

  const supabase = createServiceRoleClient()

  try {
    // Find pending retries that are due
    const { data: pendingRetries, error: fetchError } = await supabase
      .from("ai_draft_retry_queue")
      .select("id, intake_id, attempts, max_attempts")
      .is("completed_at", null)
      .lt("attempts", 3) // Don't exceed max attempts
      .lte("next_retry_at", new Date().toISOString())
      .order("next_retry_at", { ascending: true })
      .limit(10) // Process in batches

    if (fetchError) {
      logger.error("Failed to fetch pending retries", { error: fetchError.message })
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    if (!pendingRetries || pendingRetries.length === 0) {
      return NextResponse.json({ processed: 0, message: "No pending retries" })
    }

    let succeeded = 0
    let failed = 0

    for (const retry of pendingRetries) {
      const newAttempts = retry.attempts + 1

      try {
        // Attempt to generate drafts
        const result = await generateDraftsForIntake(retry.intake_id)

        if (result.success) {
          // Mark as completed
          await supabase
            .from("ai_draft_retry_queue")
            .update({ 
              completed_at: new Date().toISOString(),
              attempts: newAttempts,
            })
            .eq("id", retry.id)

          logger.info("Draft retry succeeded", { 
            intakeId: retry.intake_id, 
            attempts: newAttempts 
          })
          succeeded++
        } else {
          throw new Error(result.error || "Unknown error")
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err)
        
        // Calculate next retry with exponential backoff (2^attempts minutes)
        const backoffMinutes = Math.pow(2, newAttempts)
        const nextRetryAt = new Date(Date.now() + backoffMinutes * 60 * 1000)

        if (newAttempts >= retry.max_attempts) {
          // Mark as failed permanently
          await supabase
            .from("ai_draft_retry_queue")
            .update({ 
              attempts: newAttempts,
              last_error: errorMessage,
              completed_at: new Date().toISOString(), // Mark complete so we stop retrying
            })
            .eq("id", retry.id)

          logger.error("Draft retry exhausted max attempts", { 
            intakeId: retry.intake_id, 
            attempts: newAttempts,
            error: errorMessage,
          })
        } else {
          // Schedule next retry
          await supabase
            .from("ai_draft_retry_queue")
            .update({ 
              attempts: newAttempts,
              last_error: errorMessage,
              next_retry_at: nextRetryAt.toISOString(),
            })
            .eq("id", retry.id)

          logger.warn("Draft retry failed, scheduled next attempt", { 
            intakeId: retry.intake_id, 
            attempts: newAttempts,
            nextRetryAt: nextRetryAt.toISOString(),
            error: errorMessage,
          })
        }
        failed++
      }
    }

    logger.info("Retry drafts cron completed", { succeeded, failed, total: pendingRetries.length })

    return NextResponse.json({ 
      processed: pendingRetries.length,
      succeeded,
      failed,
    })
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    logger.error("Cron job error", { error: err.message })
    captureCronError(err, { jobName: "retry-drafts" })
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
