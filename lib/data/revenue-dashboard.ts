import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { REVENUE_ACTIVE_MILESTONE_CENTS } from "@/lib/business/revenue-milestones"
import {
  buildNetRetainedDeductions,
  buildNetRetainedPurchaseValue,
  getRecordedRefundCents,
  type NetRetainedDisputeRow,
} from "@/lib/data/net-retained-purchase-value"
import { getRefundStatsRead } from "@/lib/data/refunds"
import { filterReportableIntakes } from "@/lib/data/reporting-filters"
import {
  SEEDED_E2E_PATIENT_PROFILE_IDS,
  shouldIncludeSeededE2EData,
} from "@/lib/data/seeded-e2e-data"
import {
  buildNoPurchaseRevenueAlert,
  CHECKOUT_DEMAND_PAYMENT_STATUSES,
  CHECKOUT_DEMAND_STATUSES,
  NO_PURCHASE_CRITICAL_WINDOW_HOURS,
  NO_PURCHASE_WARNING_WINDOW_HOURS,
  type NoPurchaseRevenueAlert,
  type NoPurchaseRevenueWindow,
  REVENUE_PURCHASE_PAYMENT_STATUSES,
} from "@/lib/monitoring/revenue-safety"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const DAY_MS = 24 * 60 * 60 * 1000
// Paid/refund reads fetch 60 days so trend periods can compare against the
// prior 30-day window. Every derived readout below re-scopes to its own
// window; nothing may consume the raw 60-day arrays wholesale.
const FETCH_HORIZON_DAYS = 60
// 32 closed Sydney days + today (partial). Two spare closed days beyond the
// displayed 30 so a latest delivered Ads run whose rolling-30 window ends a
// day or two back still finds every revenue bucket it needs for profit rows.
const DAILY_TREND_DAYS = 33

export { REVENUE_ACTIVE_MILESTONE_CENTS }

type PaidRevenueRow = {
  id: string
  amount_cents: number | null
  category: string | null
  is_priority: boolean | null
  paid_at: string | null
  payment_status: string | null
  refund_amount_cents: number | null
  refund_status: string | null
  refunded_at: string | null
  status: string | null
  /** Optional so fixtures predating the fee cache stay valid; absent = estimate. */
  stripe_fee_cents?: number | null
  subtype: string | null
}

type RefundRevenueRow = {
  id: string | null
  amount_cents: number | null
  refund_amount_cents: number | null
  refund_status: string | null
  refunded_at: string | null
}

type DisputeRevenueRow = NetRetainedDisputeRow

type LinkedDisputeIntakeRow = {
  id: string
  amount_cents: number | null
  exclude_from_reporting: boolean | null
  patient_id: string | null
  refund_amount_cents: number | null
  refund_status: string | null
  refunded_at: string | null
}

type StripeDisputeReadRow = {
  amount: number | null
  created_at: string | null
  intake: LinkedDisputeIntakeRow | LinkedDisputeIntakeRow[] | null
  intake_id: string | null
}

type TimedRow = {
  created_at?: string | null
  updated_at?: string | null
}

type CheckoutDemandRow = {
  created_at: string | null
  payment_status: string | null
  status: string | null
}

type PartialDraftRow = {
  updated_at: string | null
}

export type RevenueDashboardStatus = "healthy" | "watch" | "critical" | "quiet"
export type RevenueDashboardSourceAvailability = "available" | "degraded" | "unavailable"

export type RevenueDashboardSourceState = {
  revenue: RevenueDashboardSourceAvailability
  recovery: RevenueDashboardSourceAvailability
}

export function resolveRevenueDashboardSourceAvailability(input: {
  paidRowsAvailable: boolean
  refundRowsAvailable: boolean
  disputeRowsAvailable: boolean
  refundStatsAvailable: boolean
  createdRowsAvailable: boolean
  checkoutRowsAvailable: boolean
  partialDraftRowsAvailable: boolean
}): RevenueDashboardSourceState {
  const recoverySources = [
    input.refundRowsAvailable,
    input.refundStatsAvailable,
    input.createdRowsAvailable,
    input.checkoutRowsAvailable,
    input.partialDraftRowsAvailable,
  ]
  const recoverySourceCount = recoverySources.filter(Boolean).length

  return {
    revenue:
      input.paidRowsAvailable &&
      input.refundRowsAvailable &&
      input.disputeRowsAvailable
      ? "available"
      : "unavailable",
    recovery: recoverySourceCount === recoverySources.length
      ? "available"
      : recoverySourceCount > 0
        ? "degraded"
        : "unavailable",
  }
}

