import { NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createLogger } from "@/lib/observability/logger"
import { verifyCronRequest } from "@/lib/api/cron-auth"
import { captureCronError } from "@/lib/observability/sentry"
import * as Sentry from "@sentry/nextjs"
import { trackBusinessMetric } from "@/lib/posthog-server"

const logger = createLogger("cron-business-alerts")

/**
 * Business Alerts Monitor
 *
 * Aggregates key business health metrics and fires Sentry alerts
 * when thresholds are breached. Designed to run every 30 minutes.
 *
 * Metrics checked:
 * - Failed payments in last hour
 * - Email delivery failures in last hour
 * - High-risk intakes awaiting review
 * - SLA breaches (intakes past deadline)
 */
export async function GET(request: NextRequest) {
  const authError = verifyCronRequest(request)
  if (authError) return authError

  try {
    const supabase = createServiceRoleClient()
    const now = new Date()
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
    const alerts: Array<{ metric: string; severity: string; detail: string }> = []

    // 1. Failed payments in last hour
    const { count: failedPayments } = await supabase
      .from("intakes")
      .select("id", { count: "exact", head: true })
      .eq("payment_status", "failed")
      .gte("updated_at", oneHourAgo.toISOString())

    if (failedPayments && failedPayments >= 3) {
      alerts.push({
        metric: "payment_failed",
        severity: failedPayments >= 10 ? "critical" : "warning",
        detail: `${failedPayments} payment failures in last hour`,
      })
      trackBusinessMetric({
        metric: "payment_failed",
        severity: failedPayments >= 10 ? "critical" : "warning",
        metadata: { count: failedPayments, window: "1h" },
      })
    }

    // 2. Email delivery failures (certificates not delivered)
    const { count: emailFailures } = await supabase
      .from("issued_certificates")
      .select("id", { count: "exact", head: true })
      .eq("email_status", "failed")
      .gte("created_at", oneHourAgo.toISOString())

    if (emailFailures && emailFailures >= 2) {
      alerts.push({
        metric: "email_delivery_failed",
        severity: emailFailures >= 5 ? "critical" : "warning",
        detail: `${emailFailures} certificate email failures in last hour`,
      })
      trackBusinessMetric({
        metric: "email_delivery_failed",
        severity: emailFailures >= 5 ? "critical" : "warning",
        metadata: { count: emailFailures, window: "1h" },
      })
    }

    // 3. Bounced emails in last hour (from email_outbox)
    const { count: bouncedEmails } = await supabase
      .from("email_outbox")
      .select("id", { count: "exact", head: true })
      .eq("delivery_status", "bounced")
      .gte("delivery_status_updated_at", oneHourAgo.toISOString())

    if (bouncedEmails && bouncedEmails >= 2) {
      alerts.push({
        metric: "email_bounced",
        severity: bouncedEmails >= 5 ? "critical" : "warning",
        detail: `${bouncedEmails} bounced emails in last hour`,
      })
      trackBusinessMetric({
        metric: "email_bounced",
        severity: bouncedEmails >= 5 ? "critical" : "warning",
        metadata: { count: bouncedEmails, window: "1h" },
      })
    }

    // 4. Emails stuck in pending status for more than 30 minutes
    const thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000)
    const { count: stuckPending } = await supabase
      .from("email_outbox")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .lt("created_at", thirtyMinAgo.toISOString())
      .lt("retry_count", 10)

    if (stuckPending && stuckPending >= 5) {
      alerts.push({
        metric: "email_stuck_pending",
        severity: "warning",
        detail: `${stuckPending} emails stuck in pending for >30min`,
      })
      trackBusinessMetric({
        metric: "email_stuck_pending",
        severity: "warning",
        metadata: { count: stuckPending, window: "30m" },
      })
    }

    // 5. High-risk intakes waiting in queue
    const { count: highRiskWaiting } = await supabase
      .from("intakes")
      .select("id", { count: "exact", head: true })
      .in("status", ["paid", "in_review"])
      .in("risk_tier", ["high", "critical"])

    if (highRiskWaiting && highRiskWaiting > 0) {
      alerts.push({
        metric: "high_risk_intake",
        severity: highRiskWaiting >= 3 ? "critical" : "warning",
        detail: `${highRiskWaiting} high/critical risk intakes in queue`,
      })
      trackBusinessMetric({
        metric: "high_risk_intake",
        severity: highRiskWaiting >= 3 ? "critical" : "warning",
        metadata: { count: highRiskWaiting },
      })
    }

    // 6. SLA breaches (intakes past their sla_deadline)
    const { count: slaBreaches } = await supabase
      .from("intakes")
      .select("id", { count: "exact", head: true })
      .in("status", ["paid", "in_review"])
      .not("sla_deadline", "is", null)
      .lt("sla_deadline", now.toISOString())

    if (slaBreaches && slaBreaches > 0) {
      alerts.push({
        metric: "sla_breach",
        severity: slaBreaches >= 5 ? "critical" : "warning",
        detail: `${slaBreaches} intakes past SLA deadline`,
      })
      trackBusinessMetric({
        metric: "sla_breach",
        severity: slaBreaches >= 5 ? "critical" : "warning",
        metadata: { count: slaBreaches },
      })
    }

    // Fire Sentry alerts for critical items
    const criticalAlerts = alerts.filter((a) => a.severity === "critical")
    if (criticalAlerts.length > 0) {
      Sentry.captureMessage(
        `BUSINESS ALERT: ${criticalAlerts.map((a) => a.detail).join("; ")}`,
        {
          level: "error",
          tags: {
            source: "business-alerts",
            alert_type: "critical",
          },
          extra: {
            alerts,
            checked_at: now.toISOString(),
          },
        }
      )
    }

    const warningAlerts = alerts.filter((a) => a.severity === "warning")
    if (warningAlerts.length > 0) {
      Sentry.captureMessage(
        `Business warning: ${warningAlerts.map((a) => a.detail).join("; ")}`,
        {
          level: "warning",
          tags: {
            source: "business-alerts",
            alert_type: "warning",
          },
          extra: {
            alerts,
            checked_at: now.toISOString(),
          },
        }
      )
    }

    if (alerts.length > 0) {
      logger.warn("Business alerts triggered", {
        alert_count: alerts.length,
        critical: criticalAlerts.length,
        warning: warningAlerts.length,
      })
    } else {
      logger.info("Business health check passed", {})
    }

    return NextResponse.json({
      success: true,
      alerts,
      metrics: {
        failed_payments: failedPayments || 0,
        email_failures: emailFailures || 0,
        bounced_emails: bouncedEmails || 0,
        stuck_pending_emails: stuckPending || 0,
        high_risk_waiting: highRiskWaiting || 0,
        sla_breaches: slaBreaches || 0,
      },
      checked_at: now.toISOString(),
    })
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    logger.error("Business alerts monitor failed", { error: err.message })
    captureCronError(err, { jobName: "business-alerts" })
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
