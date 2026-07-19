import * as Sentry from "@sentry/nextjs"
import { NextRequest, NextResponse } from "next/server"

import { buildOperationalInvariantAlerts, getOperationalInvariants, type OperationalInvariants } from "@/lib/admin/ops-invariants"
import { getGoogleAdsAdjustmentHealth, getGoogleAdsUploadStreamHealth } from "@/lib/analytics/google-ads-health"
import { getGoogleAdsPurchaseImportHealth } from "@/lib/analytics/google-ads-report"
import { trackBusinessMetric } from "@/lib/analytics/posthog-server"
import { verifyCronRequest } from "@/lib/api/cron-auth"
import { getAuthEmailFailureCount } from "@/lib/data/auth-email-events"
import { filterReportableIntakes } from "@/lib/data/reporting-filters"
import { filterSeededE2EIntakes } from "@/lib/data/seeded-e2e-data"
import { toError } from "@/lib/errors"
import { type BusinessAlert, runAlertSection } from "@/lib/monitoring/alert-sections"
import { buildAuthEmailFailureAlert } from "@/lib/monitoring/auth-email-failure"
import {
  type BatchReviewHealth,
  buildBatchReviewOverdueAlert,
  getBatchReviewHealth,
} from "@/lib/monitoring/batch-review-health"
import { recordCronHeartbeat } from "@/lib/monitoring/cron-heartbeat"
import {
  buildGoogleAdsAdjustmentTerminalRiskAlert,
  buildGoogleAdsPurchaseImportAlert,
  buildGoogleAdsUploadAuditSourceAnomalyAlert,
  buildGoogleAdsUploadPartialFailureAlert,
  buildGoogleAdsUploadStreamStalledAlert,
} from "@/lib/monitoring/google-ads-purchase-import-health"
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
import { sendCriticalBusinessAlertViaTelegram } from "@/lib/notifications/telegram"
import { createLogger } from "@/lib/observability/logger"
import { captureCronError } from "@/lib/observability/sentry"
import {
  buildPrescriptionFulfilmentSlaAlerts,
  getPrescriptionFulfilmentDashboard,
  type PrescriptionFulfilmentDashboard,
} from "@/lib/parchment/fulfilment-dashboard"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const logger = createLogger("cron-business-alerts")

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
 * Every check runs inside `runAlertSection` (fail-soft): one broken query
 * must not silence the sections after it or the Sentry dispatch —
 * the pre-2026-07 shape threw from section 2 straight to the outer catch,
 * which is exactly how the alerting hub goes blind. A failed section becomes
 * its own critical alert instead.
 *
 * Metrics checked:
 * - Failed payments in last hour
 * - No paid intakes despite saved-intake or draft demand
 * - Email delivery failures in last hour
 * - Auth email delivery failures in last hour
 * - High-risk intakes awaiting review
 * - SLA breaches (intakes past deadline)
 */
