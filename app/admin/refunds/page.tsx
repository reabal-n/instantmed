import { getPaymentsWithRefundsAction, getRefundStatsAction } from "@/app/actions/admin-config"
import { requireRole } from "@/lib/auth/helpers"

import { RefundsClient } from "./refunds-client"

export const dynamic = "force-dynamic"

export default async function RefundsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  await requireRole(["admin"], { redirectTo: "/admin" })
  const params = await searchParams
  const initialStatusFilter = params.status === "failed" ? "failed" : undefined

  const results = await Promise.allSettled([
    getPaymentsWithRefundsAction({ status: initialStatusFilter }, 1, 50),
    getRefundStatsAction(),
  ])

  const paymentsResult = results[0].status === "fulfilled" 
    ? results[0].value 
    : { data: [] as Awaited<ReturnType<typeof getPaymentsWithRefundsAction>>["data"], total: 0 }
  const stats = results[1].status === "fulfilled" 
    ? results[1].value 
    : { eligible: 0, processing: 0, refunded: 0, failed: 0, totalRefunded: 0 }

  return (
    <RefundsClient
      initialPayments={paymentsResult.data || []}
      initialTotal={paymentsResult.total || 0}
      stats={stats}
      initialStatusFilter={initialStatusFilter}
    />
  )
}
