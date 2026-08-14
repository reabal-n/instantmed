import "server-only"

import * as Sentry from "@sentry/nextjs"

import { createLogger } from "@/lib/observability/logger"

const log = createLogger("cron-heartbeat")

export const CRON_WATCHDOG_DEPLOYMENT_GRACE_MINUTES = 30

interface CronHeartbeatRow {
  job_name: string
  last_run_at: string | null
  last_status: string | null
  last_success_at?: string | null
}

interface CronHeartbeatOutage {
  jobName: string
  lastRunAt: string | null
  minutesOverdue: number
  status: string
  outageKey: string
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
  "posthog-reconciliation": { schedule: "15 * * * *",    maxDelayMinutes: 75 },
  "google-ads-conversions": { schedule: "45 * * * *",    maxDelayMinutes: 75 },
  "google-ads-diagnostics-watch": { schedule: "50 * * * *", maxDelayMinutes: 75 },
  "google-ads-daily-brief": { schedule: "0 22,23 * * *", maxDelayMinutes: 1500 },
}

/**
 * Record a cron job execution heartbeat.
 *
 * Callers that use `last_status` as an outcome signal must call this after the
 * work finishes (or from their error path). Successful outcomes also advance
 * `last_success_at`; failed attempts deliberately preserve that recovery
 * boundary so the watchdog can deduplicate one alert per continuous outage.
 */
export async function recordCronHeartbeat(
  jobName: string,
  metadata?: { durationMs?: number; itemsProcessed?: number; status?: string }
): Promise<void> {
  try {
    const { createServiceRoleClient } = await import("@/lib/supabase/service-role")
    const supabase = createServiceRoleClient()
    const recordedAt = new Date().toISOString()
    const status = metadata?.status || "ok"

    await supabase.from("cron_heartbeats").upsert(
      {
        job_name: jobName,
        last_run_at: recordedAt,
        run_count: 1, // Will be incremented by trigger if exists, otherwise just set
        last_duration_ms: metadata?.durationMs || null,
        last_items_processed: metadata?.itemsProcessed || null,
        last_status: status,
        ...(status === "ok" ? { last_success_at: recordedAt } : {}),
      },
      { onConflict: "job_name", defaultToNull: false }
    )
  } catch (err) {
    // Non-blocking - never fail a cron because heartbeat recording failed
    log.warn("Failed to record cron heartbeat", {
      jobName,
      error: err instanceof Error ? err.message : String(err),
    })
  }
}

function resolveCronWatchdogDeploymentKey(): string {
  return process.env.VERCEL_DEPLOYMENT_ID
    || process.env.VERCEL_GIT_COMMIT_SHA
    || `non-vercel-${process.env.NODE_ENV || "unknown"}`
}

export function findCronHeartbeatOutages(input: {
  heartbeats: CronHeartbeatRow[]
  nowMs: number
  deploymentStartedAtMs: number
  deploymentKey: string
}): CronHeartbeatOutage[] {
  const heartbeatMap = new Map(
    input.heartbeats.map((heartbeat) => [heartbeat.job_name, heartbeat]),
  )
  const deploymentAgeMinutes = Math.max(
    0,
    (input.nowMs - input.deploymentStartedAtMs) / (1000 * 60),
  )
  const outages: CronHeartbeatOutage[] = []

  for (const [jobName, config] of Object.entries(CRITICAL_CRONS)) {
    const heartbeat = heartbeatMap.get(jobName)

    if (!heartbeat?.last_run_at) {
      if (deploymentAgeMinutes >= CRON_WATCHDOG_DEPLOYMENT_GRACE_MINUTES) {
        outages.push({
          jobName,
          lastRunAt: null,
          minutesOverdue: Math.round(
            deploymentAgeMinutes - CRON_WATCHDOG_DEPLOYMENT_GRACE_MINUTES,
          ),
          status: "never_run",
          outageKey: `never:${input.deploymentKey}`,
        })
      }
      continue
    }

    const lastRunAtMs = Date.parse(heartbeat.last_run_at)
    const minutesSinceRun = Number.isFinite(lastRunAtMs)
      ? (input.nowMs - lastRunAtMs) / (1000 * 60)
      : Number.POSITIVE_INFINITY
    const status = heartbeat.last_status || "unknown"

    if (status !== "ok") {
      outages.push({
        jobName,
        lastRunAt: heartbeat.last_run_at,
        minutesOverdue: Number.isFinite(minutesSinceRun)
          ? Math.max(0, Math.round(minutesSinceRun))
          : 0,
        status,
        outageKey: `failed:${heartbeat.last_success_at || "never-successful"}`,
      })
      continue
    }

    if (minutesSinceRun > config.maxDelayMinutes) {
      outages.push({
        jobName,
        lastRunAt: heartbeat.last_run_at,
        minutesOverdue: Number.isFinite(minutesSinceRun)
          ? Math.round(minutesSinceRun - config.maxDelayMinutes)
          : 0,
        status: "overdue",
        outageKey: `stale:${heartbeat.last_run_at}`,
      })
    }
  }

  return outages
}

