import "server-only"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { logger } from "@/lib/observability/logger"
import type { DashboardAnalytics } from "@/types/db"

/**
 * Get comprehensive analytics for the admin dashboard
 */
export async function getDashboardAnalytics(): Promise<DashboardAnalytics> {
  const supabase = createServiceRoleClient()

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7).toISOString()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  // Fetch all intakes for the month for aggregations (intakes is single source of truth)
  const { data: monthIntakes, error: intakesError } = await supabase
    .from("intakes")
    .select("id, status, created_at, reviewed_at, payment_status, service:services(name, type)")
    .gte("created_at", monthStart)
    .order("created_at", { ascending: true })

  if (intakesError) {
    logger.error("Error fetching intakes for analytics", { 
      error: intakesError instanceof Error ? intakesError.message : String(intakesError) 
    })
  }

  const requests = monthIntakes || []

  // Fetch payments for revenue
  const { data: monthPayments, error: paymentsError } = await supabase
    .from("payments")
    .select("amount, created_at, status")
    .eq("status", "paid")
    .gte("created_at", monthStart)

  if (paymentsError) {
    logger.error("Error fetching payments for analytics", { error: paymentsError })
  }

  const payments = monthPayments || []

  // Calculate request counts
  const requestsToday = requests.filter((r) => r.created_at >= todayStart).length
  const requestsThisWeek = requests.filter((r) => r.created_at >= weekStart).length
  const requestsThisMonth = requests.length

  // Calculate approval rate
  const completedRequests = requests.filter((r) => r.status === "approved" || r.status === "declined")
  const approvedRequests = requests.filter((r) => r.status === "approved")
  const approvalRate =
    completedRequests.length > 0 ? Math.round((approvedRequests.length / completedRequests.length) * 100) : 0

  // Calculate average review time
  const reviewedRequests = requests.filter((r) => r.reviewed_at && r.created_at)
  let avgReviewTimeHours = 0
  if (reviewedRequests.length > 0) {
    const totalHours = reviewedRequests.reduce((sum, r) => {
      const created = new Date(r.created_at).getTime()
      const reviewed = new Date(r.reviewed_at!).getTime()
      return sum + (reviewed - created) / (1000 * 60 * 60)
    }, 0)
    avgReviewTimeHours = Math.round((totalHours / reviewedRequests.length) * 10) / 10
  }

  // Calculate revenue
  const revenueToday = payments.filter((p) => p.created_at >= todayStart).reduce((sum, p) => sum + p.amount, 0) / 100
  const revenueThisWeek = payments.filter((p) => p.created_at >= weekStart).reduce((sum, p) => sum + p.amount, 0) / 100
  const revenueThisMonth = payments.reduce((sum, p) => sum + p.amount, 0) / 100

  // Requests by type
  const typeCount: Record<string, number> = {}
  requests.forEach((r) => {
    const serviceData = r.service as { name?: string; type?: string } | null
    const type = serviceData?.type || "other"
    typeCount[type] = (typeCount[type] || 0) + 1
  })
  const requestsByType = Object.entries(typeCount).map(([type, count]) => ({ type, count }))

  // Requests by hour (for heatmap)
  const hourCount: Record<number, number> = {}
  for (let i = 0; i < 24; i++) hourCount[i] = 0
  requests.forEach((r) => {
    const hour = new Date(r.created_at).getHours()
    hourCount[hour] = (hourCount[hour] || 0) + 1
  })
  const requestsByHour = Object.entries(hourCount).map(([hour, count]) => ({
    hour: Number.parseInt(hour),
    count,
  }))

  // Requests by day (last 30 days)
  const dayCount: Record<string, number> = {}
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    dayCount[date.toISOString().split("T")[0]] = 0
  }
  requests.forEach((r) => {
    const date = r.created_at.split("T")[0]
    if (dayCount[date] !== undefined) {
      dayCount[date] = (dayCount[date] || 0) + 1
    }
  })
  const requestsByDay = Object.entries(dayCount).map(([date, count]) => ({ date, count }))

  return {
    requests_today: requestsToday,
    requests_this_week: requestsThisWeek,
    requests_this_month: requestsThisMonth,
    avg_review_time_hours: avgReviewTimeHours,
    approval_rate: approvalRate,
    revenue_today: revenueToday,
    revenue_this_week: revenueThisWeek,
    revenue_this_month: revenueThisMonth,
    requests_by_type: requestsByType,
    requests_by_hour: requestsByHour,
    requests_by_day: requestsByDay,
  }
}
