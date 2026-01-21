import { getAuthenticatedUserWithProfile } from "@/lib/auth"
import { redirect } from "next/navigation"
import { FinanceDashboardClient } from "./finance-client"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const dynamic = "force-dynamic"

export default async function FinanceDashboardPage() {
  const authUser = await getAuthenticatedUserWithProfile()

  if (!authUser || authUser.profile.role !== "admin") {
    redirect("/")
  }

  const supabase = createServiceRoleClient()

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
  const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
  const yearAgo = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000)

  // Fetch financial data
  const [
    revenueResult,
    refundsResult,
    revenueByDayResult,
    revenueByServiceResult,
    pendingPaymentsResult,
    avgTransactionResult,
  ] = await Promise.all([
    // Total revenue (paid intakes)
    supabase
      .from("intakes")
      .select("amount_paid, paid_at")
      .not("paid_at", "is", null)
      .gte("paid_at", monthAgo.toISOString()),
    
    // Refunds
    supabase
      .from("intakes")
      .select("amount_paid, refunded_at")
      .not("refunded_at", "is", null)
      .gte("refunded_at", monthAgo.toISOString()),
    
    // Revenue by day
    supabase
      .from("intakes")
      .select("amount_paid, paid_at")
      .not("paid_at", "is", null)
      .gte("paid_at", monthAgo.toISOString())
      .order("paid_at", { ascending: true }),
    
    // Revenue by service type
    supabase
      .from("intakes")
      .select("service_type, amount_paid")
      .not("paid_at", "is", null)
      .gte("paid_at", monthAgo.toISOString()),
    
    // Pending payments
    supabase
      .from("intakes")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending_payment"),
    
    // For average calculation
    supabase
      .from("intakes")
      .select("amount_paid")
      .not("paid_at", "is", null)
      .gte("paid_at", yearAgo.toISOString()),
  ])

  // Calculate totals
  const totalRevenue = revenueResult.data?.reduce((sum, i) => sum + (i.amount_paid || 0), 0) || 0
  const totalRefunds = refundsResult.data?.reduce((sum, i) => sum + (i.amount_paid || 0), 0) || 0
  const refundCount = refundsResult.data?.length || 0
  const transactionCount = revenueResult.data?.length || 0
  const refundRate = transactionCount > 0 ? (refundCount / transactionCount) * 100 : 0

  // Today's revenue
  const todayRevenue = revenueResult.data
    ?.filter((i) => i.paid_at && new Date(i.paid_at) >= today)
    .reduce((sum, i) => sum + (i.amount_paid || 0), 0) || 0

  // This week's revenue
  const weekRevenue = revenueResult.data
    ?.filter((i) => i.paid_at && new Date(i.paid_at) >= weekAgo)
    .reduce((sum, i) => sum + (i.amount_paid || 0), 0) || 0

  // Average transaction value
  const allTransactions = avgTransactionResult.data || []
  const avgTransaction = allTransactions.length > 0
    ? allTransactions.reduce((sum, i) => sum + (i.amount_paid || 0), 0) / allTransactions.length
    : 0

  // Process daily revenue
  const dailyRevenue: Record<string, { revenue: number; refunds: number; count: number }> = {}
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
    dailyRevenue[date.toISOString().split("T")[0]] = { revenue: 0, refunds: 0, count: 0 }
  }

  if (revenueByDayResult.data) {
    for (const intake of revenueByDayResult.data) {
      if (intake.paid_at) {
        const key = intake.paid_at.split("T")[0]
        if (dailyRevenue[key]) {
          dailyRevenue[key].revenue += intake.amount_paid || 0
          dailyRevenue[key].count++
        }
      }
    }
  }

  // Process service revenue
  const serviceRevenue: Record<string, number> = {}
  if (revenueByServiceResult.data) {
    for (const intake of revenueByServiceResult.data) {
      const type = intake.service_type || "unknown"
      serviceRevenue[type] = (serviceRevenue[type] || 0) + (intake.amount_paid || 0)
    }
  }

  const finance = {
    summary: {
      todayRevenue,
      weekRevenue,
      monthRevenue: totalRevenue,
      totalRefunds,
      refundRate,
      avgTransaction,
      pendingPayments: pendingPaymentsResult.count || 0,
      transactionCount,
    },
    dailyRevenue: Object.entries(dailyRevenue).map(([date, data]) => ({
      date,
      ...data,
    })),
    serviceRevenue: Object.entries(serviceRevenue).map(([type, revenue]) => ({
      type,
      revenue,
    })),
  }

  return <FinanceDashboardClient finance={finance} />
}
