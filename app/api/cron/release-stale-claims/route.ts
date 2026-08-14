import * as Sentry from "@sentry/nextjs"
import { NextRequest, NextResponse } from "next/server"

import { acquireCronLock, releaseCronLock,verifyCronRequest } from "@/lib/api/cron-auth"
import { toError } from "@/lib/errors"
import { recordCronHeartbeat } from "@/lib/monitoring/cron-heartbeat"
import { createLogger } from "@/lib/observability/logger"
import { captureCronError } from "@/lib/observability/sentry"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const logger = createLogger("cron:release-stale-claims")

// Vercel cron job configuration
export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

// Cron job to release stale intake claims
// Runs every 5 minutes to prevent queue stalls
// Configure in vercel.json crons array
export async function GET(request: NextRequest) {
  // Verify cron authentication (fail-closed)
  const authError = verifyCronRequest(request)
  if (authError) return authError

  const startTime = Date.now()

  // Acquire concurrency lock - prevents overlapping execution in serverless
  const lock = await acquireCronLock("release-stale-claims")
  if (!lock.acquired) {
    const lockUnavailable = lock.reason === "unavailable"
    await recordCronHeartbeat("release-stale-claims", {
      durationMs: Date.now() - startTime,
      status: lockUnavailable ? "configuration_error" : "skipped",
    })
    return NextResponse.json({
      success: !lockUnavailable,
      skipped: !lockUnavailable,
      reason: lock.existingLockAge
        ? `Already running for ${lock.existingLockAge}s`
        : lockUnavailable
          ? "Cron lock unavailable"
          : "Already running"
    }, { status: lockUnavailable ? 503 : 200 })
  }

  try {
    const supabase = createServiceRoleClient()
    // Call the database function to release stale claims
    const { data, error } = await supabase.rpc("release_stale_intake_claims", {
      p_timeout_minutes: 30,
    })

    if (error) {
      logger.error("Failed to release stale claims", { error: error.message })
      await recordCronHeartbeat("release-stale-claims", {
        durationMs: Date.now() - startTime,
        status: "error",
      })
      return NextResponse.json(
        { success: false, error: "Failed to release stale claims" },
        { status: 500 }
      )
    }

    const releasedCount = data?.length || 0
    const duration = Date.now() - startTime

    // Log results
    if (releasedCount > 0) {
      logger.info("Released stale claims", {
        count: releasedCount,
        claims: data,
        durationMs: duration,
      })
    }

    // Track cron run
    const { error: runRecordError } = await supabase.from("cron_job_runs").upsert(
      {
        job_name: "release_stale_claims",
        last_run_at: new Date().toISOString(),
        last_result: { released: releasedCount, durationMs: duration },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "job_name" }
    )

    if (runRecordError) {
      throw new Error(`Failed to record stale-claims run: ${runRecordError.message}`)
    }

    await recordCronHeartbeat("release-stale-claims", {
      durationMs: duration,
      itemsProcessed: releasedCount,
      status: "ok",
    })

    return NextResponse.json({
      success: true,
      released: releasedCount,
      durationMs: duration,
    })
  } catch (err) {
    Sentry.captureException(err)
    const error = toError(err)
    logger.error("Cron job failed", { error: error.message })
    captureCronError(error, { jobName: "release-stale-claims" })
    await recordCronHeartbeat("release-stale-claims", {
      durationMs: Date.now() - startTime,
      status: "error",
    })
    return NextResponse.json(
      { success: false, error: "Cron job failed" },
      { status: 500 }
    )
  } finally {
    await releaseCronLock("release-stale-claims")
  }
}
