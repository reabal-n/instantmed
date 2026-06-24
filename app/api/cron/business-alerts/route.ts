import * as Sentry from "@sentry/nextjs"
import { NextRequest, NextResponse } from "next/server"

import { buildOperationalInvariantAlerts, getOperationalInvariants } from "@/lib/admin/ops-invariants"
import { getGoogleAdsPurchaseImportHealth } from "@/lib/analytics/google-ads-report"
import { trackBusinessMetric } from "@/lib/analytics/posthog-server"
import { verifyCronRequest } from "@/lib/api/cron-auth"
import { filterReportableIntakes } from "@/lib/data/reporting-filters"
import { filterSeededE2EIntakes } from "@/lib/data/seeded-e2e-data"
import { toError } from "@/lib/errors"
import { buildGoogleAdsPurchaseImportAlert } from "@/lib/monitoring/google-ads-purchase-import-health"
import {
  buildNoPurchaseRevenueAlert,
  CHECKOUT_DEMAND_PAYMENT_STATUSES,
  CHECKOUT_DEMAND_STATUSES,
  NO_PURCHASE_CRITICAL_WINDOW_HOURS,
  NO_PURCHASE_WARNING_WINDOW_HOURS,
  type NoPurchaseRevenueWindow,
  REVENUE_PURCHASE_PAYMENT_STATUSES,
} from "@/lib/monitoring/revenue-safety"
import {
  buildStaleHumanQueueAlert,
  STALE_HUMAN_QUEUE_CATEGORIES,
  STALE_HUMAN_QUEUE_THRESHOLD_HOURS,
} from "@/lib/monitoring/stale-human-queue"
import { escapeMarkdown, sendTelegramAlert } from "@/lib/notifications/telegram"
import { createLogger } from "@/lib/observability/logger"
import { captureCronError } from "@/lib/observability/sentry"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const logger = createLogger("cron-business-alerts")

/** Re-page a still-standing alert signature at most once per this window (4h). */
const TELEGRAM_ALERT_COOLDOWN_MS = 4 * 60 * 60 * 1000

type BusinessAlert = { metric: string; severity: "critical" | "warning" | "info"; detail: string; count?: number }

async function getNoPurchaseRevenueWindow(
  supabase: ReturnType<typeof createServiceRoleClient>,
  now: Date,
  windowHours: number,
): Promise<NoPurchaseRevenueWindow> {
  const since = new Date(now.getTime() - windowHours * 60 * 60 * 1000).toISOString()
  const nowIso = now.toISOString()

  const [paidResult, createdResult, checkoutResult, partialResult] = await Promise.all([
    filterReportableIntakes(
      supabase
        .from("intakes")
        .select("id", { count: "exact", head: true })
        .in("payment_status", [...REVENUE_PURCHASE_PAYMENT_STATUSES])
        .not("paid_at", "is", null)
        .gte("paid_at", since)
        .lte("paid_at", nowIso),
    ),
    filterReportableIntakes(
      supabase
        .from("intakes")
        .select("id", { count: "exact", head: true })
        .gte("created_at", since)
        .lte("created_at", nowIso),
    ),
    filterReportableIntakes(
      supabase
        .from("intakes")
        .select("id", { count: "exact", head: true })
        .in("status", [...CHECKOUT_DEMAND_STATUSES])
        .in("payment_status", [...CHECKOUT_DEMAND_PAYMENT_STATUSES])
        .gte("created_at", since)
        .lte("created_at", nowIso),
    ),
    supabase
      .from("partial_intakes")
      .select("session_id", { count: "exact", head: true })
      .is("converted_to_intake_id", null)
      .gte("updated_at", since)
      .lte("updated_at", nowIso)
      .gte("expires_at", nowIso),
  ])

  if (paidResult.error) throw new Error(`No-purchase paid count failed: ${paidResult.error.message}`)
  if (createdResult.error) throw new Error(`No-purchase intake demand count failed: ${createdResult.error.message}`)
  if (checkoutResult.error) throw new Error(`No-purchase checkout demand count failed: ${checkoutResult.error.message}`)
  if (partialResult.error) throw new Error(`No-purchase draft demand count failed: ${partialResult.error.message}`)

  return {
    windowHours,
    paidIntakes: paidResult.count ?? 0,
    createdIntakes: createdResult.count ?? 0,
    checkoutStageIntakes: checkoutResult.count ?? 0,
    partialDrafts: partialResult.count ?? 0,
  }
}

