type NetRetainedPurchaseRow = {
  amount_cents: number | null
  paid_at: string | null
}

type NetRetainedRefundRow = {
  refund_amount_cents: number | null
  refund_status: string | null
  refunded_at: string | null
}

type NetRetainedPurchaseValue = {
  averageOrderCents: number | null
  grossCents: number
  netCents: number
  orderCount: number
  refundCents: number
}

/**
 * Canonical value for an operator reporting window.
 *
 * Purchases enter by `paid_at`; refunds leave by `refunded_at`, even when the
 * original purchase predates the window. Failed refund attempts never reduce
 * retained revenue. Inclusive bounds mirror the Supabase `gte`/`lte` reads.
 */
export function buildNetRetainedPurchaseValue(input: {
  paidRows: NetRetainedPurchaseRow[]
  refundRows: NetRetainedRefundRow[]
  since: Date
  until: Date
}): NetRetainedPurchaseValue {
  const paidRows = input.paidRows.filter((row) =>
    isWithinWindow(row.paid_at, input.since, input.until),
  )
  const grossCents = paidRows.reduce(
    (sum, row) => sum + Number(row.amount_cents ?? 0),
    0,
  )
  const refundCents = input.refundRows.reduce((sum, row) => {
    if (
      row.refund_status === "failed" ||
      !isWithinWindow(row.refunded_at, input.since, input.until)
    ) {
      return sum
    }
    return sum + Number(row.refund_amount_cents ?? 0)
  }, 0)
  const netCents = grossCents - refundCents
  const orderCount = paidRows.length

  return {
    averageOrderCents: orderCount > 0 ? Math.round(netCents / orderCount) : null,
    grossCents,
    netCents,
    orderCount,
    refundCents,
  }
}

function isWithinWindow(
  value: string | null | undefined,
  since: Date,
  until: Date,
): boolean {
  if (!value) return false
  const timestamp = Date.parse(value)
  return (
    Number.isFinite(timestamp) &&
    timestamp >= since.getTime() &&
    timestamp <= until.getTime()
  )
}
