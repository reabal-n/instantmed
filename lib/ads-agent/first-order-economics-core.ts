import "server-only"

import { resolveGoogleAdsPurchaseCampaignId } from "@/lib/ads-agent/campaign-attribution"
import type { AdsFirstOrderEconomics, AdsRepeatValueEvidence } from "@/lib/ads-agent/types"
import type { GoogleAdsAttributionRow } from "@/lib/analytics/google-ads-post-payment"
import {
  buildCustomerGrowthRevenueForIntakeIds,
  type CustomerGrowthRevenueEvidence,
} from "@/lib/data/customer-growth-revenue-read"
import { estimateStripeFeeCents } from "@/lib/data/revenue-dashboard"

export interface PurchaseHistoryRow {
  id: string
  patient_id: string | null
  paid_at: string | null
}
export interface CampaignPurchaseRow extends PurchaseHistoryRow, GoogleAdsAttributionRow {
  campaignid: string | null
  utm_id: string | null
  stripe_fee_cents: number | null
  stripe_balance_transaction_id: string | null
  stripe_fee_synced_at: string | null
}

/** Pure cash reducer. Identifiers are used only for joins and never returned. */
export function aggregateFirstOrderCampaignEconomics(args: {
  campaignId: string
  evidence: CustomerGrowthRevenueEvidence
  history: PurchaseHistoryRow[]
  rows: CampaignPurchaseRow[]
  since: Date
  spendCents: number | null
  until: Date
}): AdsFirstOrderEconomics {
  if (!Number.isSafeInteger(args.spendCents) || args.spendCents! < 0) throw new Error("first_order_spend_unavailable")
  const earliest = new Map<string, PurchaseHistoryRow>()
  const historyById = new Map<string, PurchaseHistoryRow>()
  for (const row of args.history) {
    if (!row.id || !row.patient_id || !Number.isFinite(Date.parse(row.paid_at ?? "")) || historyById.has(row.id)) {
      throw new Error("first_order_history_unavailable")
    }
    historyById.set(row.id, row)
    const previous = earliest.get(row.patient_id)
    if (!previous || Date.parse(row.paid_at!) < Date.parse(previous.paid_at!)
      || (Date.parse(row.paid_at!) === Date.parse(previous.paid_at!) && row.id < previous.id)) {
      earliest.set(row.patient_id, row)
    }
  }
  const campaignRows = args.rows.filter((row) => resolveGoogleAdsPurchaseCampaignId(row) === args.campaignId)
  const firstIds = new Set<string>()
  for (const row of campaignRows) {
    const historic = historyById.get(row.id)
    if (!row.patient_id || !historic || historic.patient_id !== row.patient_id || historic.paid_at !== row.paid_at) {
      throw new Error("first_order_identity_unavailable")
    }
    if (earliest.get(row.patient_id)?.id === row.id) firstIds.add(row.id)
  }
  const cash = buildCustomerGrowthRevenueForIntakeIds(args.evidence, firstIds, args.since, args.until)
  let stripeFeeCents = 0
  let orders = 0
  for (const row of campaignRows) {
    const paidAt = Date.parse(row.paid_at ?? "")
    if (!firstIds.has(row.id) || paidAt < args.since.getTime() || paidAt > args.until.getTime()) continue
    if (!Number.isSafeInteger(row.stripe_fee_cents) || row.stripe_fee_cents! < 0
      || !row.stripe_balance_transaction_id || !Number.isFinite(Date.parse(row.stripe_fee_synced_at ?? ""))) {
      throw new Error("first_order_fees_unavailable")
    }
    stripeFeeCents += row.stripe_fee_cents!
    orders += 1
  }
  return { orders, stripeFeeCents, netRetainedRevenueCents: cash.netCents, contributionCents: cash.netCents - stripeFeeCents - args.spendCents! }
}

export interface CohortPurchaseRow extends PurchaseHistoryRow {
  amount_cents?: number | null
  stripe_fee_cents?: number | null
  stripe_balance_transaction_id?: string | null
  stripe_fee_synced_at?: string | null
}

export const REPEAT_COHORT_WINDOW_DAYS = 60
const DAY_MS = 24 * 60 * 60 * 1000

