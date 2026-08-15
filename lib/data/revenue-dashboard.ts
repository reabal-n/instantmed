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
const MAX_DISPUTE_BASELINE_ROWS = 5_000
const MAX_REFUND_MOVEMENT_ROWS = 5_000
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
  category?: string | null
  id: string | null
  amount_cents: number | null
  refund_amount_cents: number | null
  refund_status: string | null
  refund_reversed_at?: string | null
  refunded_at: string | null
  stripe_refund_id?: string | null
  subtype?: string | null
}

type DisputeRevenueRow = NetRetainedDisputeRow & {
  category?: string | null
  subtype?: string | null
}

type LinkedDisputeIntakeRow = {
  category: string | null
  id: string
  amount_cents: number | null
  exclude_from_reporting: boolean | null
  patient_id: string | null
  refund_amount_cents: number | null
  refund_status: string | null
  refunded_at: string | null
  subtype: string | null
}

type StripeDisputeReadRow = {
  funds_reinstated_at: string | null
  funds_reinstated_cents: number | null
  funds_withdrawn_at: string | null
  funds_withdrawn_cents: number | null
  intake: LinkedDisputeIntakeRow | LinkedDisputeIntakeRow[] | null
  intake_id: string | null
}

type StripeRefundMovementReadRow = {
  amount_cents: number | null
  category: string | null
  exclude_from_reporting: boolean | null
  intake_id: string | null
  livemode: boolean
  order_amount_cents: number | null
  patient_id: string | null
  refund_cash_at: string | null
  refund_created_at: string | null
  refund_reversed_at: string | null
  stripe_refund_id: string
  subtype: string | null
}