export type RevenueDashboardWindow = {
  key: "today" | "last7Days" | "last30Days"
  label: string
  grossCents: number
  refundCents: number
  disputeCents: number
  netCents: number
  orderCount: number
  averageOrderCents: number | null
  targetCents: number | null
}

export type RevenueDashboardDay = {
  dateKey: string
  label: string
  grossCents: number
  refundCents: number
  disputeCents: number
  netCents: number
  orderCount: number
  feeEstimateCents: number
}

type RevenueTrendPeriodKey = "today" | "yesterday" | "last7Days" | "last30Days"

export type RevenueTrendPeriod = {
  key: RevenueTrendPeriodKey
  label: string
  comparisonLabel: string
  grossCents: number
  refundCents: number
  disputeCents: number
  netCents: number
  orderCount: number
  averageOrderCents: number | null
  feeEstimateCents: number
  priorNetCents: number
  priorOrderCount: number
  netChangePct: number | null
}

export type RevenueDashboardService = {
  key: string
  label: string
  grossCents: number
  netCents: number
  orderCount: number
  shareOfGross: number
}

export type RevenueDashboardRecentPayment = {
  id: string
  amountCents: number
  label: string
  paidAt: string
}

export type RevenueDashboard = {
  generatedAt: string
  sourceAvailability: RevenueDashboardSourceState
  status: RevenueDashboardStatus
  statusLabel: string
  lastPaidAt: string | null
  hoursSinceLastPayment: number | null
  noPurchaseAlert: NoPurchaseRevenueAlert | null
  noPurchaseWindows: {
    warning: NoPurchaseRevenueWindow
    critical: NoPurchaseRevenueWindow
  }
  paymentFriction: {
    activeCheckoutStageCount: number
    activeDraftCount: number
    checkoutFailedCount: number
    checkoutStage24hCount: number
    created24hCount: number
    paid24hCount: number
    pendingPaymentCount: number
    staleCheckoutStageCount: number
  }
  refundWork: {
    eligibleRefunds: number
    failedRefunds: number
    openRefundWork: number
    totalRefunded30dCents: number
  }
  windows: RevenueDashboardWindow[]
  trendPeriods: RevenueTrendPeriod[]
  daily: RevenueDashboardDay[]
  maxDailyNetCents: number
  serviceMix: RevenueDashboardService[]
  monetisation: RevenueMonetisationReadouts
  recentPayments: RevenueDashboardRecentPayment[]
}

/**
 * Decision-support readouts for the two blind monetisation levers flagged in
 * the 2026-07-10 audit: the $9.95 Express Review attach rate (a ~40%-margin
 * add-on that was running unmeasured) and the med-cert duration-tier mix
 * (docs/REVENUE_MODEL.md models a $27 med-cert AOV that assumes a real 2/3-day
 * share — nothing tracked progress toward it).
 */
export type RevenueMonetisationReadouts = {
  express: {
    paidOrders: number
    expressOrders: number
    attachPct: number
    feeGrossCents: number
  }
  certDurationMix: {
    days: 1 | 2 | 3
    orderCount: number
    sharePct: number
  }[]
  certOrderCount: number
}

export type RevenueDashboardInput = {
  now: Date
  sourceAvailability?: RevenueDashboardSourceState
  paidRows: PaidRevenueRow[]
  refundRows: RefundRevenueRow[]
  disputeRows?: DisputeRevenueRow[]
  createdRows: TimedRow[]
  checkoutRows: CheckoutDemandRow[]
  partialDraftRows: PartialDraftRow[]
  refundStats: {
    eligible: number
    failed: number
    totalRefunded: number
  }
}