function hasSyncedFee(row: CohortPurchaseRow): boolean {
  return Number.isSafeInteger(row.stripe_fee_cents) && row.stripe_fee_cents! >= 0
    && Boolean(row.stripe_balance_transaction_id)
    && Number.isFinite(Date.parse(row.stripe_fee_synced_at ?? ""))
}

/**
 * Pure cohort reducer (owner decision 2026-09-19). A matured first order is a
 * campaign-attributed purchase inside [cohortStart, cohortEnd] that is the
 * patient's earliest reportable purchase. Its repeat cash is every later
 * purchase by that patient, on any channel, within 60 days, at exact
 * cash-ledger value, less actual fees (estimated only where never synced).
 * Identifiers are used only for joins and never returned.
 */
export function aggregateCampaignRepeatValue(args: {
  campaignId: string
  cohortEnd: Date
  cohortRows: CampaignPurchaseRow[]
  cohortStart: Date
  evidence: CustomerGrowthRevenueEvidence
  history: CohortPurchaseRow[]
  until: Date
}): AdsRepeatValueEvidence {
  const earliest = new Map<string, PurchaseHistoryRow>()
  const historyById = new Map<string, CohortPurchaseRow>()
  for (const row of args.history) {
    if (!row.id || !row.patient_id || !Number.isFinite(Date.parse(row.paid_at ?? "")) || historyById.has(row.id)) {
      throw new Error("repeat_value_history_unavailable")
    }
    historyById.set(row.id, row)
    const previous = earliest.get(row.patient_id)
    if (!previous || Date.parse(row.paid_at!) < Date.parse(previous.paid_at!)
      || (Date.parse(row.paid_at!) === Date.parse(previous.paid_at!) && row.id < previous.id)) {
      earliest.set(row.patient_id, row)
    }
  }
  const firstOrders: CohortPurchaseRow[] = []
  for (const row of args.cohortRows) {
    if (resolveGoogleAdsPurchaseCampaignId(row) !== args.campaignId) continue
    if (!row.patient_id) throw new Error("repeat_value_identity_unavailable")
    const historic = historyById.get(row.id)
    if (!historic || historic.patient_id !== row.patient_id) throw new Error("repeat_value_identity_unavailable")
    const paidAt = Date.parse(row.paid_at ?? "")
    if (paidAt < args.cohortStart.getTime() || paidAt > args.cohortEnd.getTime()) continue
    if (earliest.get(row.patient_id)?.id === row.id) firstOrders.push(historic)
  }
  const repeatIds = new Set<string>()
  let repeatStripeFeeCents = 0
  let estimatedFeeOrders = 0
  for (const first of firstOrders) {
    const firstAt = Date.parse(first.paid_at!)
    for (const row of args.history) {
      if (row.patient_id !== first.patient_id || row.id === first.id || repeatIds.has(row.id)) continue
      const paidAt = Date.parse(row.paid_at!)
      if (paidAt <= firstAt || paidAt > firstAt + REPEAT_COHORT_WINDOW_DAYS * DAY_MS || paidAt > args.until.getTime()) continue
      repeatIds.add(row.id)
      if (hasSyncedFee(row)) {
        repeatStripeFeeCents += row.stripe_fee_cents!
      } else {
        repeatStripeFeeCents += estimateStripeFeeCents(Number(row.amount_cents ?? 0))
        estimatedFeeOrders += 1
      }
    }
  }
  const cash = buildCustomerGrowthRevenueForIntakeIds(args.evidence, repeatIds, args.cohortStart, args.until)
  const maturedFirstOrders = firstOrders.length
  return {
    cohortWindowDays: REPEAT_COHORT_WINDOW_DAYS,
    cohortStartUtc: args.cohortStart.toISOString(),
    cohortEndUtc: args.cohortEnd.toISOString(),
    maturedFirstOrders,
    repeatOrders: repeatIds.size,
    repeatNetRetainedRevenueCents: cash.netCents,
    repeatStripeFeeCents,
    estimatedFeeOrders,
    repeatContributionPerFirstOrderCents: maturedFirstOrders > 0
      ? Math.floor((cash.netCents - repeatStripeFeeCents) / maturedFirstOrders)
      : 0,
  }
}