type StripeRefundLedgerHealthRow = {
  conflicting_refund_count: number | string | null
  incomplete_intake_count: number | string | null
  unknown_priority_classification_count: number | string | null
  unknown_mode_dispute_count: number | string | null
  unsupported_currency_dispute_count: number | string | null
  unlinked_live_dispute_count: number | string | null
  unlinked_live_dispute_cents: number | string | null
  unlinked_refund_count: number | string | null
  unlinked_refund_cents: number | string | null
  unledgered_refund_cents: number | string | null
  unsupported_currency_refund_count: number | string | null
  unsupported_currency_refund_cents: number | string | null
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
    supabase
      .from("stripe_refund_cash_movements")
      .select(
        "stripe_refund_id, intake_id, amount_cents, refund_created_at, refund_cash_at, " +
        "refund_reversed_at, livemode, order_amount_cents, category, subtype, " +
        "exclude_from_reporting, patient_id",
        { count: "exact" },
      )
      .eq("currency", "aud")
      .eq("livemode", true)
      .or(
        `and(refund_cash_at.gte.${fetchSince},refund_cash_at.lte.${nowIso}),` +
        `and(refund_reversed_at.gte.${fetchSince},refund_reversed_at.lte.${nowIso})`,
      )
      .limit(MAX_REFUND_MOVEMENT_ROWS),
    supabase
      .from("stripe_refund_ledger_health")
      .select(
        "conflicting_refund_count, incomplete_intake_count, unledgered_refund_cents, " +
        "unlinked_refund_count, unlinked_refund_cents, unsupported_currency_refund_count, " +
        "unsupported_currency_refund_cents, unlinked_live_dispute_count, " +
        "unlinked_live_dispute_cents, unknown_mode_dispute_count, " +
        "unsupported_currency_dispute_count, unknown_priority_classification_count",
      )
      .single(),
    supabase
      .from("stripe_disputes")
      .select(
        "intake_id, funds_withdrawn_at, funds_withdrawn_cents, funds_reinstated_at, funds_reinstated_cents, intake:intakes(id, amount_cents, category, subtype, refund_amount_cents, refund_status, refunded_at, exclude_from_reporting, patient_id)",
        { count: "exact" },
      )
      .eq("currency", "aud")
      .eq("livemode", true)
      // The full outstanding dispute baseline must precede current refund
      // events, otherwise an older loss can be deducted twice in this window.
      .not("funds_withdrawn_at", "is", null)
      .lte("funds_withdrawn_at", nowIso)
      .order("funds_withdrawn_at", { ascending: false })
      .limit(MAX_DISPUTE_BASELINE_ROWS),
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
  const refundLedgerHealthResult = results[2].status === "fulfilled" ? results[2].value : null
  const disputeResult = results[3].status === "fulfilled" ? results[3].value : null
  const createdResult = results[4].status === "fulfilled" ? results[4].value : null
  const checkoutResult = results[5].status === "fulfilled" ? results[5].value : null
  const partialDraftResult = results[6].status === "fulfilled" ? results[6].value : null
  const refundStatsRead = results[7].status === "fulfilled" ? results[7].value : null
  const paidRowsAvailable = paidResult !== null && !paidResult.error
  const refundMovementRows = refundResult && !refundResult.error
    ? ((refundResult.data ?? []) as unknown as StripeRefundMovementReadRow[])
    : []
  const refundLedgerHealth = normalizeRefundLedgerHealth(refundLedgerHealthResult?.data)
  const refundRowsAvailable =
    refundResult !== null &&
    !refundResult.error &&
    typeof refundResult.count === "number" &&
    refundResult.count <= refundMovementRows.length &&
    refundMovementRows.every(hasCompleteRefundMovementEvidence) &&
    refundLedgerHealthResult !== null &&
    !refundLedgerHealthResult.error &&
    refundLedgerHealth.problemCount === 0 &&
    refundLedgerHealth.problemCents === 0
  const disputeRowsAvailable =
    disputeResult !== null &&
    !disputeResult.error &&
    typeof disputeResult.count === "number" &&
    disputeResult.count <= (disputeResult.data?.length ?? 0)
  const createdRowsAvailable = createdResult !== null && !createdResult.error
  const checkoutRowsAvailable = checkoutResult !== null && !checkoutResult.error
  const partialDraftRowsAvailable = partialDraftResult !== null && !partialDraftResult.error
  const refundStatsAvailable = refundStatsRead?.availability === "available"
  const paidRows = paidRowsAvailable
    ? ((paidResult.data ?? []) as PaidRevenueRow[])
    : []
  const refundRows = normalizeRefundMovementRows(refundMovementRows)
  const disputeReadRows = disputeRowsAvailable
    ? ((disputeResult.data ?? []) as StripeDisputeReadRow[])
    : []
  const disputeRows = normalizeDisputeRows(disputeReadRows, refundRows)
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

function normalizeRefundMovementRows(
  rows: StripeRefundMovementReadRow[],
): RefundRevenueRow[] {
  const includeSeeded = shouldIncludeSeededE2EData()
  const seededPatientIds = new Set<string>(SEEDED_E2E_PATIENT_PROFILE_IDS)
  return rows.flatMap((row) => {
    if (
      !row.intake_id ||
      row.exclude_from_reporting === true ||
      (!includeSeeded && row.patient_id && seededPatientIds.has(row.patient_id))
    ) {
      return []
    }
    return [{
      amount_cents: row.order_amount_cents,
      category: row.category,
      id: row.intake_id,
      refund_amount_cents: row.amount_cents,
      refund_status: "succeeded",
      refunded_at: row.refund_cash_at,
      refund_reversed_at: row.refund_reversed_at,
      stripe_refund_id: row.stripe_refund_id,
      subtype: row.subtype,
    }]
  })
}

function hasCompleteRefundMovementEvidence(row: StripeRefundMovementReadRow): boolean {
  return Boolean(
    row.intake_id &&
    row.stripe_refund_id &&
    row.refund_cash_at &&
    Number.isFinite(Date.parse(row.refund_cash_at)) &&
    (
      row.refund_reversed_at === null ||
      (
        Number.isFinite(Date.parse(row.refund_reversed_at)) &&
        Date.parse(row.refund_reversed_at) >= Date.parse(row.refund_cash_at)
      )
    ) &&
    Number.isInteger(row.amount_cents) &&
    Number(row.amount_cents) > 0,
  )
}

function normalizeRefundLedgerHealth(data: unknown): {
  problemCount: number
  problemCents: number
} {
  const value = Array.isArray(data) ? data[0] : data
  const row = value as StripeRefundLedgerHealthRow | null | undefined
  const counts = [
    row?.conflicting_refund_count,
    row?.incomplete_intake_count,
    row?.unknown_priority_classification_count,
    row?.unlinked_refund_count,
    row?.unsupported_currency_refund_count,
    row?.unlinked_live_dispute_count,
    row?.unknown_mode_dispute_count,
    row?.unsupported_currency_dispute_count,
  ].map(Number)
  const cents = [
    row?.unledgered_refund_cents,
    row?.unlinked_refund_cents,
    row?.unsupported_currency_refund_cents,
    row?.unlinked_live_dispute_cents,
  ].map(Number)
  return {
    problemCount: counts.every(Number.isFinite)
      ? counts.reduce((sum, value) => sum + value, 0)
      : Number.POSITIVE_INFINITY,
    problemCents: cents.every(Number.isFinite)
      ? cents.reduce((sum, value) => sum + value, 0)
      : Number.POSITIVE_INFINITY,
  }
}

function normalizeDisputeRows(
  rows: StripeDisputeReadRow[],
  refundRows: RefundRevenueRow[],
): DisputeRevenueRow[] {
  const includeSeeded = shouldIncludeSeededE2EData()
  const seededPatientIds = new Set<string>(SEEDED_E2E_PATIENT_PROFILE_IDS)
  const currentRefundCentsByIntake = new Map<string, number>()
  for (const row of refundRows) {
    if (!row.id) continue
    const outstandingMovementCents = row.refund_reversed_at
      ? 0
      : getRecordedRefundCents(row)
    currentRefundCentsByIntake.set(
      row.id,
      (currentRefundCentsByIntake.get(row.id) ?? 0) + outstandingMovementCents,
    )
  }
  const disputeRows: DisputeRevenueRow[] = []

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
      category: intake?.category ?? null,
      funds_reinstated_at: row.funds_reinstated_at,
      funds_reinstated_cents: row.funds_reinstated_cents,
      funds_withdrawn_at: row.funds_withdrawn_at,
      funds_withdrawn_cents: row.funds_withdrawn_cents,
      order_amount_cents: intake?.amount_cents ?? null,
      prior_refund_cents: Math.max(
        Number(intake?.refund_amount_cents ?? 0) -
          (row.intake_id ? currentRefundCentsByIntake.get(row.intake_id) ?? 0 : 0),
        0,
      ),
      subtype: intake?.subtype ?? null,
    })
  }

  return disputeRows
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
      totalRefunded30dCents: sumRefundMovements(
        input.paidRows,
        input.refundRows,
        last30DaysStart,
        input.now,
      ),
    },
    windows,
    trendPeriods: buildTrendPeriods(input.paidRows, input.refundRows, input.now, disputeRows),
    daily,
    maxDailyNetCents: Math.max(0, ...daily.map((day) => Math.max(day.netCents, 0))),
    serviceMix: buildServiceMix(
      input.paidRows,
      input.refundRows,
      disputeRows,
      last30DaysStart,
      input.now,
    ),
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
    if (row.type === "refund") {
      bucket.refundCents += row.cents
      bucket.netCents -= row.cents
    } else if (row.type === "refund_reversal") {
      bucket.refundCents -= row.cents
      bucket.netCents += row.cents
    } else if (row.type === "dispute") {
      bucket.disputeCents += row.cents
      bucket.netCents -= row.cents
    } else {
      bucket.disputeCents -= row.cents
      bucket.netCents += row.cents
    }
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

