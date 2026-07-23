import { getAiAttributionBreakdown } from "@/lib/admin/ai-attribution-breakdown"
import { getHeardAboutUsBreakdown } from "@/lib/admin/heard-about-us-breakdown"
import { buildOperatorBrief } from "@/lib/admin/operator-brief"
import {
  buildDegradedReviewRequestFunnelSnapshot,
  getReviewRequestFunnelSnapshot,
} from "@/lib/admin/review-request-funnel"
import { EMPTY_GOOGLE_ADS_HEALTH, getGoogleAdsHealth } from "@/lib/analytics/google-ads-health"
import { getGoogleAdsSpendAuditReport } from "@/lib/analytics/google-ads-report"
import { buildGoogleAdsReturnSnapshot } from "@/lib/analytics/google-ads-return-summary"
import {
  buildSkippedPostHogIntakeFunnelSnapshot,
  getPostHogIntakeFunnelSnapshot,
} from "@/lib/analytics/posthog-intake-funnel"
import { requireRole } from "@/lib/auth/helpers"
import { getGeographicBreakdown } from "@/lib/data/analytics-geographic"
import {
  buildBusinessOperatingScorecard,
  getBusinessOperatingScorecardSource,
} from "@/lib/data/business-scorecard"
import { getIntakeMonitoringStats } from "@/lib/data/intakes"
import { getRecoveryScorecard } from "@/lib/data/recovery-scorecard"
import { filterReportableIntakes } from "@/lib/data/reporting-filters"
import { getRevenueDashboard } from "@/lib/data/revenue-dashboard"
import {
  EMPTY_PRESCRIPTION_FULFILMENT_DASHBOARD,
  getPrescriptionFulfilmentDashboard,
} from "@/lib/parchment/fulfilment-dashboard"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

import { AnalyticsDashboardClient } from "./analytics-client"

export const dynamic = "force-dynamic"

