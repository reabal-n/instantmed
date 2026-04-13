import "server-only"

import * as Sentry from "@sentry/nextjs"

import { createLogger } from "@/lib/observability/logger"

const log = createLogger("cron-heartbeat")

/**
 * Expected cron schedules for monitoring.
 * maxDelayMinutes is how late a cron can be before we alert.
 * Set to ~2x the schedule interval to account for cold starts and jitter.
 */
const CRITICAL_CRONS: Record<string, { schedule: string; maxDelayMinutes: number }> = {
  "health-check":           { schedule: "*/5 * * * *",   maxDelayMinutes: 12 },
  "email-dispatcher":       { schedule: "*/5 * * * *",   maxDelayMinutes: 12 },
  "retry-auto-approval":    { schedule: "*/3 * * * *",   maxDelayMinutes: 10 },
  "retry-drafts":           { schedule: "*/5 * * * *",   maxDelayMinutes: 12 },
  "release-stale-claims":   { schedule: "*/5 * * * *",   maxDelayMinutes: 12 },
  "stale-queue":            { schedule: "0 * * * *",     maxDelayMinutes: 75 },
  "emergency-flags":        { schedule: "0 * * * *",     maxDelayMinutes: 75 },
  "daily-reconciliation":   { schedule: "0 21 * * *",    maxDelayMinutes: 1500 }, // ~25h
}

/**
 * Record a cron job execution heartbeat.
 * Call at the START of each cron handler (after auth check).
 * Uses upsert so it works even if the row doesn't exist yet.
 */
export async function recordCronHeartbeat(
  jobName: string,
  metadata?: { durationMs?: number; itemsProcessed?: number; status?: string }
): Promise<void> {
  try {
    const { createServiceRoleClient } = await import("@/lib/supabase/service-role")
    const supabase = createServiceRoleClient()

    await supabase.from("cron_heartbeats").upsert(
      {
        job_name: jobName,
        last_run_at: new Date().toISOString(),
        run_count: 1, // Will be incremented by trigger if exists, otherwise just set
        last_duration_ms: metadata?.durationMs || null,
        last_items_processed: metadata?.itemsProcessed || null,
        last_status: metadata?.status || "ok",
      },
      { onConflict: "job_name" }
    )
  } catch (err) {
    // Non-blocking - never fail a cron because heartbeat recording failed
    log.warn("Failed to record cron heartbeat", {
      jobName,
      error: err instanceof Error ? err.message : String(err),
    })
  }
}

/**
 * Check that all critical crons have run within their expected window.
 * Returns list of overdue crons. Called by health-check cron.
 */
export async function checkCronHeartbeats(): Promise<{
  overdue: Array<{ jobName: string; lastRunAt: string | null; minutesOverdue: number }>
  healthy: boolean
}> {
  try {
    const { createServiceRoleClient } = await import("@/lib/supabase/service-role")
    const supabase = createServiceRoleClient()

    const { data: heartbeats, error } = await supabase
      .from("cron_heartbeats")
      .select("job_name, last_run_at, last_status")

    if (error) {
      // Table might not exist yet - not an error condition
      log.warn("Could not read cron heartbeats", { error: error.message })
      return { overdue: [], healthy: true }
    }

    const now = Date.now()
    const heartbeatMap = new Map(
      (heartbeats || []).map((h) => [h.job_name, h])
    )

    const overdue: Array<{ jobName: string; lastRunAt: string | null; minutesOverdue: number }> = []

    for (const [jobName, config] of Object.entries(CRITICAL_CRONS)) {
      const heartbeat = heartbeatMap.get(jobName)

      if (!heartbeat?.last_run_at) {
        // Never ran - only alert if we've been deployed long enough (give 30min grace)
        // Skip alerting for first-time deployments
        continue
      }

      const lastRunAt = new Date(heartbeat.last_run_at).getTime()
      const minutesSinceRun = (now - lastRunAt) / (1000 * 60)

      if (minutesSinceRun > config.maxDelayMinutes) {
        overdue.push({
          jobName,
          lastRunAt: heartbeat.last_run_at,
          minutesOverdue: Math.round(minutesSinceRun - config.maxDelayMinutes),
        })
      }
    }

    if (overdue.length > 0) {
      log.error("Critical cron jobs overdue", {
        overdueCount: overdue.length,
        jobs: overdue.map((o) => `${o.jobName} (+${o.minutesOverdue}min)`).join(", "),
      })

      Sentry.captureMessage(`${overdue.length} critical cron job(s) overdue`, {
        level: overdue.length >= 3 ? "fatal" : "error",
        tags: {
          source: "cron-heartbeat-monitor",
          overdue_count: String(overdue.length),
        },
        extra: { overdue },
      })
    }

    return { overdue, healthy: overdue.length === 0 }
  } catch (err) {
    log.error("Cron heartbeat check failed", {
      error: err instanceof Error ? err.message : String(err),
    })
    return { overdue: [], healthy: true } // Don't false-alarm on check failure
  }
}
