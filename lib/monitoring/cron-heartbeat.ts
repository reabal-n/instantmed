import "server-only"

import * as Sentry from "@sentry/nextjs"

import { escapeMarkdown, sendTelegramAlert } from "@/lib/notifications/telegram"
import { createLogger } from "@/lib/observability/logger"

const log = createLogger("cron-heartbeat")

/**
 * Re-page a still-overdue cron at most once per this window. The health-check
 * cron runs every 5 minutes, so without a cooldown one dead cron would page
 * the operator 48x/day.
 */
export const CRON_WATCHDOG_TELEGRAM_COOLDOWN_MS = 4 * 60 * 60 * 1000

const CRON_WATCHDOG_TELEGRAM_AUDIT_ACTION = "telegram_cron_watchdog"

export type OverdueCron = { jobName: string; lastRunAt: string | null; minutesOverdue: number }

/**
 * Per-JOB cooldown (mirrors the business-alerts per-metric cooldown): a
 * standing overdue job that already paged must not re-page just because a
 * different job joined or left the overdue set, while a newly-overdue job
 * still pages immediately.
 */
export function selectPageableOverdueCrons(
  overdue: OverdueCron[],
  lastPagedAt: Map<string, number>,
  nowMs: number,
  cooldownMs = CRON_WATCHDOG_TELEGRAM_COOLDOWN_MS,
): OverdueCron[] {
  return overdue.filter((job) => {
    const paged = lastPagedAt.get(job.jobName)
    return !paged || nowMs - paged >= cooldownMs
  })
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
  "pending-queue-reminders": { schedule: "5 * * * *",     maxDelayMinutes: 75 },
  "emergency-flags":        { schedule: "0 * * * *",     maxDelayMinutes: 75 },
  "daily-reconciliation":   { schedule: "0 21 * * *",    maxDelayMinutes: 1500 }, // ~25h
  "parchment-smoke":        { schedule: "30 21 * * *",   maxDelayMinutes: 1500 }, // ~25h
  "business-alerts":        { schedule: "*/30 * * * *",   maxDelayMinutes: 75 },
  "google-ads-conversions": { schedule: "45 * * * *",    maxDelayMinutes: 75 },
  "google-ads-diagnostics-watch": { schedule: "50 * * * *", maxDelayMinutes: 75 },
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

      // Telegram fallback: Sentry alone went dark on 2026-06-06 (a CSP-report
      // flood exhausted the quota and silently dropped every alert for days).
      // The watchdog is the layer that notices OTHER alerting crons dying —
      // business-alerts' own Telegram fallback can't fire if business-alerts
      // itself is the dead cron — so it needs its own independent channel.
      // Gated by TELEGRAM_SYSTEM_ALERTS_ENABLED=1 inside sendTelegramAlert;
      // failures here must never break the health check itself.
      try {
        const nowMs = Date.now()
        const lookbackSince = new Date(nowMs - CRON_WATCHDOG_TELEGRAM_COOLDOWN_MS).toISOString()
        const { data: recentPages } = await supabase
          .from("audit_logs")
          .select("created_at, metadata")
          .eq("action", CRON_WATCHDOG_TELEGRAM_AUDIT_ACTION)
          .gte("created_at", lookbackSince)

        const lastPagedAt = new Map<string, number>()
        for (const row of (recentPages ?? []) as Array<{
          created_at: string
          metadata: { metrics?: string[] } | null
        }>) {
          const pagedAt = new Date(row.created_at).getTime()
          if (Number.isNaN(pagedAt)) continue
          for (const jobName of row.metadata?.metrics ?? []) {
            const previous = lastPagedAt.get(jobName)
            if (!previous || pagedAt > previous) lastPagedAt.set(jobName, pagedAt)
          }
        }

        const pageable = selectPageableOverdueCrons(overdue, lastPagedAt, nowMs)
        if (pageable.length > 0) {
          const lines = pageable
            .map((o) => `• ${o.jobName} overdue by ${o.minutesOverdue}min (last ran ${o.lastRunAt ?? "never"})`)
            .join("\n")
          const delivered = await sendTelegramAlert(
            escapeMarkdown(`🚨 InstantMed cron watchdog: ${pageable.length} critical cron(s) overdue\n${lines}`),
            { severity: "critical" },
          )
          // Only burn the cooldown when the page went out — a transient
          // Telegram failure must not suppress re-paging for the window.
          if (delivered) {
            await supabase.from("audit_logs").insert({
              action: CRON_WATCHDOG_TELEGRAM_AUDIT_ACTION,
              actor_type: "system",
              metadata: { metrics: pageable.map((o) => o.jobName).sort() },
              created_at: new Date().toISOString(),
            })
          } else {
            log.warn("Cron watchdog Telegram not delivered; cooldown not written (will retry next run)", {
              jobs: pageable.map((o) => o.jobName).join(", "),
            })
          }
        }
      } catch (telegramError) {
        log.warn("Cron watchdog Telegram fallback failed", {
          error: telegramError instanceof Error ? telegramError.message : String(telegramError),
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
