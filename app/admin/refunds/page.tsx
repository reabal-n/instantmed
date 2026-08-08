import { getPaymentsWithRefundsAction, getRefundStatsAction } from "@/app/actions/admin-config"
import { OperatorPage, OperatorPageHeader, OperatorScrollArea } from "@/components/operator"
import { requireRole } from "@/lib/auth/helpers"
import { STAFF_OPS_HREF } from "@/lib/dashboard/routes"
import { createLogger } from "@/lib/observability/logger"

import { RefundsClient } from "./refunds-client"

const log = createLogger("admin-refunds-page")

export const dynamic = "force-dynamic"

function asError(reason: unknown, message: string): Error {
  return reason instanceof Error ? reason : new Error(`${message}: ${String(reason)}`)
}

export default async function RefundsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  await requireRole(["admin"])
  const params = await searchParams
  const initialStatusFilter = params.status === "failed" ? "failed" : undefined

  const results = await Promise.allSettled([
    getPaymentsWithRefundsAction({ status: initialStatusFilter }, 1, 50),
    getRefundStatsAction(),
  ])

  // A rejected read renders as an explicit unavailable state, never as a clean
  // board with zero stats (which asserts "no failed refunds" while blind).
  // Error level with an Error so the failure reaches Sentry.
  const paymentsLoadFailed = results[0].status === "rejected"
  if (results[0].status === "rejected") {
    log.error("Failed to load refunds board", {}, asError(results[0].reason, "refunds board read failed"))
  }
  const paymentsResult = results[0].status === "fulfilled"
    ? results[0].value
    : { data: [] as Awaited<ReturnType<typeof getPaymentsWithRefundsAction>>["data"], total: 0 }

  if (results[1].status === "rejected") {
    log.error("Failed to load refund stats", {}, asError(results[1].reason, "refund stats read failed"))
  }
  const stats = results[1].status === "fulfilled" ? results[1].value : null

  return (
    <OperatorPage>
      <OperatorPageHeader
        title="Refunds"
        description={initialStatusFilter === "failed" ? "Failed refunds first." : "Refund decisions and payment follow-up."}
        backHref={STAFF_OPS_HREF}
      />
      <OperatorScrollArea>
        <RefundsClient
          initialPayments={paymentsResult.data || []}
          initialTotal={paymentsResult.total || 0}
          stats={stats}
          initialStatusFilter={initialStatusFilter}
          initialLoadFailed={paymentsLoadFailed}
        />
      </OperatorScrollArea>
    </OperatorPage>
  )
}
