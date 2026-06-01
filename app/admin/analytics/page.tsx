import { EMPTY_GOOGLE_ADS_HEALTH, getGoogleAdsHealth } from "@/lib/analytics/google-ads-health"
import { requireRole } from "@/lib/auth/helpers"
import { getGeographicBreakdown } from "@/lib/data/analytics-geographic"
import { getBusinessOperatingScorecard } from "@/lib/data/business-scorecard"
import { getIntakeMonitoringStats } from "@/lib/data/intakes"
import { filterReportableIntakes } from "@/lib/data/reporting-filters"
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
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)

  // Fetch only the operator analytics that are worth keeping: revenue,
  // conversion, and queue health. Anything deeper belongs in PostHog or ops.
  const results = await Promise.allSettled([
    // [0] Started intakes (created)
    filterReportableIntakes(supabase
      .from("intakes")
      .select("id", { count: "exact", head: true })
      .gte("created_at", monthAgo.toISOString())),

    // [1] Paid intakes
    filterReportableIntakes(supabase
      .from("intakes")
      .select("id", { count: "exact", head: true })
      .gte("created_at", monthAgo.toISOString())
      .not("paid_at", "is", null)),

    // [2] Completed intakes
    filterReportableIntakes(supabase
      .from("intakes")
      .select("id", { count: "exact", head: true })
      .gte("created_at", monthAgo.toISOString())
      .eq("status", "approved")),

    // [3] Revenue data - paid intakes with amount
    filterReportableIntakes(supabase
      .from("intakes")
      .select("amount_cents, paid_at, created_at")
      .not("paid_at", "is", null)
      .gte("paid_at", monthAgo.toISOString())),

    // [4] Monitoring stats (queue health, avg review time)
    getIntakeMonitoringStats(),

    // [5] This week's paid intakes for weekly revenue
    filterReportableIntakes(supabase
      .from("intakes")
      .select("amount_cents")
      .not("paid_at", "is", null)
      .gte("paid_at", weekAgo.toISOString())),

    // [6] Today's paid intakes for daily revenue
    filterReportableIntakes(supabase
      .from("intakes")
      .select("amount_cents")
      .not("paid_at", "is", null)
      .gte("paid_at", today.toISOString())),

    // [7] Google Ads upload health
    getGoogleAdsHealth(supabase),

    // [8] Prescription fulfilment handoff state
    getPrescriptionFulfilmentDashboard(supabase),

    // [9] Patients by state (30d window, top 5 + unknown)
    getGeographicBreakdown(),

    // [10] Operating scorecard: revenue, capacity, support load, and hire triggers
    getBusinessOperatingScorecard(supabase, now),
  ])

  // Extract results with safe fallbacks
  const startedIntakesResult = results[0].status === "fulfilled" ? results[0].value : { count: 0 }
  const paidIntakesResult = results[1].status === "fulfilled" ? results[1].value : { count: 0 }
  const completedIntakesResult = results[2].status === "fulfilled" ? results[2].value : { count: 0 }
  const revenueResult = results[3].status === "fulfilled" ? results[3].value : { data: [] }
  const monitoringStats = results[4].status === "fulfilled" ? results[4].value : {
    queueSize: 0,
    avgReviewTimeMinutes: null,
    oldestInQueueMinutes: null,
  }
  const weekRevenueResult = results[5].status === "fulfilled" ? results[5].value : { data: [] }
  const todayRevenueResult = results[6].status === "fulfilled" ? results[6].value : { data: [] }
  const googleAds = results[7].status === "fulfilled" ? results[7].value : EMPTY_GOOGLE_ADS_HEALTH
  const prescriptionFulfilment = results[8].status === "fulfilled"
    ? results[8].value
    : EMPTY_PRESCRIPTION_FULFILMENT_DASHBOARD
  const geographic = results[9].status === "fulfilled"
    ? results[9].value
    : { windowDays: 30, totalPatients: 0, topStates: [], unknownCount: 0 }
  const businessScorecard = results[10].status === "fulfilled"
    ? results[10].value
    : null

  // Calculate revenue totals
  const monthRevenue = (revenueResult.data || []).reduce(
    (sum: number, r: { amount_cents?: number | string | null }) => sum + (Number(r.amount_cents) || 0), 0
  )
  const weekRevenue = (weekRevenueResult.data || []).reduce(
    (sum: number, r: { amount_cents?: number | string | null }) => sum + (Number(r.amount_cents) || 0), 0
  )
  const todayRevenue = (todayRevenueResult.data || []).reduce(
    (sum: number, r: { amount_cents?: number | string | null }) => sum + (Number(r.amount_cents) || 0), 0
  )

  const analytics = {
    funnel: {
      started: startedIntakesResult.count || 0,
      paid: paidIntakesResult.count || 0,
      completed: completedIntakesResult.count || 0,
    },
    revenue: {
      today: todayRevenue,
      thisWeek: weekRevenue,
      thisMonth: monthRevenue,
    },
    queueHealth: {
      queueSize: monitoringStats.queueSize,
      avgReviewTimeMinutes: monitoringStats.avgReviewTimeMinutes,
      oldestInQueueMinutes: monitoringStats.oldestInQueueMinutes,
    },
    googleAds,
    prescriptionFulfilment,
    businessScorecard,
  }

  return (
    <AnalyticsDashboardClient
      analytics={analytics}
      geographic={geographic}
    />
  )
}
