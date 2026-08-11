type NetRetainedPurchaseRow = {
  amount_cents: number | null
  paid_at: string | null
}

type NetRetainedRefundRow = {
  refund_amount_cents: number | null
  refund_status: string | null
  refunded_at: string | null
}

type RecordedRefundRow = {
  refund_amount_cents?: number | null
  refunded_at?: string | null
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
 * original purchase predates the window. A failed retry with no recorded cash
 * movement does not reduce retained revenue, but its latest status must not
 * erase an amount and timestamp recorded by an earlier successful attempt.
 * Inclusive bounds mirror the Supabase `gte`/`lte` reads.
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
    if (!isWithinWindow(row.refunded_at, input.since, input.until)) {
      return sum
    }
    return sum + getRecordedRefundCents(row)
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

/**
 * Return the cumulative refund amount that has durable reporting evidence.
 * `refund_status` describes the latest attempt, so it cannot be used to erase
 * a prior success while `refund_amount_cents` and `refunded_at` remain stored.
 */
export function getRecordedRefundCents(row: RecordedRefundRow): number {
  if (!row.refunded_at || !Number.isFinite(Date.parse(row.refunded_at))) {
    return 0
  }

  const amountCents = Number(row.refund_amount_cents ?? 0)
  return Number.isFinite(amountCents) && amountCents > 0 ? amountCents : 0
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