/**
 * Check that all critical crons have run within their expected window.
 * Returns list of overdue crons. Called by health-check cron.
 */
export async function checkCronHeartbeats(): Promise<{
  overdue: Array<{
    jobName: string
    lastRunAt: string | null
    minutesOverdue: number
    status: string
  }>
  healthy: boolean
}> {
  try {
    const { createServiceRoleClient } = await import("@/lib/supabase/service-role")
    const supabase = createServiceRoleClient()

    const { data: heartbeats, error } = await supabase
      .from("cron_heartbeats")
      .select("job_name, last_run_at, last_status, last_success_at")

    if (error) {
      // Table might not exist yet - not an error condition
      log.warn("Could not read cron heartbeats", { error: error.message })
      return { overdue: [], healthy: true }
    }

    const now = Date.now()
    const deploymentKey = resolveCronWatchdogDeploymentKey()
    const {
      data: deploymentStartedAt,
      error: deploymentMarkerError,
    } = await supabase.rpc("get_or_create_cron_watchdog_deployment", {
      p_deployment_key: deploymentKey,
    })
    if (deploymentMarkerError) {
      log.warn("Could not resolve cron watchdog deployment grace", {
        error: deploymentMarkerError.message,
      })
    }
    const parsedDeploymentStartedAt = typeof deploymentStartedAt === "string"
      ? Date.parse(deploymentStartedAt)
      : Number.NaN
    // If the durable grace marker is unavailable, fail open to liveness
    // detection instead of hiding jobs that have never produced a heartbeat.
    const deploymentStartedAtMs = Number.isFinite(parsedDeploymentStartedAt)
      ? parsedDeploymentStartedAt
      : now - CRON_WATCHDOG_DEPLOYMENT_GRACE_MINUTES * 60_000

    const overdue = findCronHeartbeatOutages({
      heartbeats: (heartbeats || []) as CronHeartbeatRow[],
      nowMs: now,
      deploymentStartedAtMs,
      deploymentKey,
    })

    let alertableOverdue: CronHeartbeatOutage[] = []
    if (overdue.length > 0) {
      // Claim before emitting. The RPC inserts against a partial unique index,
      // so concurrent watchdog invocations can never both own the same outage.
      const { data: claimed, error: claimError } = await supabase.rpc(
        "claim_cron_heartbeat_alerts",
        {
          p_outages: overdue.map((item) => ({
            job_name: item.jobName,
            outage_key: item.outageKey,
            minutes_overdue: item.minutesOverdue,
          })),
        },
      )

      if (claimError) {
        log.error("Could not atomically claim cron heartbeat alerts", {
          error: claimError.message,
          overdueCount: overdue.length,
        })
      } else {
        const claimedKeys = new Set(
          ((claimed || []) as Array<{ job_name?: unknown; outage_key?: unknown }>)
            .filter((item) => (
              typeof item.job_name === "string"
              && typeof item.outage_key === "string"
            ))
            .map((item) => `${item.job_name}\u0000${item.outage_key}`),
        )
        alertableOverdue = overdue.filter((item) => (
          claimedKeys.has(`${item.jobName}\u0000${item.outageKey}`)
        ))
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

      Sentry.captureMessage(`${alertableOverdue.length} critical cron job(s) newly overdue`, {
        level: alertableOverdue.length >= 3 ? "fatal" : "error",
        tags: {
          source: "cron-heartbeat-monitor",
          overdue_count: String(alertableOverdue.length),
          total_overdue_count: String(overdue.length),
          newly_alerted_count: String(alertableOverdue.length),
        },
        extra: { overdue: alertableOverdue },
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