function buildServiceMix(
  paidRows: PaidRevenueRow[],
  refundRows: RefundRevenueRow[],
  disputeRows: DisputeRevenueRow[],
  since: Date,
  until: Date,
): RevenueDashboardService[] {
  const windowPaidRows = paidRows.filter((row) => isWithinRange(row.paid_at, since, until))
  const grossTotal = sumAmounts(windowPaidRows)
  const grouped = new Map<string, RevenueDashboardService>()
  const labelByIntake = new Map<string, string>()

  for (const row of paidRows) {
    if (row.id) labelByIntake.set(row.id, serviceLabel(row.category, row.subtype))
  }
  for (const row of refundRows) {
    if (row.id && (row.category || row.subtype)) {
      labelByIntake.set(row.id, serviceLabel(row.category ?? null, row.subtype ?? null))
    }
  }
  for (const row of disputeRows) {
    if (row.intake_id && (row.category || row.subtype)) {
      labelByIntake.set(
        row.intake_id,
        serviceLabel(row.category ?? null, row.subtype ?? null),
      )
    }
  }

  for (const row of windowPaidRows) {
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
    current.grossCents += amountCents
    current.netCents += amountCents
    current.orderCount += 1
    grouped.set(label, current)
  }

  const deductions = buildNetRetainedDeductions({ paidRows, refundRows, disputeRows })
    .filter((row) => isWithinRange(row.occurredAt, since, until))
  for (const deduction of deductions) {
    const label = deduction.intakeId
      ? labelByIntake.get(deduction.intakeId) ?? "Unattributed adjustments"
      : "Unattributed adjustments"
    const current = grouped.get(label) ?? {
      key: label,
      label,
      grossCents: 0,
      netCents: 0,
      orderCount: 0,
      shareOfGross: 0,
    }
    const signedCents = (
      deduction.type === "refund_reversal" ||
      deduction.type === "dispute_reinstatement"
    )
      ? deduction.cents
      : -deduction.cents
    current.netCents += signedCents
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

function isWithinRange(
  value: string | null | undefined,
  since: Date,
  until: Date,
): boolean {
  if (!value) return false
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) && timestamp >= since.getTime() && timestamp <= until.getTime()
}

function sumAmounts(rows: PaidRevenueRow[]): number {
  return rows.reduce((sum, row) => sum + Number(row.amount_cents ?? 0), 0)
}

function sumRefundMovements(
  paidRows: PaidRevenueRow[],
  refundRows: RefundRevenueRow[],
  since: Date,
  until: Date,
): number {
  return Math.max(0, buildNetRetainedDeductions({ paidRows, refundRows, disputeRows: [] })
    .filter((row) =>
      (row.type === "refund" || row.type === "refund_reversal") &&
      isWithinRange(row.occurredAt, since, until),
    )
    .reduce(
      (sum, row) => sum + (row.type === "refund_reversal" ? -row.cents : row.cents),
      0,
    ))
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
