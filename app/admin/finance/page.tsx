import { FinanceDashboardClient } from "./finance-client"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const dynamic = "force-dynamic"

export default async function FinanceDashboardPage() {
  const supabase = createServiceRoleClient()

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
  const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
  const yearAgo = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000)

  // Fetch financial data - use allSettled to prevent page crash
  const results = await Promise.allSettled([
    // Total revenue (paid intakes)
    supabase
      .from("intakes")
      .select("amount_cents, paid_at")
      .not("paid_at", "is", null)
      .gte("paid_at", monthAgo.toISOString()),
    
    // Refunds
    supabase
      .from("intakes")
      .select("amount_cents, refunded_at")
      .not("refunded_at", "is", null)
      .gte("refunded_at", monthAgo.toISOString()),
    
    // Revenue by day
    supabase
      .from("intakes")
      .select("amount_cents, paid_at")
      .not("paid_at", "is", null)
      .gte("paid_at", monthAgo.toISOString())
      .order("paid_at", { ascending: true }),
    
    // Revenue by service type
    supabase
      .from("intakes")
      .select("category, amount_cents")
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
      .select("amount_cents")
      .not("paid_at", "is", null)
      .gte("paid_at", yearAgo.toISOString()),
    
    // Stripe disputes (risk management)
    supabase
      .from("stripe_disputes")
      .select("id, dispute_id, intake_id, amount, currency, reason, status, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
    
    // Fraud flags (risk management)
    supabase
      .from("fraud_flags")
      .select("id, intake_id, patient_id, flag_type, severity, details, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
  ])

  // Extract results with fallbacks
  const revenueResult = results[0].status === "fulfilled" ? results[0].value : { data: [] }
  const refundsResult = results[1].status === "fulfilled" ? results[1].value : { data: [] }
  const revenueByDayResult = results[2].status === "fulfilled" ? results[2].value : { data: [] }
  const revenueByServiceResult = results[3].status === "fulfilled" ? results[3].value : { data: [] }
  const pendingPaymentsResult = results[4].status === "fulfilled" ? results[4].value : { count: 0 }
  const avgTransactionResult = results[5].status === "fulfilled" ? results[5].value : { data: [] }
  const disputesResult = results[6].status === "fulfilled" ? results[6].value : { data: [] }
  const fraudFlagsResult = results[7].status === "fulfilled" ? results[7].value : { data: [] }

  // Calculate totals
  const totalRevenue = revenueResult.data?.reduce((sum, i) => sum + (i.amount_cents || 0), 0) || 0
  const totalRefunds = refundsResult.data?.reduce((sum, i) => sum + (i.amount_cents || 0), 0) || 0
  const refundCount = refundsResult.data?.length || 0
  const transactionCount = revenueResult.data?.length || 0
  const refundRate = transactionCount > 0 ? (refundCount / transactionCount) * 100 : 0

  // Today's revenue
  const todayRevenue = revenueResult.data
    ?.filter((i) => i.paid_at && new Date(i.paid_at) >= today)
    .reduce((sum, i) => sum + (i.amount_cents || 0), 0) || 0

  // This week's revenue
  const weekRevenue = revenueResult.data
    ?.filter((i) => i.paid_at && new Date(i.paid_at) >= weekAgo)
    .reduce((sum, i) => sum + (i.amount_cents || 0), 0) || 0

  // Average transaction value
  const allTransactions = avgTransactionResult.data || []
  const avgTransaction = allTransactions.length > 0
    ? allTransactions.reduce((sum, i) => sum + (i.amount_cents || 0), 0) / allTransactions.length
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
          dailyRevenue[key].revenue += intake.amount_cents || 0
          dailyRevenue[key].count++
        }
      }
    }
  }

  // Process service revenue
  const serviceRevenue: Record<string, number> = {}
  if (revenueByServiceResult.data) {
    for (const intake of revenueByServiceResult.data) {
      const type = intake.category || "unknown"
      serviceRevenue[type] = (serviceRevenue[type] || 0) + (intake.amount_cents || 0)
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
      activeDisputes: disputesResult.data?.filter(d => d.status !== "won" && d.status !== "lost").length || 0,
      recentFraudFlags: fraudFlagsResult.data?.filter(f => f.severity === "high" || f.severity === "critical").length || 0,
    },
    dailyRevenue: Object.entries(dailyRevenue).map(([date, data]) => ({
      date,
      ...data,
    })),
    serviceRevenue: Object.entries(serviceRevenue).map(([type, revenue]) => ({
      type,
      revenue,
    })),
    disputes: (disputesResult.data || []).map(d => ({
      id: d.id,
      disputeId: d.dispute_id,
      intakeId: d.intake_id,
      amount: d.amount,
      currency: d.currency,
      reason: d.reason,
      status: d.status,
      createdAt: d.created_at,
    })),
    fraudFlags: (fraudFlagsResult.data || []).map(f => ({
      id: f.id,
      intakeId: f.intake_id,
      patientId: f.patient_id,
      flagType: f.flag_type,
      severity: f.severity,
      details: f.details,
      createdAt: f.created_at,
    })),
  }

  return <FinanceDashboardClient finance={finance} />
}