export async function getRevenueDashboard(
  supabase: SupabaseClient = createServiceRoleClient(),
  now = new Date(),
): Promise<RevenueDashboard> {
  const fetchSince = new Date(now.getTime() - FETCH_HORIZON_DAYS * DAY_MS).toISOString()
  const criticalSince = new Date(
    now.getTime() - NO_PURCHASE_CRITICAL_WINDOW_HOURS * 60 * 60 * 1000,
  ).toISOString()
  const nowIso = now.toISOString()

  const results = await Promise.allSettled([
    filterReportableIntakes(supabase
      .from("intakes")
      .select("id, amount_cents, category, is_priority, paid_at, payment_status, refund_amount_cents, refund_status, refunded_at, status, stripe_fee_cents, subtype")
      .in("payment_status", [...REVENUE_PURCHASE_PAYMENT_STATUSES])
      .not("paid_at", "is", null)
      .gte("paid_at", fetchSince)
      .order("paid_at", { ascending: false })),
    filterReportableIntakes(supabase
      .from("intakes")
      .select("id, amount_cents, refund_amount_cents, refund_status, refunded_at")
      .not("refunded_at", "is", null)
      .gte("refunded_at", fetchSince)),
    supabase
      .from("stripe_disputes")
      .select("intake_id, amount, created_at, intake:intakes(id, amount_cents, refund_amount_cents, refund_status, refunded_at, exclude_from_reporting, patient_id)")
      .eq("currency", "aud")
      .gte("created_at", fetchSince)
      .lte("created_at", nowIso),
    filterReportableIntakes(supabase
      .from("intakes")
      .select("created_at")
      .gte("created_at", criticalSince)
      .lte("created_at", nowIso)),
    filterReportableIntakes(supabase
      .from("intakes")
      .select("created_at, payment_status, status")
      .in("status", [...CHECKOUT_DEMAND_STATUSES])
      .in("payment_status", [...CHECKOUT_DEMAND_PAYMENT_STATUSES])
      .gte("created_at", criticalSince)
      .lte("created_at", nowIso)),
    supabase
      .from("partial_intakes")
      .select("updated_at")
      .is("converted_to_intake_id", null)
      .gte("updated_at", criticalSince)
      .lte("updated_at", nowIso)
      .gte("expires_at", nowIso),
    getRefundStatsRead(supabase),
  ])

  const paidResult = results[0].status === "fulfilled" ? results[0].value : null
  const refundResult = results[1].status === "fulfilled" ? results[1].value : null
  const disputeResult = results[2].status === "fulfilled" ? results[2].value : null
  const createdResult = results[3].status === "fulfilled" ? results[3].value : null
  const checkoutResult = results[4].status === "fulfilled" ? results[4].value : null
  const partialDraftResult = results[5].status === "fulfilled" ? results[5].value : null
  const refundStatsRead = results[6].status === "fulfilled" ? results[6].value : null
  const paidRowsAvailable = paidResult !== null && !paidResult.error
  const refundRowsAvailable = refundResult !== null && !refundResult.error
  const disputeRowsAvailable = disputeResult !== null && !disputeResult.error
  const createdRowsAvailable = createdResult !== null && !createdResult.error
  const checkoutRowsAvailable = checkoutResult !== null && !checkoutResult.error
  const partialDraftRowsAvailable = partialDraftResult !== null && !partialDraftResult.error
  const refundStatsAvailable = refundStatsRead?.availability === "available"
  const paidRows = paidRowsAvailable
    ? ((paidResult.data ?? []) as PaidRevenueRow[])
    : []
  const directRefundRows = refundRowsAvailable
    ? ((refundResult.data ?? []) as RefundRevenueRow[])
    : []
  const disputeReadRows = disputeRowsAvailable
    ? ((disputeResult.data ?? []) as StripeDisputeReadRow[])
    : []
  const { disputeRows, linkedRefundRows } = normalizeDisputeRows(disputeReadRows)
  const refundRows = mergeRefundRows(directRefundRows, linkedRefundRows)
  const createdRows = createdRowsAvailable
    ? ((createdResult.data ?? []) as TimedRow[])
    : []
  const checkoutRows = checkoutRowsAvailable
    ? ((checkoutResult.data ?? []) as CheckoutDemandRow[])
    : []
  const partialDraftRows = partialDraftRowsAvailable
    ? ((partialDraftResult.data ?? []) as PartialDraftRow[])
    : []
  const refundStats = refundStatsAvailable
    ? refundStatsRead.stats
    : { eligible: 0, failed: 0, totalRefunded: 0 }
  const sourceAvailability = resolveRevenueDashboardSourceAvailability({
    paidRowsAvailable,
    refundRowsAvailable,
    disputeRowsAvailable,
    refundStatsAvailable,
    createdRowsAvailable,
    checkoutRowsAvailable,
    partialDraftRowsAvailable,
  })

  return buildRevenueDashboard({
    now,
    sourceAvailability,
    paidRows,
    refundRows,
    disputeRows,
    createdRows,
    checkoutRows,
    partialDraftRows,
    refundStats,
  })
}

