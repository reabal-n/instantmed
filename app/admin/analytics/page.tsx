import { requireRole } from "@/lib/auth"
import { redirect } from "next/navigation"
import { AnalyticsDashboardClient } from "./analytics-client"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { getDoctorDashboardStats, getIntakeMonitoringStats } from "@/lib/data/intakes"

export const dynamic = "force-dynamic"

export default async function AnalyticsDashboardPage() {
  const authUser = await requireRole(["admin"], { redirectTo: "/" })

  if (!authUser) {
    redirect("/")
  }

  const supabase = createServiceRoleClient()

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)

  // Fetch all analytics data in parallel using allSettled for resilience
  const results = await Promise.allSettled([
    // [0] Page views / sessions from audit logs
    supabase
      .from("audit_logs")
      .select("id", { count: "exact", head: true })
      .gte("created_at", monthAgo.toISOString())
      .in("action", ["page_view", "session_start"]),

    // [1] Started intakes (created)
    supabase
      .from("intakes")
      .select("id", { count: "exact", head: true })
      .gte("created_at", monthAgo.toISOString()),

    // [2] Paid intakes
    supabase
      .from("intakes")
      .select("id", { count: "exact", head: true })
      .gte("created_at", monthAgo.toISOString())
      .not("paid_at", "is", null),

    // [3] Completed intakes
    supabase
      .from("intakes")
      .select("id", { count: "exact", head: true })
      .gte("created_at", monthAgo.toISOString())
      .eq("status", "approved"),

    // [4] Intakes by day (last 30 days) with payment data
    supabase
      .from("intakes")
      .select("created_at, status, paid_at, amount_cents")
      .gte("created_at", monthAgo.toISOString())
      .order("created_at", { ascending: true }),

    // [5] Intakes by service type
    supabase
      .from("intakes")
      .select("category")
      .gte("created_at", monthAgo.toISOString()),

    // [6] Intakes by UTM source
    supabase
      .from("intakes")
      .select("utm_source, utm_medium, utm_campaign")
      .gte("created_at", monthAgo.toISOString())
      .not("utm_source", "is", null),

    // [7] Revenue data - paid intakes with amount
    supabase
      .from("intakes")
      .select("amount_cents, paid_at, created_at")
      .not("paid_at", "is", null)
      .gte("paid_at", monthAgo.toISOString()),

    // [8] Doctor dashboard stats
    getDoctorDashboardStats(),

    // [9] Monitoring stats (queue health, avg review time)
    getIntakeMonitoringStats(),

    // [10] This week's paid intakes for weekly revenue
    supabase
      .from("intakes")
      .select("amount_cents")
      .not("paid_at", "is", null)
      .gte("paid_at", weekAgo.toISOString()),

    // [11] Today's paid intakes for daily revenue
    supabase
      .from("intakes")
      .select("amount_cents")
      .not("paid_at", "is", null)
      .gte("paid_at", today.toISOString()),
  ])

  // Extract results with safe fallbacks
  const totalVisitsResult = results[0].status === "fulfilled" ? results[0].value : { count: 0 }
  const startedIntakesResult = results[1].status === "fulfilled" ? results[1].value : { count: 0 }
  const paidIntakesResult = results[2].status === "fulfilled" ? results[2].value : { count: 0 }
  const completedIntakesResult = results[3].status === "fulfilled" ? results[3].value : { count: 0 }
  const intakesByDayResult = results[4].status === "fulfilled" ? results[4].value : { data: [] }
  const intakesByServiceResult = results[5].status === "fulfilled" ? results[5].value : { data: [] }
  const intakesBySourceResult = results[6].status === "fulfilled" ? results[6].value : { data: [] }
  const revenueResult = results[7].status === "fulfilled" ? results[7].value : { data: [] }
  const dashboardStats = results[8].status === "fulfilled" ? results[8].value : {
    total: 0, in_queue: 0, approved: 0, declined: 0, pending_info: 0, scripts_pending: 0
  }
  const monitoringStats = results[9].status === "fulfilled" ? results[9].value : {
    todaySubmissions: 0, queueSize: 0, paidCount: 0, pendingCount: 0,
    approvedToday: 0, declinedToday: 0, avgReviewTimeMinutes: null, oldestInQueueMinutes: null
  }
  const weekRevenueResult = results[10].status === "fulfilled" ? results[10].value : { data: [] }
  const todayRevenueResult = results[11].status === "fulfilled" ? results[11].value : { data: [] }

  // Process daily data
  const dailyData: Record<string, { visits: number; started: number; paid: number; completed: number; revenue: number }> = {}

  for (let i = 29; i >= 0; i--) {
    const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
    const key = date.toISOString().split("T")[0]
    dailyData[key] = { visits: 0, started: 0, paid: 0, completed: 0, revenue: 0 }
  }

  if (intakesByDayResult.data) {
    for (const intake of intakesByDayResult.data) {
      if (!intake.created_at) continue
      const key = intake.created_at.split("T")[0]
      if (dailyData[key]) {
        dailyData[key].started++
        if (intake.status === "approved") {
          dailyData[key].completed++
        }
        if (intake.paid_at) {
          dailyData[key].paid++
        }
        if (intake.amount_cents) {
          dailyData[key].revenue += Number(intake.amount_cents) || 0
        }
      }
    }
  }

  // Process service type data
  const serviceTypeCounts: Record<string, number> = {}
  if (intakesByServiceResult.data) {
    for (const intake of intakesByServiceResult.data) {
      const type = intake.category || "unknown"
      serviceTypeCounts[type] = (serviceTypeCounts[type] || 0) + 1
    }
  }

  // Process UTM source data
  const sourceCounts: Record<string, number> = {}
  if (intakesBySourceResult.data) {
    for (const intake of intakesBySourceResult.data) {
      const source = intake.utm_source || "direct"
      sourceCounts[source] = (sourceCounts[source] || 0) + 1
    }
  }

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
      visits: totalVisitsResult.count || 0,
      started: startedIntakesResult.count || 0,
      paid: paidIntakesResult.count || 0,
      completed: completedIntakesResult.count || 0,
    },
    dailyData: Object.entries(dailyData).map(([date, data]) => ({
      date,
      ...data,
    })),
    serviceTypes: Object.entries(serviceTypeCounts).map(([type, count]) => ({
      type,
      count,
    })),
    sources: Object.entries(sourceCounts).map(([source, count]) => ({
      source,
      count,
    })),
    revenue: {
      today: todayRevenue,
      thisWeek: weekRevenue,
      thisMonth: monthRevenue,
    },
    queueHealth: {
      queueSize: monitoringStats.queueSize,
      avgReviewTimeMinutes: monitoringStats.avgReviewTimeMinutes,
      oldestInQueueMinutes: monitoringStats.oldestInQueueMinutes,
      todaySubmissions: monitoringStats.todaySubmissions,
      approvedToday: monitoringStats.approvedToday,
      declinedToday: monitoringStats.declinedToday,
    },
    overview: {
      total: dashboardStats.total,
      inQueue: dashboardStats.in_queue,
      approved: dashboardStats.approved,
      declined: dashboardStats.declined,
      pendingInfo: dashboardStats.pending_info,
      scriptsPending: dashboardStats.scripts_pending,
    },
  }

  return <AnalyticsDashboardClient analytics={analytics} />
}
