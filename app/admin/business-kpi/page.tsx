import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { BusinessKPIClient } from "./business-kpi-client"

export const dynamic = "force-dynamic"

export default async function BusinessKPIDashboardPage() {
  const supabase = createServiceRoleClient()
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
  const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
  const prevWeekStart = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000)

  // Fetch all KPI data in parallel
  const results = await Promise.allSettled([
    // [0] Revenue this month (all paid intakes)
    supabase
      .from("intakes")
      .select("amount_cents, paid_at, category")
      .not("paid_at", "is", null)
      .gte("paid_at", monthAgo.toISOString()),

    // [1] Revenue by day (last 30 days) for trend chart
    supabase
      .from("intakes")
      .select("amount_cents, paid_at")
      .not("paid_at", "is", null)
      .gte("paid_at", monthAgo.toISOString())
      .order("paid_at", { ascending: true }),

    // [2] Med certs issued today
    supabase
      .from("issued_certificates")
      .select("id", { count: "exact", head: true })
      .gte("created_at", today.toISOString())
      .eq("status", "valid"),

    // [3] Med certs issued this week
    supabase
      .from("issued_certificates")
      .select("id", { count: "exact", head: true })
      .gte("created_at", weekAgo.toISOString())
      .eq("status", "valid"),

    // [4] SLA: approved intakes with paid_at and approved_at (last 30 days)
    supabase
      .from("intakes")
      .select("paid_at, approved_at")
      .not("paid_at", "is", null)
      .not("approved_at", "is", null)
      .gte("paid_at", monthAgo.toISOString()),

    // [5] Active doctors count
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .in("role", ["doctor", "admin"])
      .eq("is_active", true),

    // [6] Doctor reviews this week (intakes reviewed)
    supabase
      .from("intakes")
      .select("reviewed_by")
      .not("reviewed_by", "is", null)
      .gte("updated_at", weekAgo.toISOString())
      .in("status", ["approved", "declined"]),

    // [7] Email delivery stats (last 7 days)
    supabase
      .from("email_outbox")
      .select("status")
      .gte("created_at", weekAgo.toISOString()),

    // [8] Conversion funnel: started intakes (last 30 days)
    supabase
      .from("intakes")
      .select("id", { count: "exact", head: true })
      .gte("created_at", monthAgo.toISOString()),

    // [9] Conversion funnel: paid intakes (last 30 days)
    supabase
      .from("intakes")
      .select("id", { count: "exact", head: true })
      .gte("created_at", monthAgo.toISOString())
      .not("paid_at", "is", null),

    // [10] Conversion funnel: approved intakes (last 30 days)
    supabase
      .from("intakes")
      .select("id", { count: "exact", head: true })
      .gte("created_at", monthAgo.toISOString())
      .eq("status", "approved"),

    // [11] Top referral sources (UTM)
    supabase
      .from("intakes")
      .select("utm_source")
      .gte("created_at", monthAgo.toISOString())
      .not("utm_source", "is", null),

    // [12] Page views / sessions from audit_logs
    supabase
      .from("audit_logs")
      .select("id", { count: "exact", head: true })
      .gte("created_at", monthAgo.toISOString())
      .in("action", ["page_view", "session_start"]),

    // [13] Revenue previous week (for weekly trend)
    supabase
      .from("intakes")
      .select("amount_cents")
      .not("paid_at", "is", null)
      .gte("paid_at", prevWeekStart.toISOString())
      .lt("paid_at", weekAgo.toISOString()),

    // [14] Revenue this week
    supabase
      .from("intakes")
      .select("amount_cents")
      .not("paid_at", "is", null)
      .gte("paid_at", weekAgo.toISOString()),

    // [15] SLA breaches: paid intakes not yet approved past deadline
    supabase
      .from("intakes")
      .select("id", { count: "exact", head: true })
      .in("status", ["paid", "in_review", "pending_info"])
      .not("sla_deadline", "is", null)
      .lt("sla_deadline", now.toISOString()),

    // [16] Total active intakes (in queue)
    supabase
      .from("intakes")
      .select("id", { count: "exact", head: true })
      .in("status", ["paid", "in_review", "pending_info"]),

    // [17] Refunds this month
    supabase
      .from("intakes")
      .select("amount_cents")
      .not("refunded_at", "is", null)
      .gte("refunded_at", monthAgo.toISOString()),

    // [18] Today's revenue
    supabase
      .from("intakes")
      .select("amount_cents")
      .not("paid_at", "is", null)
      .gte("paid_at", today.toISOString()),
  ])

  // Helper to extract data safely
  const get = <T,>(index: number, fallback: T): T => {
    const r = results[index]
    if (r.status === "fulfilled" && "data" in r.value && r.value.data !== null) {
      return r.value.data as T
    }
    return fallback
  }
  const getCount = (index: number): number => {
    const r = results[index]
    if (r.status === "fulfilled" && "count" in r.value) return r.value.count || 0
    return 0
  }

  // === REVENUE METRICS ===
  const revenueData = get<Array<{ amount_cents: number; paid_at: string; category: string }>>(0, [])
  const totalRevenueMonth = revenueData.reduce((s, i) => s + (i.amount_cents || 0), 0) / 100

  const todayRevenueData = get<Array<{ amount_cents: number }>>(18, [])
  const todayRevenue = todayRevenueData.reduce((s, i) => s + (i.amount_cents || 0), 0) / 100

  const thisWeekRevenueData = get<Array<{ amount_cents: number }>>(14, [])
  const thisWeekRevenue = thisWeekRevenueData.reduce((s, i) => s + (i.amount_cents || 0), 0) / 100

  const prevWeekRevenueData = get<Array<{ amount_cents: number }>>(13, [])
  const prevWeekRevenue = prevWeekRevenueData.reduce((s, i) => s + (i.amount_cents || 0), 0) / 100

  const weeklyRevenueTrend = prevWeekRevenue > 0
    ? Math.round(((thisWeekRevenue - prevWeekRevenue) / prevWeekRevenue) * 100)
    : thisWeekRevenue > 0 ? 100 : 0

  // Revenue by day for chart
  const revenueByDayRaw = get<Array<{ amount_cents: number; paid_at: string }>>(1, [])
  const dailyRevenueMap: Record<string, number> = {}
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
    dailyRevenueMap[d.toISOString().split("T")[0]] = 0
  }
  for (const item of revenueByDayRaw) {
    if (item.paid_at) {
      const key = item.paid_at.split("T")[0]
      if (dailyRevenueMap[key] !== undefined) {
        dailyRevenueMap[key] += (item.amount_cents || 0) / 100
      }
    }
  }
  const dailyRevenue = Object.entries(dailyRevenueMap).map(([date, revenue]) => ({ date, revenue }))

  // === MED CERTS ===
  const certsToday = getCount(2)
  const certsThisWeek = getCount(3)

  // === SLA METRICS ===
  const slaData = get<Array<{ paid_at: string; approved_at: string }>>(4, [])
  let avgSlaMinutes = 0
  if (slaData.length > 0) {
    const totalMinutes = slaData.reduce((sum, item) => {
      const paid = new Date(item.paid_at).getTime()
      const approved = new Date(item.approved_at).getTime()
      return sum + (approved - paid) / 60000
    }, 0)
    avgSlaMinutes = Math.round(totalMinutes / slaData.length)
  }
  const slaBreaches = getCount(15)
  const activeQueueSize = getCount(16)

  // === DOCTOR UTILIZATION ===
  const activeDoctors = getCount(5)
  const doctorReviews = get<Array<{ reviewed_by: string }>>(6, [])
  const uniqueReviewers = new Set(doctorReviews.map(r => r.reviewed_by)).size
  const doctorUtilizationRate = activeDoctors > 0
    ? Math.round((uniqueReviewers / activeDoctors) * 100)
    : 0

  // === EMAIL DELIVERY ===
  const emailData = get<Array<{ status: string }>>(7, [])
  const emailSent = emailData.filter(e => e.status === "sent" || e.status === "skipped_e2e").length
  const emailFailed = emailData.filter(e => e.status === "failed").length
  const emailTotal = emailSent + emailFailed
  const emailDeliveryRate = emailTotal > 0 ? Math.round((emailSent / emailTotal) * 1000) / 10 : 100

  // === CONVERSION FUNNEL ===
  const pageViews = getCount(12)
  const intakesStarted = getCount(8)
  const intakesPaid = getCount(9)
  const intakesApproved = getCount(10)
  const conversionRate = intakesStarted > 0
    ? Math.round((intakesPaid / intakesStarted) * 1000) / 10
    : 0

  // === REFERRAL SOURCES ===
  const utmData = get<Array<{ utm_source: string }>>(11, [])
  const sourceCounts: Record<string, number> = {}
  for (const item of utmData) {
    const src = item.utm_source || "direct"
    sourceCounts[src] = (sourceCounts[src] || 0) + 1
  }
  const referralSources = Object.entries(sourceCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([source, count]) => ({ source, count }))

  // === REFUNDS ===
  const refundData = get<Array<{ amount_cents: number }>>(17, [])
  const totalRefundsMonth = refundData.reduce((s, i) => s + (i.amount_cents || 0), 0) / 100
  const refundRate = revenueData.length > 0
    ? Math.round((refundData.length / revenueData.length) * 1000) / 10
    : 0

  // === LAUNCH READINESS ===
  const checks = {
    hasRevenue: totalRevenueMonth > 0,
    hasCertificates: certsThisWeek > 0,
    slaHealthy: slaBreaches === 0,
    emailHealthy: emailDeliveryRate >= 95,
    doctorsActive: activeDoctors > 0,
    queueManageable: activeQueueSize <= 20,
    refundRateLow: refundRate < 10,
  }
  const passedChecks = Object.values(checks).filter(Boolean).length
  const totalChecks = Object.values(checks).length
  const readinessScore = Math.round((passedChecks / totalChecks) * 100)

  const kpiData = {
    revenue: {
      today: todayRevenue,
      thisWeek: thisWeekRevenue,
      thisMonth: totalRevenueMonth,
      weeklyTrend: weeklyRevenueTrend,
      daily: dailyRevenue,
    },
    certs: {
      today: certsToday,
      thisWeek: certsThisWeek,
    },
    sla: {
      avgMinutes: avgSlaMinutes,
      breaches: slaBreaches,
      queueSize: activeQueueSize,
    },
    doctors: {
      active: activeDoctors,
      utilizationRate: doctorUtilizationRate,
      reviewsThisWeek: doctorReviews.length,
    },
    email: {
      deliveryRate: emailDeliveryRate,
      sentThisWeek: emailSent,
      failedThisWeek: emailFailed,
    },
    funnel: {
      pageViews,
      started: intakesStarted,
      paid: intakesPaid,
      approved: intakesApproved,
      conversionRate,
    },
    referrals: referralSources,
    refunds: {
      totalMonth: totalRefundsMonth,
      rate: refundRate,
    },
    launchReadiness: {
      score: readinessScore,
      checks,
    },
  }

  return <BusinessKPIClient data={kpiData} />
}