function normalizeDisputeRows(rows: StripeDisputeReadRow[]): {
  disputeRows: DisputeRevenueRow[]
  linkedRefundRows: RefundRevenueRow[]
} {
  const includeSeeded = shouldIncludeSeededE2EData()
  const seededPatientIds = new Set<string>(SEEDED_E2E_PATIENT_PROFILE_IDS)
  const disputeRows: DisputeRevenueRow[] = []
  const linkedRefundRows: RefundRevenueRow[] = []

  for (const row of rows) {
    const intake = Array.isArray(row.intake) ? (row.intake[0] ?? null) : row.intake
    if (
      intake?.exclude_from_reporting === true ||
      (!includeSeeded && intake?.patient_id && seededPatientIds.has(intake.patient_id))
    ) {
      continue
    }

    disputeRows.push({
      intake_id: row.intake_id,
      amount_cents: row.amount,
      order_amount_cents: intake?.amount_cents ?? null,
      created_at: row.created_at,
    })
    if (intake?.refunded_at) {
      linkedRefundRows.push({
        id: intake.id,
        amount_cents: intake.amount_cents,
        refund_amount_cents: intake.refund_amount_cents,
        refund_status: intake.refund_status,
        refunded_at: intake.refunded_at,
      })
    }
  }

  return { disputeRows, linkedRefundRows }
}

function mergeRefundRows(
  directRows: RefundRevenueRow[],
  linkedRows: RefundRevenueRow[],
): RefundRevenueRow[] {
  const byIntake = new Map<string, RefundRevenueRow>()
  const unlinked: RefundRevenueRow[] = []
  // The direct intake read is authoritative when both reads contain the same
  // row. Linked snapshots only fill the pre-horizon refund needed to cap a
  // later dispute without reading the entire historical intake table.
  for (const row of [...linkedRows, ...directRows]) {
    if (row.id) byIntake.set(row.id, row)
    else unlinked.push(row)
  }
  return [...byIntake.values(), ...unlinked]
}

export type RevenueWindowBounds = {
  todayStart: Date
  last7DaysStart: Date
  last30DaysStart: Date
}

/**
 * Canonical revenue windows shared across the Payments dashboard, the Analytics
 * revenue strip, and the operating scorecard. One definition so TODAY / 7 days /
 * 30 days revenue cannot disagree between surfaces:
 *  - todayStart      = most recent Australia/Sydney midnight
 *  - last7DaysStart  = last 7 Sydney calendar days (todayStart - 6 days)
 *  - last30DaysStart = rolling now - 30 days
 */
export function getRevenueWindowBounds(now: Date): RevenueWindowBounds {
  const todayStart = startOfDaySydney(now)
  return {
    todayStart,
    last7DaysStart: new Date(todayStart.getTime() - 6 * DAY_MS),
    last30DaysStart: new Date(now.getTime() - 30 * DAY_MS),
  }
}

