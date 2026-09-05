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
  last_failure_at?: string | null
  last_failure_status?: string | null
}

interface CronHeartbeatOutage {
  jobName: string
  lastRunAt: string | null
  minutesOverdue: number
  status: string
  outageKey: string
}

function parseClaimedOutageKeys(
  value: unknown,
  overdue: CronHeartbeatOutage[],
): Set<string> | null {
  if (!Array.isArray(value)) return null

  const expectedKeys = new Set(
    overdue.map((item) => `${item.jobName}\u0000${item.outageKey}`),
  )
  const claimedKeys = new Set<string>()

  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return null
    const jobName = (item as { job_name?: unknown }).job_name
    const outageKey = (item as { outage_key?: unknown }).outage_key
    if (typeof jobName !== "string" || typeof outageKey !== "string") return null

    const key = `${jobName}\u0000${outageKey}`
    if (!expectedKeys.has(key)) return null
    claimedKeys.add(key)
  }

  return claimedKeys
}

/**
 * Expected cron schedules for monitoring.
 * maxDelayMinutes is how late a cron can be before we alert.
 * Set to ~2x the schedule interval to account for cold starts and jitter.
 */
export const CRITICAL_CRONS: Record<string, { schedule: string; maxDelayMinutes: number }> = {
  "email-dispatcher":       { schedule: "*/5 * * * *",   maxDelayMinutes: 12 },
  "telegram-notifications":  { schedule: "*/5 * * * *",   maxDelayMinutes: 12 },
  "retry-auto-approval":    { schedule: "*/3 * * * *",   maxDelayMinutes: 10 },
  "retry-drafts":           { schedule: "*/5 * * * *",   maxDelayMinutes: 12 },
  "release-stale-claims":   { schedule: "*/5 * * * *",   maxDelayMinutes: 12 },
  "refund-reconciliation":  { schedule: "*/5 * * * *",   maxDelayMinutes: 12 },
  "refill-reminders":       { schedule: "0 23 * * *",    maxDelayMinutes: 1500 }, // ~25h
  "review-request":         { schedule: "0 0,23 * * *",  maxDelayMinutes: 1500 }, // actual 10:00 Sydney run; guard-only slot is neutral
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
 * work finishes (or from their error path). `ok` and deliberately disabled
 * outcomes rearm the outage generation by default. A planned `skipped` outcome
 * proves invocation without clearing a prior failed-work outage unless the
 * caller has separate durable completion evidence and opts into rearming.
 */
export async function recordCronHeartbeat(
  jobName: string,
  metadata?: {
    durationMs?: number
    itemsProcessed?: number
    status?: string
    rearmOutage?: boolean
  }
): Promise<void> {
  try {
    const { createServiceRoleClient } = await import("@/lib/supabase/service-role")
    const supabase = createServiceRoleClient()
    const status = metadata?.status || "ok"
    const rearmOutage = metadata?.rearmOutage ?? (
      status === "ok" || status === "disabled"
    )
    const { error } = await supabase.rpc("record_cron_heartbeat_outcome", {
      p_duration_ms: metadata?.durationMs ?? null,
      p_items_processed: metadata?.itemsProcessed ?? null,
      p_job_name: jobName,
      p_rearm_outage: rearmOutage,
      p_status: status,
    })

    if (error) {
      throw new Error(error.message)
    }
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
      // A newly monitored job cannot produce a heartbeat before its first
      // scheduled window. Keep the 30-minute floor for frequent jobs, while
      // daily/hourly jobs receive the same jitter allowance as stale rows.
      const initialGraceMinutes = Math.max(
        CRON_WATCHDOG_DEPLOYMENT_GRACE_MINUTES,
        config.maxDelayMinutes,
      )
      if (deploymentAgeMinutes >= initialGraceMinutes) {
        outages.push({
          jobName,
          lastRunAt: null,
          minutesOverdue: Math.round(
            deploymentAgeMinutes - initialGraceMinutes,
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
    const lastSuccessAtMs = heartbeat.last_success_at
      ? Date.parse(heartbeat.last_success_at)
      : Number.NEGATIVE_INFINITY
    const lastFailureAt = heartbeat.last_failure_at
      // Backward-compatible fallback until the outcome migration is applied.
      || (!new Set(["ok", "skipped", "disabled"]).has(status)
        ? heartbeat.last_run_at
        : null)
    const lastFailureAtMs = lastFailureAt
      ? Date.parse(lastFailureAt)
      : Number.NEGATIVE_INFINITY
    const hasUnrecoveredFailure = Number.isFinite(lastFailureAtMs)
      && lastFailureAtMs > lastSuccessAtMs

    if (hasUnrecoveredFailure) {
      outages.push({
        jobName,
        lastRunAt: heartbeat.last_run_at,
        minutesOverdue: Number.isFinite(minutesSinceRun)
          ? Math.max(0, Math.round(minutesSinceRun))
          : 0,
        status: heartbeat.last_failure_status || status,
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
      .select("job_name, last_run_at, last_status, last_success_at, last_failure_at, last_failure_status")

    if (error) {
      log.warn("Could not read cron heartbeats", { error: error.message })
      Sentry.captureMessage("Cron heartbeat watchdog cannot read heartbeat state", {
        level: "fatal",
        fingerprint: ["cron-heartbeat-read-failed"],
        tags: {
          source: "cron-heartbeat-monitor",
          watchdog_status: "configuration_error",
        },
        // Do not attach the provider error: database messages can include query
        // context. The stable signal is sufficient to diagnose schema/ACL drift.
        extra: { heartbeat_state_available: false },
      })
      return { overdue: [], healthy: false }
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
    let alertClaimFailed = false
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
        // Fail open: the claim RPC protects deduplication, but must never turn
        // a known cron outage into silence when its schema or ACL is broken.
        alertClaimFailed = true
        alertableOverdue = overdue
        log.error("Could not atomically claim cron heartbeat alerts", {
          error: claimError.message,
          overdueCount: overdue.length,
        })
      } else {
        const claimedKeys = parseClaimedOutageKeys(claimed, overdue)
        if (!claimedKeys) {
          // A successful transport with an invalid body is still a broken
          // deduplication claim. Page known outages without echoing the body.
          alertClaimFailed = true
          alertableOverdue = overdue
          log.error("Cron heartbeat alert claim returned malformed payload", {
            overdueCount: overdue.length,
          })
        } else {
          alertableOverdue = overdue.filter((item) => (
            claimedKeys.has(`${item.jobName}\u0000${item.outageKey}`)
          ))
        }
      }
    }

    if (alertableOverdue.length > 0) {
      log.error("Critical cron jobs overdue", {
        overdueCount: overdue.length,
        ...(alertClaimFailed
          ? { failOpenAlertCount: alertableOverdue.length }
          : { newlyAlertedCount: alertableOverdue.length }),
        jobs: alertableOverdue
          .map((o) => `${o.jobName} (+${o.minutesOverdue}min)`)
          .join(", "),
      })

      const sentryMessage = alertClaimFailed
        ? "Cron heartbeat alert claim failed; known outages require attention"
        : `${alertableOverdue.length} critical cron job(s) newly overdue`
      Sentry.captureMessage(sentryMessage, {
        level: alertClaimFailed || alertableOverdue.length >= 3 ? "fatal" : "error",
        ...(alertClaimFailed
          ? { fingerprint: ["cron-heartbeat-alert-claim-failed"] }
          : {}),
        tags: {
          source: "cron-heartbeat-monitor",
          alert_claim_status: alertClaimFailed ? "configuration_error" : "claimed",
          overdue_count: String(alertableOverdue.length),
          total_overdue_count: String(overdue.length),
          ...(alertClaimFailed
            ? { fail_open_alert_count: String(alertableOverdue.length) }
            : { newly_alerted_count: String(alertableOverdue.length) }),
        },
        extra: { overdue: alertableOverdue },
      })
    }

    return { overdue, healthy: overdue.length === 0 }
  } catch (err) {
    log.error("Cron heartbeat check failed", {
      error: err instanceof Error ? err.message : String(err),
    })
    Sentry.captureMessage("Cron heartbeat watchdog failed before classification", {
      level: "fatal",
      fingerprint: ["cron-heartbeat-watchdog-failed"],
      tags: {
        source: "cron-heartbeat-monitor",
        watchdog_status: "error",
      },
      extra: { heartbeat_state_classified: false },
    })
    return { overdue: [], healthy: false }
  }
}
