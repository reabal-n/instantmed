export const CANONICAL_INTAKE_FUNNEL_EVENTS = [
  "intake_started",
  "checkout_viewed",
  "intake_funnel_payment_initiated",
  "purchase_completed_server",
] as const

export type CanonicalIntakeFunnelEvent = (typeof CANONICAL_INTAKE_FUNNEL_EVENTS)[number]

export interface CanonicalFunnelFlowRow {
  checkoutViewedAt: string | null
  flowInstanceId: string
  paidAt: string | null
  paymentInitiatedAt: string | null
  startedAt: string | null
}

export interface CanonicalFunnelCoverageRow {
  event: string
  rawRows: number
  withFlowId: number
}

export interface CanonicalFunnelCoverageStage {
  coveragePercent: number
  event: CanonicalIntakeFunnelEvent
  rawRows: number
  withFlowId: number
}

export interface CanonicalFunnelStage {
  count: number
  event: CanonicalIntakeFunnelEvent
  key: "started" | "checkoutViewed" | "paymentInitiated" | "paid"
  label: string
  rateFromPrevious: number | null
}

export interface CanonicalIntakeFunnelSummary {
  availability: "available" | "insufficient_coverage" | "unavailable"
  cohort: {
    dateFrom: string
    dateTo: string
    observationHours: 24
  }
  coverageByStage: CanonicalFunnelCoverageStage[]
  coveragePercent: number | null
  latePayments: number
  paidWithin24Hours: number
  requiredCoveragePercent: number
  stages: CanonicalFunnelStage[]
  startToPaidRate: number | null
}

interface BuildCanonicalIntakeFunnelInput {
  coverageRows: CanonicalFunnelCoverageRow[]
  dateFrom: string
  dateTo: string
  flowRows: CanonicalFunnelFlowRow[]
  requiredCoveragePercent?: number
}

const OBSERVATION_MS = 24 * 60 * 60 * 1000

function timestamp(value: string | null): number | null {
  if (!value) return null
  const parsed = new Date(value).getTime()
  return Number.isFinite(parsed) ? parsed : null
}

function earliestTimestamp(a: string | null, b: string | null): string | null {
  const aTime = timestamp(a)
  const bTime = timestamp(b)
  if (aTime === null) return bTime === null ? null : b
  if (bTime === null) return a
  return aTime <= bTime ? a : b
}

function safeCount(value: number): number {
  return Number.isFinite(value) && value > 0 ? Math.round(value) : 0
}

function percent(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0
  return Math.round((numerator / denominator) * 1000) / 10
}

function gatedRate(
  numerator: number,
  denominator: number,
  ratesAvailable: boolean,
): number | null {
  if (!ratesAvailable || denominator <= 0) return null
  return Math.min(100, Math.round((numerator / denominator) * 1000) / 10)
}

function dedupeFlows(rows: CanonicalFunnelFlowRow[]): CanonicalFunnelFlowRow[] {
  const byFlow = new Map<string, CanonicalFunnelFlowRow>()

  for (const row of rows) {
    const flowInstanceId = row.flowInstanceId.trim()
    if (!flowInstanceId) continue
    const existing = byFlow.get(flowInstanceId)
    if (!existing) {
      byFlow.set(flowInstanceId, { ...row, flowInstanceId })
      continue
    }

    byFlow.set(flowInstanceId, {
      checkoutViewedAt: earliestTimestamp(existing.checkoutViewedAt, row.checkoutViewedAt),
      flowInstanceId,
      paidAt: earliestTimestamp(existing.paidAt, row.paidAt),
      paymentInitiatedAt: earliestTimestamp(existing.paymentInitiatedAt, row.paymentInitiatedAt),
      startedAt: earliestTimestamp(existing.startedAt, row.startedAt),
    })
  }

  return Array.from(byFlow.values())
}

