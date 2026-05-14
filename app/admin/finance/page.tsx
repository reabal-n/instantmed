import { getRefundStatsAction } from "@/app/actions/admin-config"
import { requireRole } from "@/lib/auth/helpers"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

import { FinanceDashboardClient } from "./finance-client"

export const dynamic = "force-dynamic"

export default async function FinanceDashboardPage() {
  await requireRole(["admin"])

  const supabase = createServiceRoleClient()

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
  const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
  const yearAgo = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000)

  const results = await Promise.allSettled([
    supabase
      .from("intakes")
      .select("amount_cents, paid_at")
      .not("paid_at", "is", null)
      .gte("paid_at", monthAgo.toISOString()),
    supabase
      .from("intakes")
      .select("amount_cents, refunded_at")
      .not("refunded_at", "is", null)
      .gte("refunded_at", monthAgo.toISOString()),
    supabase
      .from("intakes")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending_payment"),
    supabase
      .from("intakes")
      .select("amount_cents")
      .not("paid_at", "is", null)
      .gte("paid_at", yearAgo.toISOString()),
    getRefundStatsAction(),
  ])

  const revenueResult = results[0].status === "fulfilled" ? results[0].value : { data: [] }
  const refundsResult = results[1].status === "fulfilled" ? results[1].value : { data: [] }
  const pendingPaymentsResult = results[2].status === "fulfilled" ? results[2].value : { count: 0 }
  const avgTransactionResult = results[3].status === "fulfilled" ? results[3].value : { data: [] }
  const refundStats = results[4].status === "fulfilled"
    ? results[4].value
    : { eligible: 0, processing: 0, refunded: 0, failed: 0, totalRefunded: 0 }

  const totalRevenue = revenueResult.data?.reduce((sum, i) => sum + (i.amount_cents || 0), 0) || 0
  const totalRefunds = refundsResult.data?.reduce((sum, i) => sum + (i.amount_cents || 0), 0) || 0
  const transactionCount = revenueResult.data?.length || 0
  const refundRate = totalRevenue > 0 ? (totalRefunds / totalRevenue) * 100 : 0

  const todayRevenue = revenueResult.data
    ?.filter((i) => i.paid_at && new Date(i.paid_at) >= today)
    .reduce((sum, i) => sum + (i.amount_cents || 0), 0) || 0

  const weekRevenue = revenueResult.data
    ?.filter((i) => i.paid_at && new Date(i.paid_at) >= weekAgo)
    .reduce((sum, i) => sum + (i.amount_cents || 0), 0) || 0

  const allTransactions = avgTransactionResult.data || []
  const avgTransaction = allTransactions.length > 0
    ? allTransactions.reduce((sum, i) => sum + (i.amount_cents || 0), 0) / allTransactions.length
    : 0

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
      eligibleRefunds: refundStats.eligible,
      failedRefunds: refundStats.failed,
    },
  }

  return <FinanceDashboardClient finance={finance} />
}
