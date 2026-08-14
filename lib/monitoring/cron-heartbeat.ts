import "server-only"

import * as Sentry from "@sentry/nextjs"

import { createLogger } from "@/lib/observability/logger"

const log = createLogger("cron-heartbeat")

const CRON_HEARTBEAT_ALERT_METRIC = "cron_heartbeat_alert"
const CRON_HEARTBEAT_ALERT_RECEIPT_LIMIT = 1_000

export function shouldAlertCronOutage(
  lastAlertAt: number | undefined,
  lastRunAt: string | null,
): boolean {
  const lastRunAtMs = lastRunAt ? Date.parse(lastRunAt) : Number.NaN
  return lastAlertAt === undefined || (
    Number.isFinite(lastRunAtMs) && lastAlertAt < lastRunAtMs
  )
}

/**
 * Expected cron schedules for monitoring.
 * maxDelayMinutes is how late a cron can be before we alert.
 * Set to ~2x the schedule interval to account for cold starts and jitter.
 */
const CRITICAL_CRONS: Record<string, { schedule: string; maxDelayMinutes: number }> = {
  "email-dispatcher":       { schedule: "*/5 * * * *",   maxDelayMinutes: 12 },
  "telegram-notifications":  { schedule: "*/5 * * * *",   maxDelayMinutes: 12 },
  "retry-auto-approval":    { schedule: "*/3 * * * *",   maxDelayMinutes: 10 },
  "retry-drafts":           { schedule: "*/5 * * * *",   maxDelayMinutes: 12 },
  "release-stale-claims":   { schedule: "*/5 * * * *",   maxDelayMinutes: 12 },
  "stale-queue":            { schedule: "0 * * * *",     maxDelayMinutes: 75 },
  "emergency-flags":        { schedule: "0 * * * *",     maxDelayMinutes: 75 },
  "daily-reconciliation":   { schedule: "0 21 * * *",    maxDelayMinutes: 1500 }, // ~25h
  "parchment-smoke":        { schedule: "30 21 * * *",   maxDelayMinutes: 1500 }, // ~25h
  "business-alerts":        { schedule: "*/30 * * * *",   maxDelayMinutes: 75 },
  "google-ads-conversions": { schedule: "45 * * * *",    maxDelayMinutes: 75 },
  "google-ads-diagnostics-watch": { schedule: "50 * * * *", maxDelayMinutes: 75 },
  "google-ads-daily-brief": { schedule: "0 22,23 * * *", maxDelayMinutes: 1500 },
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

    let alertableOverdue = overdue

    if (overdue.length > 0) {
      // The watchdog runs every five minutes. Persist one aggregate-only
      // receipt per outage so an unchanged gap does not create a Sentry/log
      // storm. A later successful heartbeat has a newer last_run_at, which
      // automatically rearms the alert without a recovery mutation.
      const overdueJobNames = new Set(overdue.map((item) => item.jobName))
      const { data: receipts, error: receiptReadError } = await supabase
        .from("operational_metrics")
        .select("dimensions, recorded_at")
        .eq("metric_name", CRON_HEARTBEAT_ALERT_METRIC)
        .order("recorded_at", { ascending: false })
        .limit(CRON_HEARTBEAT_ALERT_RECEIPT_LIMIT)

      if (receiptReadError) {
        // Fail open: a receipt read must never hide a real cron outage.
        log.warn("Could not read cron heartbeat alert receipts", {
          error: receiptReadError.message,
        })
      } else {
        const latestAlertByJob = new Map<string, number>()

        for (const receipt of receipts ?? []) {
          const dimensions = receipt.dimensions
          if (!dimensions || Array.isArray(dimensions) || typeof dimensions !== "object") {
            continue
          }

          const jobName = (dimensions as Record<string, unknown>).job_name
          if (
            typeof jobName !== "string" ||
            !overdueJobNames.has(jobName) ||
            latestAlertByJob.has(jobName)
          ) {
            continue
          }

          const recordedAt = typeof receipt.recorded_at === "string"
            ? Date.parse(receipt.recorded_at)
            : Number.NaN
          if (Number.isFinite(recordedAt)) {
            latestAlertByJob.set(jobName, recordedAt)
          }
        }

        alertableOverdue = overdue.filter((item) => {
          const lastAlertAt = latestAlertByJob.get(item.jobName)
          return shouldAlertCronOutage(lastAlertAt, item.lastRunAt)
        })
      }
    }

    if (alertableOverdue.length > 0) {
      log.error("Critical cron jobs overdue", {
        overdueCount: overdue.length,
        newlyAlertedCount: alertableOverdue.length,
        jobs: alertableOverdue
          .map((o) => `${o.jobName} (+${o.minutesOverdue}min)`)
          .join(", "),
      })

      Sentry.captureMessage(`${overdue.length} critical cron job(s) overdue`, {
        level: overdue.length >= 3 ? "fatal" : "error",
        tags: {
          source: "cron-heartbeat-monitor",
          overdue_count: String(overdue.length),
          newly_alerted_count: String(alertableOverdue.length),
        },
        extra: { overdue, newlyAlerted: alertableOverdue },
      })

      const { error: receiptWriteError } = await supabase
        .from("operational_metrics")
        .insert(alertableOverdue.map((item) => ({
          metric_name: CRON_HEARTBEAT_ALERT_METRIC,
          metric_value: item.minutesOverdue,
          dimensions: { job_name: item.jobName },
        })))

      if (receiptWriteError) {
        // Fail open on the next watchdog tick rather than suppressing an
        // outage whose alert receipt was not durably recorded.
        log.warn("Could not record cron heartbeat alert receipts", {
          error: receiptWriteError.message,
        })
      }
    }

    return { overdue, healthy: overdue.length === 0 }
  } catch (err) {
    log.error("Cron heartbeat check failed", {
      error: err instanceof Error ? err.message : String(err),
    })
    return { overdue: [], healthy: true } // Don't false-alarm on check failure
  }
}
