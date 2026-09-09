import "server-only"

import { resolveGoogleAdsPurchaseCampaignId } from "@/lib/ads-agent/campaign-attribution"
import type { AdsFirstOrderEconomics } from "@/lib/ads-agent/types"
import type { GoogleAdsAttributionRow } from "@/lib/analytics/google-ads-post-payment"
import {
  buildCustomerGrowthRevenueForIntakeIds,
  type CustomerGrowthRevenueEvidence,
} from "@/lib/data/customer-growth-revenue-read"

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