/**
 * Business Alerts Monitor
 *
 * Aggregates key business health metrics and fires Sentry alerts
 * when thresholds are breached. Designed to run every 30 minutes.
 *
 * Metrics checked:
 * - Failed payments in last hour
 * - No paid intakes despite saved-intake or draft demand
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
    const alerts: BusinessAlert[] = []

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

    // 2. Revenue safety: page only when paid orders are silent while the
    // funnel still has demand. A quiet traffic day should not alert.
    const criticalNoPurchaseWindow = await getNoPurchaseRevenueWindow(
      supabase,
      now,
      NO_PURCHASE_CRITICAL_WINDOW_HOURS,
    )
    const criticalNoPurchaseAlert = buildNoPurchaseRevenueAlert(criticalNoPurchaseWindow)
    const noPurchaseWindow = criticalNoPurchaseAlert
      ? criticalNoPurchaseWindow
      : await getNoPurchaseRevenueWindow(supabase, now, NO_PURCHASE_WARNING_WINDOW_HOURS)
    const noPurchaseAlert =
      criticalNoPurchaseAlert ?? buildNoPurchaseRevenueAlert(noPurchaseWindow)

    if (noPurchaseAlert) {
      alerts.push(noPurchaseAlert)
      trackBusinessMetric({
        metric: noPurchaseAlert.metric,
        severity: noPurchaseAlert.severity,
        metadata: noPurchaseAlert.metadata,
      })
    }

    // 3. Google Ads purchase-import safety: local paid Google-attributed orders
    // must show up in the configured purchase import action. This catches the
    // expensive blind-bidding state where Stripe/Supabase have revenue but Ads
    // diagnostics or conversion reports show no import/primary purchase signal.
    let googleAdsPurchaseImportHealth = null
    try {
      googleAdsPurchaseImportHealth = await getGoogleAdsPurchaseImportHealth({ supabase, now })
      const googleAdsPurchaseImportAlert = buildGoogleAdsPurchaseImportAlert(googleAdsPurchaseImportHealth)
      if (googleAdsPurchaseImportAlert) {
        alerts.push(googleAdsPurchaseImportAlert)
        trackBusinessMetric({
          metric: googleAdsPurchaseImportAlert.metric,
          severity: googleAdsPurchaseImportAlert.severity,
          metadata: googleAdsPurchaseImportAlert.metadata,
        })
      }
    } catch (error) {
      const err = toError(error)
      const alert = {
        metric: "google_ads_purchase_import_health_failed" as const,
        severity: "critical",
        detail: `Google Ads purchase import health check failed: ${err.message}`,
        count: 1,
      } satisfies BusinessAlert
      alerts.push(alert)
      trackBusinessMetric({
        metric: alert.metric,
        severity: alert.severity,
        metadata: { error: err.message },
      })
    }

    // 4. Email delivery failures (certificates not delivered)
    const { count: emailFailures } = await supabase
      .from("issued_certificates")
      .select("id", { count: "exact", head: true })
      .not("email_failed_at", "is", null)
      .is("email_sent_at", null)
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

    // 5. Bounced emails in last hour (from email_outbox)
    // Only track the business metric — don't raise a Sentry alert here.
    // Email delivery and Resend's own dashboard flag the domain-level issue.
    // Spam-rate SLO is the
    // real concern; single-bounce spikes are almost always one bad address.
    const { count: bouncedEmails } = await supabase
      .from("email_outbox")
      .select("id", { count: "exact", head: true })
      .eq("delivery_status", "bounced")
      .gte("delivery_status_updated_at", oneHourAgo.toISOString())

    if (bouncedEmails && bouncedEmails >= 5) {
      // Only track `critical` tier (>=5/hr sustained). No duplicate Sentry
      // alert in the loop below — metric goes to PostHog for trending only.
      trackBusinessMetric({
        metric: "email_bounced",
        severity: "critical",
        metadata: { count: bouncedEmails, window: "1h" },
      })
    }

    // 6. Emails stuck in pending status for more than 30 minutes
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

    // 7. High-risk intakes waiting in queue
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

    // 8. Critical email delivery SLA - med_cert_patient and script_sent must be delivered within 10 min
    const tenMinAgo = new Date(now.getTime() - 10 * 60 * 1000)
    const { count: slaBreaches } = await supabase
      .from("email_outbox")
      .select("id", { count: "exact", head: true })
      .in("email_type", ["med_cert_patient", "script_sent"])
      .in("status", ["sent"])
      .neq("delivery_status", "delivered")
      .lt("sent_at", tenMinAgo.toISOString())
      .gte("sent_at", oneHourAgo.toISOString())

    if (slaBreaches && slaBreaches > 0) {
      alerts.push({
        metric: "email_delivery_sla_breach",
        severity: slaBreaches >= 3 ? "critical" : "warning",
        detail: `${slaBreaches} critical emails (cert/script) not delivered within 10min`,
      })
      trackBusinessMetric({
        metric: "sla_breach",
        severity: slaBreaches >= 3 ? "critical" : "warning",
        metadata: { count: slaBreaches, window: "10m", types: "med_cert_patient,script_sent", breach_type: "email_delivery" },
      })
    }

    // 9. Weekly ops invariants promoted from dashboard-only visibility to alerting.
    const operationalInvariants = await getOperationalInvariants(supabase)
    const invariantAlerts = buildOperationalInvariantAlerts(operationalInvariants)

    for (const alert of invariantAlerts) {
      alerts.push(alert)
      trackBusinessMetric({
        metric: alert.metric,
        severity: alert.severity,
        metadata: { count: alert.count },
      })
    }

    // 10. Human-required (Rx/consult) queue stalled >24h. Medical certificates
    // auto-approve at all hours, so a stalled HUMAN queue means the operator may
    // be unavailable and paid scripts/consults are piling up. Per the 2026-06-11
    // decision we page (Telegram, critical → cooldown'd below), we do NOT
    // auto-pause the service. See lib/monitoring/stale-human-queue.ts.
    const staleHumanThreshold = new Date(
      now.getTime() - STALE_HUMAN_QUEUE_THRESHOLD_HOURS * 60 * 60 * 1000,
    )
    const { data: staleHumanRows, count: staleHumanCount } = await filterSeededE2EIntakes(
      supabase
        .from("intakes")
        .select("paid_at", { count: "exact" })
        .eq("status", "paid")
        .eq("payment_status", "paid")
        .in("category", [...STALE_HUMAN_QUEUE_CATEGORIES])
        .lt("paid_at", staleHumanThreshold.toISOString()),
    )
      .order("paid_at", { ascending: true })
      .limit(1)

    const staleHumanAlert = buildStaleHumanQueueAlert(
      staleHumanRows?.[0]?.paid_at ?? null,
      staleHumanCount ?? 0,
      now,
    )
    if (staleHumanAlert) {
      alerts.push(staleHumanAlert)
      trackBusinessMetric({
        metric: staleHumanAlert.metric,
        severity: "critical",
        metadata: { count: staleHumanAlert.count },
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

    // Telegram fallback so the operator is still paged when Sentry ingestion is
    // down. On 2026-06-06 a CSP-report flood exhausted the Sentry quota and
    // silently dropped every alert (including a 26h review-SLA breach) for days.
    // Telegram is an independent channel. Gated by TELEGRAM_SYSTEM_ALERTS_ENABLED=1.
    // Escalate criticals and any 24h review-SLA backlog regardless of tier.
    const telegramWorthy = alerts.filter(
      (a) => a.severity === "critical" || a.metric === "ops_sla_breach_backlog",
    )
    if (telegramWorthy.length > 0) {
      // This cron runs every 30 min and standing conditions (SLA backlog, cert/refund
      // orphans, a high-risk intake sitting in the queue) persist for hours — so
      // without a cooldown the operator gets the SAME page every 30 min. Page once
      // per distinct alert signature per TELEGRAM_ALERT_COOLDOWN_MS, tracked in
      // audit_logs. A genuinely new condition (different fingerprint) still pages
      // immediately.
      const fingerprint = [...new Set(telegramWorthy.map((a) => a.metric))].sort().join(",")
      const cooldownSince = new Date(now.getTime() - TELEGRAM_ALERT_COOLDOWN_MS).toISOString()
      const { data: recentAlert } = await supabase
        .from("audit_logs")
        .select("id")
        .eq("action", "telegram_business_alert")
        .eq("metadata->>fingerprint", fingerprint)
        .gte("created_at", cooldownSince)
        .limit(1)

      if (!recentAlert || recentAlert.length === 0) {
        const lines = telegramWorthy.map((a) => `• ${a.detail}`).join("\n")
        const delivered = await sendTelegramAlert(escapeMarkdown(`⚠️ InstantMed business alert\n${lines}`), {
          severity: "critical",
        })
        // Only burn the cooldown if the page actually went out. A transient
        // Telegram failure must NOT suppress re-paging for the whole window.
        if (delivered) {
          await supabase.from("audit_logs").insert({
            action: "telegram_business_alert",
            actor_type: "system",
            metadata: { fingerprint, metrics: [...new Set(telegramWorthy.map((a) => a.metric))] },
            created_at: new Date().toISOString(),
          })
        } else {
          logger.warn("Business alert Telegram not delivered; cooldown not written (will retry next run)", { fingerprint })
        }
      } else {
        logger.info("Business alert Telegram suppressed (within cooldown)", { fingerprint })
      }
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
        email_sla_breaches: slaBreaches || 0,
        no_purchase_window: {
          window_hours: noPurchaseWindow.windowHours,
          paid_intakes: noPurchaseWindow.paidIntakes,
          created_intakes: noPurchaseWindow.createdIntakes,
          checkout_stage_intakes: noPurchaseWindow.checkoutStageIntakes,
          partial_drafts: noPurchaseWindow.partialDrafts,
        },
        google_ads_purchase_import_health: googleAdsPurchaseImportHealth,
        rx_consult_queue_stalled: staleHumanCount ?? 0,
        ops_sla_breach_backlog: operationalInvariants.slaBreachBacklog,
        ops_cert_refund_orphans: operationalInvariants.certRefundOrphans,
        ops_refund_record_anomalies: operationalInvariants.refundRecordAnomalies,
      },
      checked_at: now.toISOString(),
    })
  } catch (error) {
    const err = toError(error)
    logger.error("Business alerts monitor failed", { error: err.message })
    captureCronError(err, { jobName: "business-alerts" })
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
