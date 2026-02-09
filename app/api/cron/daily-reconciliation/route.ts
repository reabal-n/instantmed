import { NextRequest, NextResponse } from "next/server"
import { createLogger } from "@/lib/observability/logger"
import { verifyCronRequest } from "@/lib/api/cron-auth"
import { captureCronError } from "@/lib/observability/sentry"
import { getReconciliationRecords } from "@/lib/data/reconciliation"
import * as Sentry from "@sentry/nextjs"
import { trackBusinessMetric } from "@/lib/posthog-server"

const logger = createLogger("cron-daily-reconciliation")

/**
 * Daily Payment Reconciliation
 *
 * Runs daily at 7 AM AEST to identify mismatches between
 * payment status and delivery outcome from the last 24 hours.
 *
 * Alerts on:
 * - Paid intakes without delivery (stuck > 2 hours)
 * - Failed refunds
 * - Failed certificate/script deliveries
 *
 * Schedule: Daily at 7 AM AEST (21:00 UTC previous day)
 */
export async function GET(request: NextRequest) {
  const authError = verifyCronRequest(request)
  if (authError) return authError

  try {
    const now = new Date()
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    // Get all reconciliation records (not just mismatches) for last 24h
    const result = await getReconciliationRecords({
      mismatch_only: false,
      date_from: twentyFourHoursAgo.toISOString(),
      date_to: now.toISOString(),
    })

    if (result.error) {
      throw new Error(`Reconciliation query failed: ${result.error}`)
    }

    const { data: records, summary } = result

    // Identify critical mismatches (older than 2 hours)
    const criticalMismatches = records.filter(
      (r) => r.is_mismatch && r.age_minutes > 120
    )

    // Identify failed refunds
    const failedRefunds = records.filter((r) => r.refund_failed)

    // Identify failed deliveries
    const failedDeliveries = records.filter(
      (r) => r.delivery_status === "failed"
    )

    // Track metrics
    trackBusinessMetric({
      metric: "daily_reconciliation",
      severity: criticalMismatches.length > 0 ? "critical" : "info",
      metadata: {
        total: summary.total,
        mismatches: summary.mismatches,
        delivered: summary.delivered,
        pending: summary.pending,
        failed: summary.failed,
        critical_mismatches: criticalMismatches.length,
        failed_refunds: failedRefunds.length,
        failed_deliveries: failedDeliveries.length,
      },
    })

    // Alert on critical issues
    if (criticalMismatches.length > 0) {
      Sentry.captureMessage(
        `RECONCILIATION: ${criticalMismatches.length} payment(s) without delivery for 2+ hours`,
        {
          level: "error",
          tags: {
            source: "daily-reconciliation",
            alert_type: "critical_mismatch",
          },
          extra: {
            critical_mismatches: criticalMismatches.slice(0, 10).map((r) => ({
              reference: r.reference_number,
              status: r.intake_status,
              delivery: r.delivery_status,
              age_hours: Math.round(r.age_minutes / 60),
              category: r.category,
              error: r.last_error,
            })),
            summary,
          },
        }
      )
    }

    if (failedRefunds.length > 0) {
      Sentry.captureMessage(
        `RECONCILIATION: ${failedRefunds.length} failed refund(s) require manual intervention`,
        {
          level: "error",
          tags: {
            source: "daily-reconciliation",
            alert_type: "failed_refund",
          },
          extra: {
            failed_refunds: failedRefunds.slice(0, 10).map((r) => ({
              reference: r.reference_number,
              refund_error: r.refund_error,
              patient: r.patient_email,
            })),
          },
        }
      )
    }

    if (failedDeliveries.length > 0) {
      Sentry.captureMessage(
        `RECONCILIATION: ${failedDeliveries.length} failed delivery(ies) in last 24h`,
        {
          level: "warning",
          tags: {
            source: "daily-reconciliation",
            alert_type: "failed_delivery",
          },
          extra: {
            failed_deliveries: failedDeliveries.slice(0, 10).map((r) => ({
              reference: r.reference_number,
              category: r.category,
              delivery_details: r.delivery_details,
              error: r.last_error,
            })),
          },
        }
      )
    }

    // Log summary
    const hasIssues =
      criticalMismatches.length > 0 ||
      failedRefunds.length > 0 ||
      failedDeliveries.length > 0

    if (hasIssues) {
      logger.warn("Daily reconciliation found issues", {
        ...summary,
        critical_mismatches: criticalMismatches.length,
        failed_refunds: failedRefunds.length,
        failed_deliveries: failedDeliveries.length,
      })
    } else {
      logger.info("Daily reconciliation clean", { ...summary })
    }

    return NextResponse.json({
      success: true,
      summary,
      issues: {
        critical_mismatches: criticalMismatches.length,
        failed_refunds: failedRefunds.length,
        failed_deliveries: failedDeliveries.length,
      },
      checked_at: now.toISOString(),
    })
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    logger.error("Daily reconciliation cron failed", { error: err.message })
    captureCronError(err, { jobName: "daily-reconciliation" })
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