export function buildRevenueDashboard(input: RevenueDashboardInput): RevenueDashboard {
  const disputeRows = input.disputeRows ?? []
  const { todayStart, last7DaysStart, last30DaysStart } = getRevenueWindowBounds(input.now)
  const warningWindow = buildNoPurchaseWindow(input, NO_PURCHASE_WARNING_WINDOW_HOURS)
  const criticalWindow = buildNoPurchaseWindow(input, NO_PURCHASE_CRITICAL_WINDOW_HOURS)
  const criticalAlert = buildNoPurchaseRevenueAlert(criticalWindow)
  const warningAlert = buildNoPurchaseRevenueAlert(warningWindow)
  const noPurchaseAlert = criticalAlert ?? warningAlert
  const lastPaidAt = input.paidRows[0]?.paid_at ?? null
  const hoursSinceLastPayment = lastPaidAt
    ? Math.max(0, Math.round((input.now.getTime() - new Date(lastPaidAt).getTime()) / (60 * 60 * 1000)))
    : null
  const staleCheckoutCutoff = new Date(input.now.getTime() - 20 * 60 * 1000)

  // The raw arrays span the 60-day fetch horizon; every consumer below must
  // re-scope to its own window so widening the fetch never widens a readout.
  const last30PaidRows = input.paidRows.filter((row) => isAtOrAfter(row.paid_at, last30DaysStart))
  const last30RefundRows = input.refundRows.filter((row) => isAtOrAfter(row.refunded_at, last30DaysStart))

  const windows: RevenueDashboardWindow[] = [
    buildRevenueWindow(
      "today",
      "Today",
      input.paidRows,
      input.refundRows,
      disputeRows,
      todayStart,
      input.now,
      null,
    ),
    buildRevenueWindow(
      "last7Days",
      "7 days",
      input.paidRows,
      input.refundRows,
      disputeRows,
      last7DaysStart,
      input.now,
      null,
    ),
    buildRevenueWindow(
      "last30Days",
      "30 days",
      input.paidRows,
      input.refundRows,
      disputeRows,
      last30DaysStart,
      input.now,
      REVENUE_ACTIVE_MILESTONE_CENTS,
    ),
  ]
  const daily = buildDailyRevenue(
    input.paidRows,
    input.refundRows,
    disputeRows,
    todayStart,
  )
  const status = resolveDashboardStatus(noPurchaseAlert, warningWindow.paidIntakes, hoursSinceLastPayment)

  return {
    generatedAt: input.now.toISOString(),
    sourceAvailability: input.sourceAvailability ?? {
      revenue: "available",
      recovery: "available",
    },
    status,
    statusLabel: statusLabel(status),
    lastPaidAt,
    hoursSinceLastPayment,
    noPurchaseAlert,
    noPurchaseWindows: {
      warning: warningWindow,
      critical: criticalWindow,
    },
    paymentFriction: {
      activeCheckoutStageCount: input.checkoutRows.length,
      activeDraftCount: input.partialDraftRows.length,
      checkoutFailedCount: input.checkoutRows.filter((row) => row.status === "checkout_failed").length,
      checkoutStage24hCount: warningWindow.checkoutStageIntakes,
      created24hCount: warningWindow.createdIntakes,
      paid24hCount: warningWindow.paidIntakes,
      pendingPaymentCount: input.checkoutRows.filter((row) => row.status === "pending_payment").length,
      staleCheckoutStageCount: input.checkoutRows.filter((row) => {
        if (!row.created_at) return false
        return new Date(row.created_at) <= staleCheckoutCutoff
      }).length,
    },
    refundWork: {
      eligibleRefunds: input.refundStats.eligible,
      failedRefunds: input.refundStats.failed,
      openRefundWork: input.refundStats.eligible + input.refundStats.failed,
      totalRefunded30dCents: sumRefunds(last30RefundRows),
    },
    windows,
    trendPeriods: buildTrendPeriods(input.paidRows, input.refundRows, input.now, disputeRows),
    daily,
    maxDailyNetCents: Math.max(0, ...daily.map((day) => Math.max(day.netCents, 0))),
    serviceMix: buildServiceMix(last30PaidRows),
    monetisation: buildMonetisationReadouts(last30PaidRows),
    recentPayments: last30PaidRows.slice(0, 5).flatMap((row) => {
      if (!row.id || !row.paid_at) return []
      return [{
        id: row.id,
        amountCents: Number(row.amount_cents ?? 0),
        label: serviceLabel(row.category, row.subtype),
        paidAt: row.paid_at,
      }]
    }),
  }
}

function buildRevenueWindow(
  key: RevenueDashboardWindow["key"],
  label: string,
  paidRows: PaidRevenueRow[],
  refundRows: RefundRevenueRow[],
  disputeRows: DisputeRevenueRow[],
  since: Date,
  until: Date,
  targetCents: number | null,
): RevenueDashboardWindow {
  const value = buildNetRetainedPurchaseValue({
    paidRows,
    refundRows,
    disputeRows,
    since,
    until,
  })

  return {
    key,
    label,
    ...value,
    targetCents,
  }
}

function buildDailyRevenue(
  paidRows: PaidRevenueRow[],
  refundRows: RefundRevenueRow[],
  disputeRows: DisputeRevenueRow[],
  todayStart: Date,
  days = DAILY_TREND_DAYS,
): RevenueDashboardDay[] {
  const buckets = new Map<string, RevenueDashboardDay>()
  for (let index = days - 1; index >= 0; index -= 1) {
    const date = new Date(todayStart.getTime() - index * DAY_MS)
    const dateKey = toSydneyDateKey(date)
    buckets.set(dateKey, {
      dateKey,
      label: date.toLocaleDateString("en-AU", {
        day: "numeric",
        month: "short",
        timeZone: "Australia/Sydney",
      }),
      grossCents: 0,
      refundCents: 0,
      disputeCents: 0,
      netCents: 0,
      orderCount: 0,
      feeEstimateCents: 0,
    })
  }

  for (const row of paidRows) {
    if (!row.paid_at) continue
    const bucket = buckets.get(toSydneyDateKey(row.paid_at))
    if (!bucket) continue
    bucket.grossCents += Number(row.amount_cents ?? 0)
    bucket.netCents += Number(row.amount_cents ?? 0)
    bucket.orderCount += 1
    bucket.feeEstimateCents += rowFeeCents(row)
  }

  const deductions = buildNetRetainedDeductions({
    paidRows,
    refundRows,
    disputeRows,
  })
  for (const row of deductions) {
    const bucket = buckets.get(toSydneyDateKey(row.occurredAt))
    if (!bucket) continue
    if (row.type === "refund") bucket.refundCents += row.cents
    else bucket.disputeCents += row.cents
    bucket.netCents -= row.cents
  }

  return [...buckets.values()]
}