export async function GET(request: NextRequest) {
  const authError = verifyCronRequest(request)
  if (authError) return authError
  await recordCronHeartbeat("business-alerts")

  try {
    const supabase = createServiceRoleClient()
    const now = new Date()
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
    const alerts: BusinessAlert[] = []

    const onSectionFailure = (alert: BusinessAlert, error: Error) => {
      logger.error("Business alert section failed", { metric: alert.metric, error: error.message })
      trackBusinessMetric({
        metric: "business_alert_section_failed",
        severity: "critical",
        metadata: { section: alert.metric, error: error.message },
      })
    }

    // Section results consumed by the response payload below. Sections that
    // fail leave their value null so the JSON shows "unknown", not a fake 0.
    let failedPayments: number | null = null
    let emailFailures: number | null = null
    let authEmailFailures: number | null = null
    let bouncedEmails: number | null = null
    let stuckPending: number | null = null
    let highRiskWaiting: number | null = null
    let slaBreaches: number | null = null
    let noPurchaseWindow: NoPurchaseRevenueWindow | null = null
    let operationalInvariants: OperationalInvariants | null = null
    let staleHumanCount: number | null = null
    let batchReviewHealth: BatchReviewHealth | null = null
    let prescriptionFulfilment: PrescriptionFulfilmentDashboard | null = null

    // 1. Failed payments in last hour
    await runAlertSection({
      section: "failed_payments",
      alerts,
      onFailure: onSectionFailure,
      run: async () => {
        const { count, error } = await supabase
          .from("intakes")
          .select("id", { count: "exact", head: true })
          .eq("payment_status", "failed")
          .gte("updated_at", oneHourAgo.toISOString())
        if (error) throw new Error(`Failed-payments count failed: ${error.message}`)
        failedPayments = count ?? 0

        if (failedPayments >= 3) {
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
      },
    })

    // 2. Revenue safety: page only when paid orders are silent while the
    // funnel still has demand. A quiet traffic day should not alert.
    await runAlertSection({
      section: "no_purchase_revenue",
      alerts,
      onFailure: onSectionFailure,
      run: async () => {
        const criticalNoPurchaseWindow = await getNoPurchaseRevenueWindow(
          supabase,
          now,
          NO_PURCHASE_CRITICAL_WINDOW_HOURS,
        )
        const criticalNoPurchaseAlert = buildNoPurchaseRevenueAlert(criticalNoPurchaseWindow)
        noPurchaseWindow = criticalNoPurchaseAlert
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
      },
    })

    // 3. Google Ads purchase-import safety: local paid Google-attributed orders
    // must show up in the configured purchase import action. This catches the
    // expensive blind-bidding state where Stripe/Supabase have revenue but Ads
    // diagnostics or conversion reports show no import/primary purchase signal.
    // Keeps its historical dedicated failure metric (predates runAlertSection).
    let googleAdsPurchaseImportHealth = null
    try {
      googleAdsPurchaseImportHealth = await getGoogleAdsPurchaseImportHealth({ supabase, now })
      const googleAdsUploadAuditSourceAnomalyAlert =
        buildGoogleAdsUploadAuditSourceAnomalyAlert(googleAdsPurchaseImportHealth)
      if (googleAdsUploadAuditSourceAnomalyAlert) {
        alerts.push(googleAdsUploadAuditSourceAnomalyAlert)
        trackBusinessMetric({
          metric: googleAdsUploadAuditSourceAnomalyAlert.metric,
          severity: googleAdsUploadAuditSourceAnomalyAlert.severity,
          metadata: googleAdsUploadAuditSourceAnomalyAlert.metadata,
        })
      }
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

    // 3b. Upload-stream stall: paid orders exist but ZERO successful server-side
    // uploads reached Google in the window. Complements section 3, which reads
    // the Google Ads *reporting* return side and is gated on click-id orders —
    // so it is structurally blind to a Data-Manager enhanced-conversions-only
    // stall (those match on hashed email/phone with no click id). The reader is
    // fail-soft (queryFailed → builder returns null), so a DB blip cannot page.
    let googleAdsUploadStreamHealth:
      | Awaited<ReturnType<typeof getGoogleAdsUploadStreamHealth>>
      | null = null
    let googleAdsAdjustmentHealth:
      | Awaited<ReturnType<typeof getGoogleAdsAdjustmentHealth>>
      | null = null
    try {
      googleAdsUploadStreamHealth = await getGoogleAdsUploadStreamHealth(supabase, { now })
      const uploadStreamStalledAlert = buildGoogleAdsUploadStreamStalledAlert(googleAdsUploadStreamHealth)
      if (uploadStreamStalledAlert) {
        alerts.push(uploadStreamStalledAlert)
        trackBusinessMetric({
          metric: uploadStreamStalledAlert.metric,
          severity: uploadStreamStalledAlert.severity,
          metadata: uploadStreamStalledAlert.metadata,
        })
      }
      const uploadPartialFailureAlert = buildGoogleAdsUploadPartialFailureAlert(googleAdsUploadStreamHealth)
      if (uploadPartialFailureAlert) {
        alerts.push(uploadPartialFailureAlert)
        trackBusinessMetric({
          metric: uploadPartialFailureAlert.metric,
          severity: uploadPartialFailureAlert.severity,
          metadata: uploadPartialFailureAlert.metadata,
        })
      }
    } catch (error) {
      // Non-fatal: a stall detector that itself fails must not break the cron or
      // suppress other alerts. Section 3 already pages on a hard Google Ads
      // health failure.
      logger.warn("Google Ads upload-stream health check failed", {
        error: toError(error).message,
      })
    }

    // 3c. Retained-value adjustment risk: refunded/disputed purchases are
    // noisy on Google diagnostics, so only page when a terminal retraction
    // failure is tied to an original click-attributed purchase upload.
    try {
      googleAdsAdjustmentHealth = await getGoogleAdsAdjustmentHealth(supabase, { now })
      const adjustmentRiskAlert = buildGoogleAdsAdjustmentTerminalRiskAlert(googleAdsAdjustmentHealth)
      if (adjustmentRiskAlert) {
        alerts.push(adjustmentRiskAlert)
        trackBusinessMetric({
          metric: adjustmentRiskAlert.metric,
          severity: adjustmentRiskAlert.severity,
          metadata: adjustmentRiskAlert.metadata,
        })
      }
    } catch (error) {
      logger.warn("Google Ads adjustment health check failed", {
        error: toError(error).message,
      })
    }

    // 4. Email delivery failures (certificates not delivered)
    await runAlertSection({
      section: "email_delivery_failed",
      alerts,
      onFailure: onSectionFailure,
      run: async () => {
        const { count, error } = await supabase
          .from("issued_certificates")
          .select("id", { count: "exact", head: true })
          .not("email_failed_at", "is", null)
          .is("email_sent_at", null)
          .gte("created_at", oneHourAgo.toISOString())
        if (error) throw new Error(`Certificate email-failure count failed: ${error.message}`)
        emailFailures = count ?? 0

        if (emailFailures >= 2) {
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
      },
    })

    // 4b. Auth email failures can block sign-in and password recovery. Keep
    // this aggregate-only: recipient hashes, domains, and error text stay out
    // of Sentry, PostHog, Telegram, and the cron response.
    await runAlertSection({
      section: "auth_email_delivery_failed",
      alerts,
      onFailure: onSectionFailure,
      run: async () => {
        authEmailFailures = await getAuthEmailFailureCount(oneHourAgo)
        const authEmailAlert = buildAuthEmailFailureAlert(authEmailFailures)
        if (authEmailAlert) {
          alerts.push(authEmailAlert)
          trackBusinessMetric({
            metric: authEmailAlert.metric,
            severity: authEmailAlert.severity,
            metadata: { count: authEmailFailures, window: "1h" },
          })
        }
      },
    })

    // 5. Bounced emails in last hour (from email_outbox)
    // Only track the business metric — don't raise a Sentry alert here.
    // Email delivery and Resend's own dashboard flag the domain-level issue.
    // Spam-rate SLO is the
    // real concern; single-bounce spikes are almost always one bad address.
    await runAlertSection({
      section: "email_bounced",
      alerts,
      onFailure: onSectionFailure,
      run: async () => {
        const { count, error } = await supabase
          .from("email_outbox")
          .select("id", { count: "exact", head: true })
          .eq("delivery_status", "bounced")
          .gte("delivery_status_updated_at", oneHourAgo.toISOString())
        if (error) throw new Error(`Bounced-email count failed: ${error.message}`)
        bouncedEmails = count ?? 0

        if (bouncedEmails >= 5) {
          // Only track `critical` tier (>=5/hr sustained). No duplicate Sentry
          // alert in the loop below — metric goes to PostHog for trending only.
          trackBusinessMetric({
            metric: "email_bounced",
            severity: "critical",
            metadata: { count: bouncedEmails, window: "1h" },
          })
        }
      },
    })

    // 6. Emails stuck in pending status for more than 30 minutes
    await runAlertSection({
      section: "email_stuck_pending",
      alerts,
      onFailure: onSectionFailure,
      run: async () => {
        const thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000)
        const { count, error } = await supabase
          .from("email_outbox")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending")
          .lt("created_at", thirtyMinAgo.toISOString())
          .lt("retry_count", 10)
        if (error) throw new Error(`Stuck-pending email count failed: ${error.message}`)
        stuckPending = count ?? 0

        if (stuckPending >= 5) {
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
      },
    })

    // 7. High-risk intakes waiting in queue
    await runAlertSection({
      section: "high_risk_intake",
      alerts,
      onFailure: onSectionFailure,
      run: async () => {
        const { count, error } = await filterSeededE2EIntakes(supabase
          .from("intakes")
          .select("id", { count: "exact", head: true })
          .in("status", ["paid", "in_review"])
          .eq("payment_status", "paid")
          .in("risk_tier", ["high", "critical"]))
        if (error) throw new Error(`High-risk queue count failed: ${error.message}`)
        highRiskWaiting = count ?? 0

        if (highRiskWaiting > 0) {
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
      },
    })

    // 8. Critical email delivery SLA - med_cert_patient and script_sent must be delivered within 10 min
    await runAlertSection({
      section: "email_delivery_sla_breach",
      alerts,
      onFailure: onSectionFailure,
      run: async () => {
        const tenMinAgo = new Date(now.getTime() - 10 * 60 * 1000)
        const { count, error } = await supabase
          .from("email_outbox")
          .select("id", { count: "exact", head: true })
          .in("email_type", ["med_cert_patient", "script_sent"])
          .in("status", ["sent"])
          .neq("delivery_status", "delivered")
          .lt("sent_at", tenMinAgo.toISOString())
          .gte("sent_at", oneHourAgo.toISOString())
        if (error) throw new Error(`Email delivery SLA count failed: ${error.message}`)
        slaBreaches = count ?? 0

        if (slaBreaches > 0) {
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
      },
    })

    // 9. Weekly ops invariants promoted from dashboard-only visibility to alerting.
    await runAlertSection({
      section: "ops_invariants",
      alerts,
      onFailure: onSectionFailure,
      run: async () => {
        operationalInvariants = await getOperationalInvariants(supabase)
        const invariantAlerts = buildOperationalInvariantAlerts(operationalInvariants)

        for (const alert of invariantAlerts) {
          alerts.push(alert)
          trackBusinessMetric({
            metric: alert.metric,
            severity: alert.severity,
            metadata: { count: alert.count },
          })
        }
      },
    })

    // 10. Human-required (Rx/consult) queue stalled >24h. Medical certificates
    // auto-approve at all hours, so a stalled HUMAN queue means the operator may
    // be unavailable and paid scripts/consults are piling up. Per the 2026-06-11
    // decision we alert through Sentry; we do NOT
    // auto-pause the service. See lib/monitoring/stale-human-queue.ts.
    await runAlertSection({
      section: "stale_human_queue",
      alerts,
      onFailure: onSectionFailure,
      run: async () => {
        const staleHumanThreshold = new Date(
          now.getTime() - STALE_HUMAN_QUEUE_THRESHOLD_HOURS * 60 * 60 * 1000,
        )
        const { data: staleHumanRows, count, error } = await filterSeededE2EIntakes(
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
        if (error) throw new Error(`Stale human queue count failed: ${error.message}`)
        staleHumanCount = count ?? 0

        const staleHumanAlert = buildStaleHumanQueueAlert(
          staleHumanRows?.[0]?.paid_at ?? null,
          staleHumanCount,
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
      },
    })

    // 11. Paid prescribing fulfilment is never allowed to disappear between
    // doctor approval, Parchment handoff, script evidence, and patient
    // notification. Alerts remain aggregate-only and contain no intake IDs.
    await runAlertSection({
      section: "prescription_fulfilment",
      alerts,
      onFailure: onSectionFailure,
      run: async () => {
        prescriptionFulfilment = await getPrescriptionFulfilmentDashboard(supabase)
        const fulfilmentAlerts = buildPrescriptionFulfilmentSlaAlerts(
          prescriptionFulfilment,
        )

        for (const alert of fulfilmentAlerts) {
          alerts.push(alert)
          trackBusinessMetric({
            metric: alert.metric,
            severity: alert.severity,
            metadata: alert.metadata,
          })
        }
      },
    })

    // 12. Every auto-approved medical certificate must receive one individual
    // doctor outcome within InstantMed's 24-hour governance window. This check
    // is aggregate-only: alert payloads never include intake or patient IDs.
    await runAlertSection({
      section: "med_cert_batch_review",
      alerts,
      onFailure: onSectionFailure,
      run: async () => {
        batchReviewHealth = await getBatchReviewHealth(supabase, now)
        if (batchReviewHealth.queryFailed) {
          throw new Error("Medical-certificate batch-review aggregate query failed")
        }
        const batchReviewAlert = buildBatchReviewOverdueAlert(batchReviewHealth, now)
        if (batchReviewAlert) {
          const oldestApprovedMs = batchReviewHealth.oldestApprovedAt
            ? new Date(batchReviewHealth.oldestApprovedAt).getTime()
            : Number.NaN
          alerts.push(batchReviewAlert)
          trackBusinessMetric({
            metric: "med_cert_batch_review_overdue",
            severity: batchReviewAlert.severity,
            metadata: {
              pending_count: batchReviewHealth.pending,
              overdue_count: batchReviewHealth.overdue,
              oldest_age_hours: Number.isFinite(oldestApprovedMs)
                ? Math.max(0, Math.floor((now.getTime() - oldestApprovedMs) / 3_600_000))
                : null,
            },
          })
        }
      },
    })

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

      // Essential criticals also reach the operator's Telegram (operator
      // decision 2026-07-17). Criticals ONLY — warnings stay Sentry-side, so
      // Telegram never becomes a general second alerting channel. Detail
      // strings are the same aggregate PHI-free text the Sentry capture uses.
      await sendCriticalBusinessAlertViaTelegram(
        criticalAlerts.map((a) => a.detail).join("; "),
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

    // Explicit casts: the values are assigned inside section closures, so
    // TS control-flow narrows the `let`s to their `null` initializers here.
    const invariants = operationalInvariants as OperationalInvariants | null
    const noPurchase = noPurchaseWindow as NoPurchaseRevenueWindow | null
    const batchReviews = batchReviewHealth as BatchReviewHealth | null
    const fulfilment = prescriptionFulfilment as PrescriptionFulfilmentDashboard | null

    return NextResponse.json({
      success: true,
      alerts,
      metrics: {
        failed_payments: failedPayments ?? 0,
        email_failures: emailFailures ?? 0,
        auth_email_failures: authEmailFailures,
        bounced_emails: bouncedEmails ?? 0,
        stuck_pending_emails: stuckPending ?? 0,
        high_risk_waiting: highRiskWaiting ?? 0,
        email_sla_breaches: slaBreaches ?? 0,
        no_purchase_window: noPurchase
          ? {
              window_hours: noPurchase.windowHours,
              paid_intakes: noPurchase.paidIntakes,
              created_intakes: noPurchase.createdIntakes,
              checkout_stage_intakes: noPurchase.checkoutStageIntakes,
              partial_drafts: noPurchase.partialDrafts,
            }
          : null,
        google_ads_purchase_import_health: googleAdsPurchaseImportHealth,
        google_ads_upload_stream: googleAdsUploadStreamHealth,
        google_ads_adjustment_health: googleAdsAdjustmentHealth,
        rx_consult_queue_stalled: staleHumanCount ?? 0,
        prescription_fulfilment: fulfilment
          ? {
              total: fulfilment.total,
              stages: fulfilment.stages.map((stage) => ({
                stage: stage.key,
                count: stage.count,
                sla_minutes: stage.slaMinutes,
                sla_breached: stage.slaBreachedCount,
                oldest_minutes: stage.oldestMinutes,
              })),
            }
          : null,
        med_cert_batch_review: batchReviews
          ? {
              pending: batchReviews.pending,
              overdue: batchReviews.overdue,
              oldest_approved_at: batchReviews.oldestApprovedAt,
              query_failed: batchReviews.queryFailed,
            }
          : null,
        ops_sla_breach_backlog: invariants?.slaBreachBacklog ?? null,
        ops_cert_refund_orphans: invariants?.certRefundOrphans ?? null,
        ops_refund_record_anomalies: invariants?.refundRecordAnomalies ?? null,
        ops_paid_but_cancelled: invariants?.paidButCancelled ?? 0,
        ops_approved_certificate_missing_record: invariants?.approvedCertificateMissingRecord ?? 0,
        ops_certificate_sent_missing_timestamp: invariants?.certificateSentMissingTimestamp ?? 0,
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
