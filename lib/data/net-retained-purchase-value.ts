export type NetRetainedPurchaseRow = {
  id?: string | null
  amount_cents: number | null
  paid_at: string | null
}

export type NetRetainedRefundRow = {
  id?: string | null
  amount_cents?: number | null
  refund_amount_cents: number | null
  refund_status: string | null
  refunded_at: string | null
}

export type NetRetainedDisputeRow = {
  intake_id: string | null
  amount_cents: number | null
  order_amount_cents: number | null
  created_at: string | null
}

type RecordedRefundRow = {
  refund_amount_cents?: number | null
  refunded_at?: string | null
}

type NetRetainedPurchaseValue = {
  averageOrderCents: number | null
  disputeCents: number
  grossCents: number
  netCents: number
  orderCount: number
  refundCents: number
}

export type NetRetainedDeduction = {
  cents: number
  intakeId: string | null
  occurredAt: string
  type: "refund" | "dispute"
}

/**
 * Canonical value for an operator reporting window.
 *
 * Purchases enter by `paid_at`; refunds leave by `refunded_at`; disputes leave
 * by Stripe's durable `created_at`, even when the original purchase predates
 * the window. A failed retry with no recorded cash movement does not reduce
 * retained revenue, but its latest status must not erase an amount and
 * timestamp recorded by an earlier successful attempt. Refund and dispute
 * losses for the same intake are capped at the captured order amount so one
 * order cannot be deducted twice. Inclusive bounds mirror the Supabase
 * `gte`/`lte` reads.
 */
export function buildNetRetainedPurchaseValue(input: {
  paidRows: NetRetainedPurchaseRow[]
  refundRows: NetRetainedRefundRow[]
  disputeRows?: NetRetainedDisputeRow[]
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
  const deductions = buildNetRetainedDeductions({
    paidRows: input.paidRows,
    refundRows: input.refundRows,
    disputeRows: input.disputeRows ?? [],
  }).filter((row) => isWithinWindow(row.occurredAt, input.since, input.until))
  const refundCents = deductions.reduce(
    (sum, row) => sum + (row.type === "refund" ? row.cents : 0),
    0,
  )
  const disputeCents = deductions.reduce(
    (sum, row) => sum + (row.type === "dispute" ? row.cents : 0),
    0,
  )
  const netCents = grossCents - refundCents - disputeCents
  const orderCount = paidRows.length

  return {
    averageOrderCents: orderCount > 0 ? Math.round(netCents / orderCount) : null,
    disputeCents,
    grossCents,
    netCents,
    orderCount,
    refundCents,
  }
}

/**
 * Convert the durable refund/dispute snapshots into incremental cash-loss
 * events. Intake refund amounts are cumulative, so repeated snapshots take the
 * highest recorded level. Stripe disputes are additive, with the combined loss
 * capped at the captured order amount when the intake link is known.
 */
export function buildNetRetainedDeductions(input: {
  paidRows: NetRetainedPurchaseRow[]
  refundRows: NetRetainedRefundRow[]
  disputeRows: NetRetainedDisputeRow[]
}): NetRetainedDeduction[] {
  type LossEvent = {
    amountCents: number
    intakeId: string | null
    key: string
    occurredAt: string
    orderAmountCents: number | null
    sequence: number
    timestamp: number
    type: NetRetainedDeduction["type"]
  }

  const orderAmounts = new Map<string, number>()
  for (const row of input.paidRows) {
    recordOrderAmount(orderAmounts, row.id, row.amount_cents)
  }
  for (const row of input.refundRows) {
    recordOrderAmount(orderAmounts, row.id, row.amount_cents)
  }
  for (const row of input.disputeRows) {
    recordOrderAmount(orderAmounts, row.intake_id, row.order_amount_cents)
  }

  const events: LossEvent[] = []
  input.refundRows.forEach((row, index) => {
    const amountCents = getRecordedRefundCents(row)
    const timestamp = parseTimestamp(row.refunded_at)
    if (amountCents === 0 || timestamp === null || !row.refunded_at) return
    const key = row.id ?? `unlinked-refund:${index}`
    events.push({
      amountCents,
      intakeId: row.id ?? null,
      key,
      occurredAt: row.refunded_at,
      orderAmountCents: orderAmounts.get(key) ?? null,
      sequence: index,
      timestamp,
      type: "refund",
    })
  })
  input.disputeRows.forEach((row, index) => {
    const amountCents = positiveCents(row.amount_cents)
    const timestamp = parseTimestamp(row.created_at)
    if (amountCents === 0 || timestamp === null || !row.created_at) return
    const key = row.intake_id ?? `unlinked-dispute:${index}`
    events.push({
      amountCents,
      intakeId: row.intake_id,
      key,
      occurredAt: row.created_at,
      orderAmountCents: orderAmounts.get(key) ?? null,
      sequence: input.refundRows.length + index,
      timestamp,
      type: "dispute",
    })
  })
  events.sort((left, right) =>
    left.timestamp - right.timestamp ||
    (left.type === right.type ? left.sequence - right.sequence : left.type === "refund" ? -1 : 1),
  )

  const lossByIntake = new Map<string, {
    disputeCents: number
    deductedCents: number
    refundCents: number
  }>()
  const deductions: NetRetainedDeduction[] = []

  for (const event of events) {
    const state = lossByIntake.get(event.key) ?? {
      disputeCents: 0,
      deductedCents: 0,
      refundCents: 0,
    }
    if (event.type === "refund") {
      state.refundCents = Math.max(state.refundCents, event.amountCents)
    } else {
      state.disputeCents += event.amountCents
    }

    const uncappedLoss = state.refundCents + state.disputeCents
    const totalLoss = event.orderAmountCents === null
      ? uncappedLoss
      : Math.min(uncappedLoss, event.orderAmountCents)
    const incrementalCents = Math.max(0, totalLoss - state.deductedCents)
    state.deductedCents = totalLoss
    lossByIntake.set(event.key, state)

    if (incrementalCents > 0) {
      deductions.push({
        cents: incrementalCents,
        intakeId: event.intakeId,
        occurredAt: event.occurredAt,
        type: event.type,
      })
    }
  }

  return deductions
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

function recordOrderAmount(
  orderAmounts: Map<string, number>,
  intakeId: string | null | undefined,
  value: number | null | undefined,
): void {
  if (!intakeId) return
  const amountCents = positiveCents(value)
  if (amountCents > 0) orderAmounts.set(intakeId, amountCents)
}

function positiveCents(value: number | null | undefined): number {
  const amountCents = Number(value ?? 0)
  return Number.isFinite(amountCents) && amountCents > 0 ? amountCents : 0
}

function parseTimestamp(value: string | null | undefined): number | null {
  if (!value) return null
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? timestamp : null
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