// Stripe AU domestic-card baseline. Used only for rows whose actual
// balance-transaction fee has not been cached on the intake (the Ads Agent fee
// sync covers ads-attributed orders); surfaces mixing estimates must render
// totals as approximate.
const STRIPE_FEE_ESTIMATE_RATE = 0.017
const STRIPE_FEE_ESTIMATE_FIXED_CENTS = 30

export function estimateStripeFeeCents(amountCents: number): number {
  if (!Number.isFinite(amountCents) || amountCents <= 0) return 0
  return Math.round(amountCents * STRIPE_FEE_ESTIMATE_RATE) + STRIPE_FEE_ESTIMATE_FIXED_CENTS
}

function rowFeeCents(row: PaidRevenueRow): number {
  if (
    typeof row.stripe_fee_cents === "number" &&
    Number.isFinite(row.stripe_fee_cents) &&
    row.stripe_fee_cents >= 0
  ) {
    return row.stripe_fee_cents
  }
  return estimateStripeFeeCents(Number(row.amount_cents ?? 0))
}

/**
 * Percent change of net retained vs the prior equivalent window, rounded to a
 * whole percent. Null when the prior window retained nothing — a ratio against
 * zero reads as noise, so the UI shows "no prior" instead.
 */
export function computeNetChangePct(currentCents: number, priorCents: number): number | null {
  if (priorCents <= 0) return null
  return Math.round(((currentCents - priorCents) / priorCents) * 100)
}

function buildTrendPeriod(args: {
  key: RevenueTrendPeriodKey
  label: string
  comparisonLabel: string
  paidRows: PaidRevenueRow[]
  refundRows: RefundRevenueRow[]
  disputeRows: DisputeRevenueRow[]
  since: Date
  until: Date
  priorSince: Date
  priorUntil: Date
}): RevenueTrendPeriod {
  const value = buildNetRetainedPurchaseValue({
    paidRows: args.paidRows,
    refundRows: args.refundRows,
    disputeRows: args.disputeRows,
    since: args.since,
    until: args.until,
  })
  const prior = buildNetRetainedPurchaseValue({
    paidRows: args.paidRows,
    refundRows: args.refundRows,
    disputeRows: args.disputeRows,
    since: args.priorSince,
    until: args.priorUntil,
  })
  const feeEstimateCents = args.paidRows.reduce((sum, row) => {
    if (!row.paid_at) return sum
    const timestamp = Date.parse(row.paid_at)
    if (
      !Number.isFinite(timestamp) ||
      timestamp < args.since.getTime() ||
      timestamp > args.until.getTime()
    ) {
      return sum
    }
    return sum + rowFeeCents(row)
  }, 0)

  return {
    key: args.key,
    label: args.label,
    comparisonLabel: args.comparisonLabel,
    ...value,
    feeEstimateCents,
    priorNetCents: prior.netCents,
    priorOrderCount: prior.orderCount,
    netChangePct: computeNetChangePct(value.netCents, prior.netCents),
  }
}

