import { redirect } from "next/navigation"
import { getAuthenticatedUserWithProfile } from "@/lib/auth"
import { RefundsClient } from "./refunds-client"
import { getPaymentsWithRefundsAction, getRefundStatsAction } from "@/app/actions/admin-config"

export const dynamic = "force-dynamic"

export default async function RefundsPage() {
  const authUser = await getAuthenticatedUserWithProfile()

  if (!authUser) {
    redirect("/auth/login")
  }

  if (authUser.profile.role !== "admin") {
    redirect("/")
  }

  const [paymentsResult, stats] = await Promise.all([
    getPaymentsWithRefundsAction({}, 1, 50),
    getRefundStatsAction(),
  ])

  return (
    <RefundsClient
      initialPayments={paymentsResult.data}
      initialTotal={paymentsResult.total}
      stats={stats}
    />
  )
}