export default async function AnalyticsDashboardPage() {
  await requireRole(["admin"])

  const supabase = createServiceRoleClient()

  const now = new Date()
  const last30DaysStartMs = now.getTime() - 30 * 24 * 60 * 60 * 1000
  const last30DaysStart = new Date(last30DaysStartMs)

  // Fetch only the operator analytics worth keeping on one screen: revenue truth,
  // conversion, acquisition, and queue health. `getRevenueDashboard()` owns the
  // canonical Australia/Sydney revenue windows, daily trend, service mix, and
  // payment pressure (this is what the standalone Payments page used to render).
  const results = await Promise.allSettled([
    // [0] Started intakes (created, 30d)
    filterReportableIntakes(supabase
      .from("intakes")
      .select("id", { count: "exact", head: true })
      .gte("created_at", last30DaysStart.toISOString())),

    // [1] Paid intakes (30d)
    filterReportableIntakes(supabase
      .from("intakes")
      .select("id", { count: "exact", head: true })
      .gte("created_at", last30DaysStart.toISOString())
      .not("paid_at", "is", null)),

    // [2] Completed intakes (approved, 30d)
    filterReportableIntakes(supabase
      .from("intakes")
      .select("id", { count: "exact", head: true })
      .gte("created_at", last30DaysStart.toISOString())
      .eq("status", "approved")),

    // [3] Monitoring stats (queue health, avg review time)
    getIntakeMonitoringStats(),

    // [4] Google Ads upload health
    getGoogleAdsHealth(supabase),

    // [5] Prescription fulfilment handoff state
    getPrescriptionFulfilmentDashboard(supabase),

    // [6] Patients by state (30d window, top 5 + unknown)
    getGeographicBreakdown(),

    // [7] Operating scorecard inputs; canonical revenue is injected after reads settle
    getBusinessOperatingScorecardSource(supabase, now),

    // [8] Google Ads return readout: spend joined to local paid-order revenue
    getGoogleAdsSpendAuditReport({ days: 30, now, supabase }),

    // [9] Recovery funnel: partial intakes, recovery sends, and recovered revenue
    getRecoveryScorecard(supabase, now, 30),

    // [10] PostHog product funnel: aggregate-only step friction and drop-off
    getPostHogIntakeFunnelSnapshot({ days: 30, now }),

    // [11] Self-reported acquisition source
    getHeardAboutUsBreakdown(supabase, { days: 30 }),

    // [12] Persisted AI-assistant UTM source attribution
    getAiAttributionBreakdown(supabase, { weeks: 8 }),

    // [13] Canonical revenue dashboard (windows, daily trend, service mix, pressure)
    getRevenueDashboard(supabase, now),

    // [14] Aggregate-only review request funnel + manual external total snapshots
    getReviewRequestFunnelSnapshot(supabase, now),
  ])

  const startedIntakesResult = results[0].status === "fulfilled" ? results[0].value : { count: 0 }
  const paidIntakesResult = results[1].status === "fulfilled" ? results[1].value : { count: 0 }
  const completedIntakesResult = results[2].status === "fulfilled" ? results[2].value : { count: 0 }
  const monitoringStats = results[3].status === "fulfilled" ? results[3].value : {
    queueSize: 0,
    avgReviewTimeMinutes: null,
    oldestInQueueMinutes: null,
  }
  const googleAds = results[4].status === "fulfilled" ? results[4].value : EMPTY_GOOGLE_ADS_HEALTH
  const prescriptionFulfilment = results[5].status === "fulfilled"
    ? results[5].value
    : EMPTY_PRESCRIPTION_FULFILMENT_DASHBOARD
  const geographic = results[6].status === "fulfilled"
    ? results[6].value
    : { windowDays: 30, totalPatients: 0, topStates: [], unknownCount: 0 }
  const businessScorecardSource = results[7].status === "fulfilled"
    ? results[7].value
    : null
  const googleAdsReturn = results[8].status === "fulfilled"
    ? buildGoogleAdsReturnSnapshot(results[8].value)
    : null
  const recoveryScorecard = results[9].status === "fulfilled"
    ? results[9].value
    : null
  const intakeFunnel = results[10].status === "fulfilled"
    ? results[10].value
    : buildSkippedPostHogIntakeFunnelSnapshot({
      days: 30,
      now,
      reason: "PostHog funnel query failed before returning a snapshot.",
    })
  const heardAboutUs = results[11].status === "fulfilled"
    ? results[11].value
    : { answered: 0, paidTotal: 0, rows: [] }
  const aiAttribution = results[12].status === "fulfilled"
    ? results[12].value
    : { weeks: 8, totalAiOrders: 0, paidTotal: 0, bySource: [], weekly: [] }
  // The revenue dashboard is the single source of payment truth and already fails
  // soft internally, so a rejected promise here is effectively impossible; if it
  // ever happens, the route-level error.tsx is the right surface.
  const revenueDashboard = results[13].status === "fulfilled" ? results[13].value : null
  if (!revenueDashboard) {
    throw new Error("Revenue dashboard unavailable")
  }
  const reviewRequestFunnel = results[14].status === "fulfilled"
    ? results[14].value
    : buildDegradedReviewRequestFunnelSnapshot(now)
  const rolling30DayWindow = revenueDashboard.windows.find(
    (window) => window.key === "last30Days",
  )
  const rolling30DayNetCents = revenueDashboard.sourceAvailability.revenue === "available"
    ? rolling30DayWindow?.netCents ?? 0
    : null
  const businessScorecard = businessScorecardSource && rolling30DayNetCents !== null
    ? buildBusinessOperatingScorecard({
        ...businessScorecardSource,
        rolling30DayNetRetainedCents: rolling30DayNetCents,
      })
    : null
  const adsHealthAvailable = results[4].status === "fulfilled"
  const adsReportAvailable = results[8].status === "fulfilled"
  const adsReportDegraded = googleAdsReturn !== null && googleAdsReturn.queryErrorCount > 0
  const recoveryScorecardAvailable = results[9].status === "fulfilled"
  const recoveryAvailability = recoveryScorecardAvailable &&
    revenueDashboard.sourceAvailability.recovery === "available"
    ? "available"
    : !recoveryScorecardAvailable && revenueDashboard.sourceAvailability.recovery === "unavailable"
      ? "unavailable"
      : "degraded"
  const operatorBrief = buildOperatorBrief({
    revenue: rolling30DayNetCents === null
      ? { availability: "unavailable" }
      : {
          availability: "available",
          value: { rolling30DayNetCents },
        },
    queue: results[3].status === "fulfilled"
      ? {
          availability: "available",
          value: {
            waitingCount: monitoringStats.queueSize,
            oldestWaitingMinutes: monitoringStats.oldestInQueueMinutes,
          },
        }
      : { availability: "unavailable" },
    recovery: recoveryAvailability === "unavailable"
      ? { availability: "unavailable" }
      : {
          availability: recoveryAvailability,
          value: {
            criticalIssueCount: revenueDashboard.sourceAvailability.recovery === "unavailable"
              ? 0
              : revenueDashboard.refundWork.failedRefunds,
            warningIssueCount:
              (revenueDashboard.sourceAvailability.recovery === "unavailable"
                ? 0
                : Math.max(
                    0,
                    revenueDashboard.refundWork.openRefundWork - revenueDashboard.refundWork.failedRefunds,
                  )) + (recoveryScorecard?.measurementWarnings.length ?? 0),
          },
        },
    ads: !adsHealthAvailable && !adsReportAvailable
      ? { availability: "unavailable" }
      : {
          availability: adsHealthAvailable && adsReportAvailable && !adsReportDegraded
            ? "available"
            : "degraded",
          value: {
            configurationSeverity: googleAds.configuration.severity,
            failedUploads: googleAds.failed,
            missingUploads: googleAds.missingUpload,
            queryErrorCount: googleAdsReturn?.queryErrorCount ?? 0,
          },
        },
  })

  const analytics = {
    generatedAt: revenueDashboard.generatedAt,
    funnel: {
      started: startedIntakesResult.count || 0,
      paid: paidIntakesResult.count || 0,
      completed: completedIntakesResult.count || 0,
    },
    revenue: revenueDashboard,
    queueHealth: {
      queueSize: monitoringStats.queueSize,
      avgReviewTimeMinutes: monitoringStats.avgReviewTimeMinutes,
      oldestInQueueMinutes: monitoringStats.oldestInQueueMinutes,
    },
    googleAds,
    googleAdsReturn,
    intakeFunnel,
    heardAboutUs,
    aiAttribution,
    recoveryScorecard,
    prescriptionFulfilment,
    businessScorecard,
    operatorBrief,
    reviewRequestFunnel,
  }

  return (
    <AnalyticsDashboardClient
      analytics={analytics}
      geographic={geographic}
    />
  )
}
