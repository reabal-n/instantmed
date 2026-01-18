import { NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createLogger } from "@/lib/observability/logger"
import { verifyCronRequest } from "@/lib/api/cron-auth"
import * as Sentry from "@sentry/nextjs"

const logger = createLogger("cron-dlq-monitor")

/**
 * Dead Letter Queue Monitor
 * 
 * Checks for unprocessed items in the Stripe webhook dead letter queue
 * and sends alerts if items are older than the threshold.
 * 
 * Runs daily via Vercel Cron (configured in vercel.json)
 */
export async function GET(request: NextRequest) {
  // Verify cron authentication
  const authError = verifyCronRequest(request)
  if (authError) return authError

  try {
    const supabase = createServiceRoleClient()
    const ALERT_THRESHOLD_HOURS = 24

    // Find unresolved DLQ items older than threshold
    const thresholdTime = new Date(Date.now() - ALERT_THRESHOLD_HOURS * 60 * 60 * 1000)
    
    const { data: staleItems, error, count } = await supabase
      .from("stripe_webhook_dead_letter")
      .select("id, event_id, event_type, error_message, created_at, intake_id", { count: "exact" })
      .is("resolved_at", null)
      .lt("created_at", thresholdTime.toISOString())
      .order("created_at", { ascending: true })
      .limit(10)

    if (error) {
      logger.error("Failed to query DLQ", { error: error.message })
      return NextResponse.json({ error: "Failed to query DLQ" }, { status: 500 })
    }

    const staleCount = count || 0

    if (staleCount > 0) {
      // Alert via Sentry
      Sentry.captureMessage(`Dead Letter Queue Alert: ${staleCount} unresolved items older than ${ALERT_THRESHOLD_HOURS}h`, {
        level: "warning",
        tags: {
          source: "dlq-monitor",
          alert_type: "stale_items",
        },
        extra: {
          stale_count: staleCount,
          threshold_hours: ALERT_THRESHOLD_HOURS,
          oldest_items: staleItems?.map(item => ({
            event_id: item.event_id,
            event_type: item.event_type,
            error: item.error_message,
            created_at: item.created_at,
            intake_id: item.intake_id,
          })),
        },
      })

      logger.warn("DLQ has stale items requiring attention", {
        stale_count: staleCount,
        oldest_event_id: staleItems?.[0]?.event_id,
        oldest_created_at: staleItems?.[0]?.created_at,
      })

      // Also log a summary of affected intakes for quick action
      const affectedIntakes = staleItems?.filter(i => i.intake_id).map(i => i.intake_id) || []
      if (affectedIntakes.length > 0) {
        logger.warn("Affected intake IDs requiring manual resolution", {
          intake_ids: affectedIntakes,
        })
      }
    } else {
      logger.info("DLQ check passed - no stale items", {})
    }

    return NextResponse.json({
      success: true,
      stale_count: staleCount,
      threshold_hours: ALERT_THRESHOLD_HOURS,
      alert_sent: staleCount > 0,
      checked_at: new Date().toISOString(),
    })
  } catch (error) {
    logger.error("DLQ monitor failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    })
    
    Sentry.captureException(error, {
      tags: { source: "dlq-monitor" },
    })

    return NextResponse.json(
      { error: "DLQ monitor failed" },
      { status: 500 }
    )
  }
}
