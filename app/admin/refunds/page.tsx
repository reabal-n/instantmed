import { redirect } from "next/navigation"
import { getAuthenticatedUserWithProfile } from "@/lib/auth"
import { RefundsClient } from "./refunds-client"
import { getPaymentsWithRefundsAction, getRefundStatsAction } from "@/app/actions/admin-config"

export const dynamic = "force-dynamic"

export default async function RefundsPage() {
  const authUser = await getAuthenticatedUserWithProfile()

  if (!authUser) {
    redirect("/sign-in")
  }

  if (authUser.profile.role !== "admin") {
    redirect("/")
  }

  const results = await Promise.allSettled([
    getPaymentsWithRefundsAction({}, 1, 50),
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
    />
  )
}
