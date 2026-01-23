import { NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createLogger } from "@/lib/observability/logger"
import { verifyCronRequest } from "@/lib/api/cron-auth"
import * as Sentry from "@sentry/nextjs"

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

  try {
    const supabase = createServiceRoleClient()
    const now = new Date()

    // Find paid intakes older than threshold that haven't been picked up
    const staleThreshold = new Date(now.getTime() - STALE_THRESHOLD_HOURS * 60 * 60 * 1000)
    const criticalThreshold = new Date(now.getTime() - CRITICAL_THRESHOLD_HOURS * 60 * 60 * 1000)

    const { data: staleIntakes, error, count } = await supabase
      .from("intakes")
      .select("id, paid_at, status, service_id, service:services!service_id(name, type)", { count: "exact" })
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
      const serviceInfo = i.service as { name?: string; type?: string } | null
      return { id: i.id, serviceType: serviceInfo?.type || 'unknown', hoursWaiting: Math.round(hoursWaiting * 10) / 10 }
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
    }

    return NextResponse.json({
      success: true,
      stale_count: staleCount,
      critical_count: criticalIntakes.length,
      warning_count: warningIntakes.length,
      oldest_wait_hours: waitTimes[0]?.hoursWaiting,
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