export function buildTrendPeriods(
  paidRows: PaidRevenueRow[],
  refundRows: RefundRevenueRow[],
  now: Date,
  disputeRows: DisputeRevenueRow[] = [],
): RevenueTrendPeriod[] {
  const { todayStart, last7DaysStart, last30DaysStart } = getRevenueWindowBounds(now)
  // Stepping back half a day from a Sydney midnight always lands inside the
  // previous Sydney day, so this stays correct across AEST/AEDT transitions.
  const yesterdayStart = startOfDaySydney(new Date(todayStart.getTime() - DAY_MS / 2))
  const dayBeforeStart = startOfDaySydney(new Date(yesterdayStart.getTime() - DAY_MS / 2))
  // Calendar-anchored prior windows snap to a true Sydney midnight the same
  // way: flat 7-day subtraction lands an hour off whenever the prior week
  // crosses an AEST/AEDT transition. The rolling 30-day pair deliberately
  // stays flat-ms on BOTH sides — current and prior are each exactly 720 real
  // hours, mirroring getRevenueWindowBounds' rolling definition.
  const prior7DaysStart = startOfDaySydney(new Date(last7DaysStart.getTime() - 6.5 * DAY_MS))
  const elapsedTodayMs = Math.max(0, now.getTime() - todayStart.getTime())
  const justBefore = (boundary: Date) => new Date(boundary.getTime() - 1)

  return [
    buildTrendPeriod({
      key: "today",
      label: "Today",
      comparisonLabel: "vs same time yesterday",
      paidRows,
      refundRows,
      disputeRows,
      since: todayStart,
      until: now,
      priorSince: yesterdayStart,
      priorUntil: new Date(yesterdayStart.getTime() + elapsedTodayMs),
    }),
    buildTrendPeriod({
      key: "yesterday",
      label: "Yesterday",
      comparisonLabel: "vs prior day",
      paidRows,
      refundRows,
      disputeRows,
      since: yesterdayStart,
      until: justBefore(todayStart),
      priorSince: dayBeforeStart,
      priorUntil: justBefore(yesterdayStart),
    }),
    buildTrendPeriod({
      key: "last7Days",
      label: "7 days",
      comparisonLabel: "vs prior 7 days",
      paidRows,
      refundRows,
      disputeRows,
      since: last7DaysStart,
      until: now,
      priorSince: prior7DaysStart,
      priorUntil: justBefore(last7DaysStart),
    }),
    buildTrendPeriod({
      key: "last30Days",
      label: "30 days",
      comparisonLabel: "vs prior 30 days",
      paidRows,
      refundRows,
      disputeRows,
      since: last30DaysStart,
      until: now,
      priorSince: new Date(last30DaysStart.getTime() - 30 * DAY_MS),
      priorUntil: justBefore(last30DaysStart),
    }),
  ]
}

const PRIORITY_FEE_CENTS = 995
// Base med-cert tier prices (current since 2026-06-08). Rows whose normalised
// amount doesn't match a tier (e.g. legacy $19.95 orders) are excluded from
// the mix rather than misbucketed.
const CERT_TIER_BY_BASE_CENTS: Record<number, 1 | 2 | 3> = {
  2495: 1,
  2995: 2,
  3995: 3,
}

export function buildMonetisationReadouts(paidRows: PaidRevenueRow[]): RevenueMonetisationReadouts {
  let expressOrders = 0
  const durationCounts = new Map<1 | 2 | 3, number>()
  let certOrderCount = 0

  for (const row of paidRows) {
    const isExpress = row.is_priority === true
    if (isExpress) expressOrders += 1

    if (row.category === "medical_certificate") {
      certOrderCount += 1
      // amount_cents includes the priority fee when attached — normalise back
      // to the base tier price before bucketing.
      const baseCents = Number(row.amount_cents ?? 0) - (isExpress ? PRIORITY_FEE_CENTS : 0)
      const days = CERT_TIER_BY_BASE_CENTS[baseCents]
      if (days) durationCounts.set(days, (durationCounts.get(days) ?? 0) + 1)
    }
  }

  const bucketedCertTotal = [...durationCounts.values()].reduce((sum, n) => sum + n, 0)

  return {
    express: {
      paidOrders: paidRows.length,
      expressOrders,
      attachPct:
        paidRows.length > 0 ? Math.round((expressOrders / paidRows.length) * 1000) / 10 : 0,
      feeGrossCents: expressOrders * PRIORITY_FEE_CENTS,
    },
    certDurationMix:
      bucketedCertTotal > 0
        ? ([1, 2, 3] as const).map((days) => ({
            days,
            orderCount: durationCounts.get(days) ?? 0,
            sharePct: Math.round(((durationCounts.get(days) ?? 0) / bucketedCertTotal) * 1000) / 10,
          }))
        : [],
    certOrderCount,
  }
}

