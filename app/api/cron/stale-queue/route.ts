import { NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createLogger } from "@/lib/observability/logger"
import { verifyCronRequest } from "@/lib/api/cron-auth"
import { recordCronHeartbeat } from "@/lib/monitoring/cron-heartbeat"
import * as Sentry from "@sentry/nextjs"
import { trackBusinessMetric } from "@/lib/posthog-server"

const logger = createLogger("cron-stale-queue")

// Alert thresholds
const STALE_THRESHOLD_HOURS = 4 // Patients expect "within an hour"
const CRITICAL_THRESHOLD_HOURS = 8

/**
 * Stale Queue Monitor
 * 
 * Checks for paid intakes that have been waiting in the doctor queue
 * for longer than expected. Sends alerts to ensure SLA compliance.
 * 
 * Runs every hour via Vercel Cron (configured in vercel.json)
 */
export async function GET(request: NextRequest) {
  // Verify cron authentication
  const authError = verifyCronRequest(request)
  if (authError) return authError

  await recordCronHeartbeat("stale-queue")

  try {
    const supabase = createServiceRoleClient()
    const now = new Date()

    // Find paid intakes older than threshold that haven't been picked up
    const staleThreshold = new Date(now.getTime() - STALE_THRESHOLD_HOURS * 60 * 60 * 1000)
    const criticalThreshold = new Date(now.getTime() - CRITICAL_THRESHOLD_HOURS * 60 * 60 * 1000)

    const { data: staleIntakes, error, count } = await supabase
      .from("intakes")
      .select("id, paid_at, status, category", { count: "exact" })
      .eq("status", "paid")
      .eq("payment_status", "paid")
      .lt("paid_at", staleThreshold.toISOString())
      .order("paid_at", { ascending: true })
      .limit(20)

    if (error) {
      logger.error("Failed to query stale intakes", { error: error.message })
      return NextResponse.json({ error: "Failed to query stale intakes" }, { status: 500 })
    }

    const staleCount = count || 0

    if (staleCount === 0) {
      logger.info("Queue health check passed - no stale intakes", {})
      return NextResponse.json({
        success: true,
        stale_count: 0,
        checked_at: now.toISOString(),
      })
    }

    // Categorize by severity
    const criticalIntakes = staleIntakes?.filter(i => 
      i.paid_at && new Date(i.paid_at) < criticalThreshold
    ) || []
    const warningIntakes = staleIntakes?.filter(i => 
      i.paid_at && new Date(i.paid_at) >= criticalThreshold
    ) || []

    // Calculate wait times
    const waitTimes = staleIntakes?.map(i => {
      const paidAt = new Date(i.paid_at)
      const hoursWaiting = (now.getTime() - paidAt.getTime()) / (1000 * 60 * 60)
      return { id: i.id, serviceType: i.category || 'unknown', hoursWaiting: Math.round(hoursWaiting * 10) / 10 }
    }) || []

    // Alert based on severity
    if (criticalIntakes.length > 0) {
      Sentry.captureMessage(`CRITICAL: ${criticalIntakes.length} intakes waiting 8+ hours`, {
        level: "error",
        tags: {
          source: "stale-queue-monitor",
          alert_type: "critical_sla_breach",
        },
        extra: {
          critical_count: criticalIntakes.length,
          warning_count: warningIntakes.length,
          total_stale: staleCount,
          oldest_intakes: waitTimes.slice(0, 5),
        },
      })
      logger.error("CRITICAL SLA breach - intakes waiting 8+ hours", {
        critical_count: criticalIntakes.length,
        intake_ids: criticalIntakes.map(i => i.id),
      })
      trackBusinessMetric({
        metric: 'sla_breach',
        severity: 'critical',
        metadata: { critical_count: criticalIntakes.length, total_stale: staleCount },
      })
    } else if (warningIntakes.length > 0) {
      Sentry.captureMessage(`Warning: ${warningIntakes.length} intakes waiting 4+ hours`, {
        level: "warning",
        tags: {
          source: "stale-queue-monitor",
          alert_type: "sla_warning",
        },
        extra: {
          stale_count: staleCount,
          oldest_intakes: waitTimes.slice(0, 5),
        },
      })
      logger.warn("SLA warning - intakes waiting 4+ hours", {
        stale_count: staleCount,
        oldest_wait_hours: waitTimes[0]?.hoursWaiting,
      })
      trackBusinessMetric({
        metric: 'queue_backup',
        severity: 'warning',
        metadata: { stale_count: staleCount, oldest_wait_hours: waitTimes[0]?.hoursWaiting },
      })
    }

    // ── Check for stuck awaiting_script intakes (48h threshold) ──
    const AWAITING_SCRIPT_THRESHOLD_HOURS = 48
    const awaitingScriptThreshold = new Date(now.getTime() - AWAITING_SCRIPT_THRESHOLD_HOURS * 60 * 60 * 1000)

    const { data: stuckScriptIntakes, error: scriptError } = await supabase
      .from("intakes")
      .select("id, updated_at, category", { count: "exact" })
      .eq("status", "awaiting_script")
      .lt("updated_at", awaitingScriptThreshold.toISOString())
      .order("updated_at", { ascending: true })
      .limit(20)

    if (scriptError) {
      logger.error("Failed to query stuck awaiting_script intakes", { error: scriptError.message })
    }

    const stuckScriptCount = stuckScriptIntakes?.length || 0

    if (stuckScriptCount > 0) {
      const stuckScriptDetails = stuckScriptIntakes?.map(i => {
        const updatedAt = new Date(i.updated_at)
        const hoursStuck = Math.round(((now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60)) * 10) / 10
        return { id: i.id, serviceType: i.category || "unknown", hoursStuck }
      }) || []

      Sentry.captureMessage(`Warning: ${stuckScriptCount} intakes stuck in awaiting_script for 48+ hours`, {
        level: "warning",
        tags: {
          source: "stale-queue-monitor",
          alert_type: "stuck_awaiting_script",
        },
        extra: {
          stuck_count: stuckScriptCount,
          intakes: stuckScriptDetails.slice(0, 5),
        },
      })
      logger.warn("Intakes stuck in awaiting_script for 48+ hours", {
        stuck_count: stuckScriptCount,
        oldest_hours: stuckScriptDetails[0]?.hoursStuck,
      })
      trackBusinessMetric({
        metric: 'stuck_awaiting_script',
        severity: 'warning',
        metadata: { stuck_count: stuckScriptCount, oldest_hours: stuckScriptDetails[0]?.hoursStuck },
      })
    }

    return NextResponse.json({
      success: true,
      stale_count: staleCount,
      critical_count: criticalIntakes.length,
      warning_count: warningIntakes.length,
      oldest_wait_hours: waitTimes[0]?.hoursWaiting,
      stuck_awaiting_script_count: stuckScriptCount,
      alert_sent: true,
      checked_at: now.toISOString(),
    })
  } catch (error) {
    logger.error("Stale queue monitor failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    })
    
    Sentry.captureException(error, {
      tags: { source: "stale-queue-monitor" },
    })

    return NextResponse.json(
      { error: "Stale queue monitor failed" },
      { status: 500 }
    )
  }
}