export function buildCanonicalIntakeFunnel(
  input: BuildCanonicalIntakeFunnelInput,
): CanonicalIntakeFunnelSummary {
  const requiredCoveragePercent = input.requiredCoveragePercent ?? 90
  const dateFromMs = timestamp(input.dateFrom)
  const dateToMs = timestamp(input.dateTo)

  const coverageByEvent = new Map(
    input.coverageRows.map((row) => [row.event, row]),
  )
  const coverageComplete = CANONICAL_INTAKE_FUNNEL_EVENTS.every((event) => {
    const row = coverageByEvent.get(event)
    return Boolean(row && safeCount(row.rawRows) > 0)
  })
  const coverageByStage = coverageComplete
    ? CANONICAL_INTAKE_FUNNEL_EVENTS.map((event) => {
        const row = coverageByEvent.get(event)!
        const rawRows = safeCount(row.rawRows)
        const withFlowId = Math.min(rawRows, safeCount(row.withFlowId))
        return {
          coveragePercent: percent(withFlowId, rawRows),
          event,
          rawRows,
          withFlowId,
        }
      })
    : []
  const coveragePercent = coverageComplete
    ? Math.min(...coverageByStage.map((stage) => stage.coveragePercent))
    : null
  const availability: CanonicalIntakeFunnelSummary["availability"] = !coverageComplete
    ? "unavailable"
    : (coveragePercent ?? 0) < requiredCoveragePercent
      ? "insufficient_coverage"
      : "available"
  const ratesAvailable = availability === "available"

  const cohortRows = dateFromMs === null || dateToMs === null
    ? []
    : dedupeFlows(input.flowRows).filter((row) => {
        const startedAt = timestamp(row.startedAt)
        return startedAt !== null && startedAt >= dateFromMs && startedAt <= dateToMs
      })

  let checkoutViewed = 0
  let paymentInitiated = 0
  let paidWithin24Hours = 0
  let latePayments = 0

  for (const row of cohortRows) {
    const startedAt = timestamp(row.startedAt)
    if (startedAt === null) continue
    const deadline = startedAt + OBSERVATION_MS
    const checkoutAt = timestamp(row.checkoutViewedAt)
    const paymentAt = timestamp(row.paymentInitiatedAt)
    const paidAt = timestamp(row.paidAt)

    const orderedCheckout = checkoutAt !== null && checkoutAt >= startedAt
    const checkoutWithinWindow = orderedCheckout && checkoutAt <= deadline
    if (checkoutWithinWindow) checkoutViewed += 1

    const orderedPayment = orderedCheckout && paymentAt !== null && paymentAt >= checkoutAt
    const paymentWithinWindow = orderedPayment && paymentAt <= deadline
    if (paymentWithinWindow) paymentInitiated += 1

    const orderedPaid = orderedPayment && paidAt !== null && paidAt >= paymentAt
    if (paymentWithinWindow && orderedPaid && paidAt <= deadline) {
      paidWithin24Hours += 1
    } else if (orderedPaid && paidAt > deadline) {
      latePayments += 1
    }
  }

  const started = cohortRows.length
  const stages: CanonicalFunnelStage[] = [
    {
      count: started,
      event: "intake_started",
      key: "started",
      label: "Started",
      rateFromPrevious: null,
    },
    {
      count: checkoutViewed,
      event: "checkout_viewed",
      key: "checkoutViewed",
      label: "Reached checkout within 24h",
      rateFromPrevious: gatedRate(checkoutViewed, started, ratesAvailable),
    },
    {
      count: paymentInitiated,
      event: "intake_funnel_payment_initiated",
      key: "paymentInitiated",
      label: "Payment started within 24h",
      rateFromPrevious: gatedRate(paymentInitiated, checkoutViewed, ratesAvailable),
    },
    {
      count: paidWithin24Hours,
      event: "purchase_completed_server",
      key: "paid",
      label: "Paid within 24h",
      rateFromPrevious: gatedRate(paidWithin24Hours, paymentInitiated, ratesAvailable),
    },
  ]

  return {
    availability,
    cohort: {
      dateFrom: input.dateFrom,
      dateTo: input.dateTo,
      observationHours: 24,
    },
    coverageByStage,
    coveragePercent,
    latePayments,
    paidWithin24Hours,
    requiredCoveragePercent,
    stages,
    startToPaidRate: gatedRate(paidWithin24Hours, started, ratesAvailable),
  }
}