function buildServiceMix(paidRows: PaidRevenueRow[]): RevenueDashboardService[] {
  const grossTotal = sumAmounts(paidRows)
  const grouped = new Map<string, RevenueDashboardService>()

  for (const row of paidRows) {
    // Group by the display label, not category:subtype. Distinct subtypes that
    // render the SAME label (e.g. medical_certificate work/study/carer all show
    // "Medical certificates") were producing duplicate rows in the service mix.
    const label = serviceLabel(row.category, row.subtype)
    const current = grouped.get(label) ?? {
      key: label,
      label,
      grossCents: 0,
      netCents: 0,
      orderCount: 0,
      shareOfGross: 0,
    }
    const amountCents = Number(row.amount_cents ?? 0)
    const refundCents = getRecordedRefundCents(row)
    current.grossCents += amountCents
    current.netCents += amountCents - refundCents
    current.orderCount += 1
    grouped.set(label, current)
  }

  return [...grouped.values()]
    .map((row) => ({
      ...row,
      shareOfGross: grossTotal > 0 ? Math.round((row.grossCents / grossTotal) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.grossCents - a.grossCents)
}

function buildNoPurchaseWindow(
  input: RevenueDashboardInput,
  windowHours: number,
): NoPurchaseRevenueWindow {
  const since = new Date(input.now.getTime() - windowHours * 60 * 60 * 1000)

  return {
    windowHours,
    paidIntakes: input.paidRows.filter((row) => isAtOrAfter(row.paid_at, since)).length,
    createdIntakes: input.createdRows.filter((row) => isAtOrAfter(row.created_at, since)).length,
    checkoutStageIntakes: input.checkoutRows.filter((row) => isAtOrAfter(row.created_at, since)).length,
    partialDrafts: input.partialDraftRows.filter((row) => isAtOrAfter(row.updated_at, since)).length,
  }
}

function resolveDashboardStatus(
  alert: NoPurchaseRevenueAlert | null,
  paid24hCount: number,
  hoursSinceLastPayment: number | null,
): RevenueDashboardStatus {
  if (alert?.severity === "critical") return "critical"
  if (alert?.severity === "warning") return "watch"
  if (paid24hCount === 0 || hoursSinceLastPayment == null || hoursSinceLastPayment >= 24) return "quiet"
  return "healthy"
}

function statusLabel(status: RevenueDashboardStatus): string {
  if (status === "critical") return "No purchases 48h"
  if (status === "watch") return "No purchases 24h"
  if (status === "quiet") return "Quiet"
  return "Receiving payments"
}

/**
 * UTC instant of the most recent Australia/Sydney midnight at or before `date`.
 * Uses Intl so it honours both AEST (UTC+10) and AEDT (UTC+11) instead of a
 * hardcoded +10 offset, which silently shifted day boundaries by an hour during
 * daylight saving (Oct–Apr).
 */
export function startOfDaySydney(date: Date): Date {
  const dateKey = toSydneyDateKey(date)
  const naiveUtcMidnight = new Date(`${dateKey}T00:00:00.000Z`)
  return new Date(naiveUtcMidnight.getTime() - sydneyUtcOffsetMs(naiveUtcMidnight))
}

/** Milliseconds Australia/Sydney is ahead of UTC at instant `at` (AEST +10 / AEDT +11). */
function sydneyUtcOffsetMs(at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Australia/Sydney",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(at)
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value)
  const hour = get("hour") === 24 ? 0 : get("hour")
  const wallClockAsUtc = Date.UTC(get("year"), get("month") - 1, get("day"), hour, get("minute"), get("second"))
  return wallClockAsUtc - at.getTime()
}

function toSydneyDateKey(value: string | Date): string {
  return new Date(value).toLocaleDateString("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Australia/Sydney",
    year: "numeric",
  })
}

function isAtOrAfter(value: string | null | undefined, since: Date): boolean {
  if (!value) return false
  return new Date(value).getTime() >= since.getTime()
}

function sumAmounts(rows: PaidRevenueRow[]): number {
  return rows.reduce((sum, row) => sum + Number(row.amount_cents ?? 0), 0)
}

function sumRefunds(rows: RefundRevenueRow[]): number {
  return rows.reduce(
    (sum, row) => sum + getRecordedRefundCents(row),
    0,
  )
}

function serviceLabel(category: string | null, subtype: string | null): string {
  if (category === "medical_certificate") return "Medical certificates"
  if (category === "prescription") return "Repeat prescriptions"
  if (category === "consult" && subtype === "ed") return "ED consults"
  if (category === "consult" && subtype === "hair_loss") return "Hair loss"
  if (category === "consult" && subtype === "womens_health") return "Women's health"
  if (category === "consult" && subtype === "weight_loss") return "Weight loss"
  if (category === "consult") return "Consults"
  return "Other"
}
