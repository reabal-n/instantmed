import { getBusinessAdsActionEvidence } from "@/lib/admin/business-ads-action"
import { buildBusinessReadModel } from "@/lib/admin/business-read-model"
import { buildBusinessTrends } from "@/lib/admin/business-trends"
import { getHeardAboutUsBreakdown } from "@/lib/admin/heard-about-us-breakdown"
import {
  buildUnavailableRecordedAttributionBreakdown,
  getRecordedAttributionBreakdown,
} from "@/lib/admin/recorded-attribution-breakdown"
import {
  buildUnavailableReleaseFrictionDashboardSnapshot,
  getReleaseFrictionDashboardSnapshot,
} from "@/lib/admin/release-friction-readout"
import {
  buildDegradedReviewRequestFunnelSnapshot,
  getReviewRequestFunnelSnapshot,
} from "@/lib/admin/review-request-funnel"
import {
  getLatestDeliveredAdsAgentRun,
  getRecentDeliveredAdsAgentRunDailySpend,
} from "@/lib/ads-agent/runs"
import {
  buildUnavailablePostHogCanonicalIntakeFunnelSnapshot,
  getPostHogCanonicalIntakeFunnelSnapshot,
} from "@/lib/analytics/posthog-canonical-intake-funnel"
import {
  buildUnavailablePostHogCheckoutRecoveryDashboardSnapshot,
  getPostHogCheckoutRecoveryDashboardSnapshot,
} from "@/lib/analytics/posthog-checkout-recovery"
import { requireRole } from "@/lib/auth/helpers"
import { getRevenueDashboard } from "@/lib/data/revenue-dashboard"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

import { AnalyticsDashboardClient } from "./analytics-client"
import type { BusinessPageData } from "./analytics-helpers"

export const dynamic = "force-dynamic"

export default async function AnalyticsDashboardPage() {
  await requireRole(["admin"])

  const now = new Date()
  const supabase = createServiceRoleClient()
  const reads = await Promise.allSettled([
    getRevenueDashboard(supabase, now),
    getLatestDeliveredAdsAgentRun(supabase),
    getPostHogCanonicalIntakeFunnelSnapshot({ days: 30, now }),
    getRecordedAttributionBreakdown(supabase, { days: 30, now }),
    getHeardAboutUsBreakdown(supabase, { days: 30 }),
    getReviewRequestFunnelSnapshot(supabase, now),
    getRecentDeliveredAdsAgentRunDailySpend(supabase),
    getReleaseFrictionDashboardSnapshot(supabase, { now }),
    getPostHogCheckoutRecoveryDashboardSnapshot({ now }),
  ])

  const revenueDashboard = reads[0].status === "fulfilled" ? reads[0].value : null
  const revenueWindow = revenueDashboard?.windows.find(
    ({ key }) => key === "last30Days",
  )
  const revenueAvailable =
    revenueDashboard?.sourceAvailability.revenue === "available" &&
    Boolean(revenueWindow)
  const adsRun = reads[1].status === "fulfilled"
    ? reads[1].value
    : { availability: "unavailable" as const, reason: "query_failed" as const, run: null }
  const adsAction = await getBusinessAdsActionEvidence({
    now,
    run: adsRun.run,
    supabase,
  })
  const business = buildBusinessReadModel({
    adsAction,
    adsRun,
    now,
    revenue: revenueAvailable
      ? {
          availability: "available",
          generatedAt: revenueDashboard.generatedAt,
          netRetainedCents: revenueWindow!.netCents,
          paidOrders: revenueWindow!.orderCount,
        }
      : {
          availability: "unavailable",
          generatedAt: revenueDashboard?.generatedAt ?? null,
          netRetainedCents: null,
          paidOrders: null,
        },
  })

  const spendLedger = reads[6].status === "fulfilled"
    ? reads[6].value
    : { availability: "unavailable" as const, days: [], reason: "query_failed" as const }
  const trends = buildBusinessTrends({
    business,
    revenue: revenueDashboard,
    run: adsRun.run,
    spendLedger,
  })

  const data: BusinessPageData = {
    business,
    checkoutRecovery: reads[8].status === "fulfilled"
      ? reads[8].value
      : buildUnavailablePostHogCheckoutRecoveryDashboardSnapshot(
          now,
          "posthog_request_failed",
        ),
    generatedAt: now.toISOString(),
    intakeFunnel: reads[2].status === "fulfilled"
      ? reads[2].value
      : buildUnavailablePostHogCanonicalIntakeFunnelSnapshot({
          days: 30,
          now,
          reason: "PostHog funnel read failed.",
        }),
    recordedAttribution: reads[3].status === "fulfilled"
      ? reads[3].value
      : buildUnavailableRecordedAttributionBreakdown(now, 30),
    heardAboutUs: reads[4].status === "fulfilled"
      ? reads[4].value
      : {
          availability: "unavailable",
          answered: null,
          paidTotal: null,
          rows: [],
        },
    reviewRequestFunnel: reads[5].status === "fulfilled"
      ? reads[5].value
      : buildDegradedReviewRequestFunnelSnapshot(now),
    releaseFriction: reads[7].status === "fulfilled"
      ? reads[7].value
      : buildUnavailableReleaseFrictionDashboardSnapshot(
          now,
          "release_measurement_read_failed",
        ),
    trends,
  }

  return <AnalyticsDashboardClient data={data} />
}
