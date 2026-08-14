import * as Sentry from "@sentry/nextjs"
import { NextRequest, NextResponse } from "next/server"

import { generateDraftsForIntake } from "@/app/actions/generate-drafts"
import { acquireCronLock, releaseCronLock,verifyCronRequest } from "@/lib/api/cron-auth"
import { toError } from "@/lib/errors"
import { recordCronHeartbeat } from "@/lib/monitoring/cron-heartbeat"
import { createLogger } from "@/lib/observability/logger"
import { captureCronError } from "@/lib/observability/sentry"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const logger = createLogger("cron-retry-drafts")

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

/**
 * GET /api/cron/retry-drafts
 *
 * Retries failed AI draft generation with exponential backoff.
 * Runs every 5 minutes via Vercel Cron.
 *
 * generateDraftsForIntake is idempotent (skips if drafts already exist), but
 * without a concurrency lock two overlapping runs can call it for the same
 * intake simultaneously - burning duplicate AI tokens. The lock makes
 * each 5-minute window a single-writer window.
 *
 * Required env: CRON_SECRET
 */
export async function GET(request: NextRequest) {
  const authError = verifyCronRequest(request)
  if (authError) return authError

  const startedAt = Date.now()

  // Acquire concurrency lock - prevents overlapping runs from double-processing rows
  const lock = await acquireCronLock("retry-drafts")
  if (!lock.acquired) {
    const lockUnavailable = lock.reason === "unavailable"
    await recordCronHeartbeat("retry-drafts", {
      durationMs: Date.now() - startedAt,
      status: lockUnavailable ? "configuration_error" : "skipped",
    })
    return NextResponse.json({
      success: !lockUnavailable,
      skipped: !lockUnavailable,
      reason: lock.existingLockAge
        ? `Already running for ${lock.existingLockAge}s`
        : lockUnavailable
          ? "Cron lock unavailable"
          : "Already running",
    }, { status: lockUnavailable ? 503 : 200 })
  }

  try {
    const supabase = createServiceRoleClient()
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
      await recordCronHeartbeat("retry-drafts", {
        durationMs: Date.now() - startedAt,
        status: "error",
      })
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    if (!pendingRetries || pendingRetries.length === 0) {
      await recordCronHeartbeat("retry-drafts", {
        durationMs: Date.now() - startedAt,
        itemsProcessed: 0,
        status: "ok",
      })
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
          const { error: completionError } = await supabase
            .from("ai_draft_retry_queue")
            .update({ 
              completed_at: new Date().toISOString(),
              attempts: newAttempts,
            })
            .eq("id", retry.id)
          if (completionError) {
            throw new Error(`Draft retry completion update failed: ${completionError.message}`)
          }

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
          const { error: exhaustedUpdateError } = await supabase
            .from("ai_draft_retry_queue")
            .update({ 
              attempts: newAttempts,
              last_error: errorMessage,
              completed_at: new Date().toISOString(), // Mark complete so we stop retrying
            })
            .eq("id", retry.id)
          if (exhaustedUpdateError) {
            throw new Error(`Draft retry exhaustion update failed: ${exhaustedUpdateError.message}`)
          }

          logger.error("Draft retry exhausted max attempts", { 
            intakeId: retry.intake_id, 
            attempts: newAttempts,
            error: errorMessage,
          })
        } else {
          // Schedule next retry
          const { error: retryUpdateError } = await supabase
            .from("ai_draft_retry_queue")
            .update({ 
              attempts: newAttempts,
              last_error: errorMessage,
              next_retry_at: nextRetryAt.toISOString(),
            })
            .eq("id", retry.id)
          if (retryUpdateError) {
            throw new Error(`Draft retry schedule update failed: ${retryUpdateError.message}`)
          }

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

    await recordCronHeartbeat("retry-drafts", {
      durationMs: Date.now() - startedAt,
      itemsProcessed: pendingRetries.length,
      status: failed > 0 ? "partial_failure" : "ok",
    })
    return NextResponse.json({
      processed: pendingRetries.length,
      succeeded,
      failed,
    })
  } catch (error) {
    Sentry.captureException(error)
    const err = toError(error)
    logger.error("Cron job error", { error: err.message })
    captureCronError(err, { jobName: "retry-drafts" })
    await recordCronHeartbeat("retry-drafts", {
      durationMs: Date.now() - startedAt,
      status: "error",
    })
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  } finally {
    await releaseCronLock("retry-drafts")
  }
}
