import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { resolveGoogleAdsPurchaseCampaignId } from "@/lib/ads-agent/campaign-attribution"
import type { AdsFirstOrderEconomics, AdsSnapshotWindow, CampaignEconomics } from "@/lib/ads-agent/types"
import { GOOGLE_ADS_ATTRIBUTION_SELECT, type GoogleAdsAttributionRow } from "@/lib/analytics/google-ads-post-payment"
import {
  buildCustomerGrowthRevenueForIntakeIds,
  collectCustomerGrowthAttributionIntakeIds,
  type CustomerGrowthRevenueEvidence,
  readCustomerGrowthRevenueEvidence,
} from "@/lib/data/customer-growth-revenue-read"
import { filterReportableIntakes } from "@/lib/data/reporting-filters"
import { REVENUE_PURCHASE_PAYMENT_STATUSES } from "@/lib/monitoring/revenue-safety"

interface PurchaseHistoryRow {
  id: string
  patient_id: string | null
  paid_at: string | null
}
interface CampaignPurchaseRow extends PurchaseHistoryRow, GoogleAdsAttributionRow {
  campaignid: string | null
  utm_id: string | null
  stripe_fee_cents: number | null
  stripe_balance_transaction_id: string | null
  stripe_fee_synced_at: string | null
}

const MAX_HISTORY_ROWS = 5_000
const CHUNK_SIZE = 100

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

/** Read only: exact cash-ledger evidence plus all historical purchases for affected patients. */
export async function readFirstOrderCampaignEconomics(args: {
  campaigns: CampaignEconomics[]
  range: AdsSnapshotWindow
  supabase: SupabaseClient
}): Promise<CampaignEconomics[]> {
  const since = new Date(args.range.startUtc)
  // The canonical cash reader uses an inclusive end; Ads windows are exclusive.
  const until = new Date(Date.parse(args.range.endUtcExclusive) - 1)
  try {
    const evidence = await readCustomerGrowthRevenueEvidence(args.supabase, since, until)
    const ids = [...collectCustomerGrowthAttributionIntakeIds(evidence)]
    const rows: CampaignPurchaseRow[] = []
    for (let index = 0; index < ids.length; index += CHUNK_SIZE) {
      const chunk = ids.slice(index, index + CHUNK_SIZE)
      const result = await filterReportableIntakes(args.supabase.from("intakes")
        .select(`id, patient_id, paid_at, stripe_fee_cents, stripe_balance_transaction_id, stripe_fee_synced_at, ${GOOGLE_ADS_ATTRIBUTION_SELECT}`, { count: "exact" })
        .in("id", chunk).limit(CHUNK_SIZE))
      if (result.error || result.count !== chunk.length || result.data?.length !== chunk.length) throw new Error("first_order_rows_incomplete")
      rows.push(...result.data as CampaignPurchaseRow[])
    }
    const campaignIds = new Set(args.campaigns.map((campaign) => campaign.campaignId))
    const relevant = rows.filter((row) => campaignIds.has(resolveGoogleAdsPurchaseCampaignId(row) ?? ""))
    if (relevant.some((row) => !row.patient_id)) throw new Error("first_order_identity_unavailable")
    const patientIds = [...new Set(relevant.map((row) => row.patient_id!))]
    const history: PurchaseHistoryRow[] = []
    for (let index = 0; index < patientIds.length; index += CHUNK_SIZE) {
      const result = await filterReportableIntakes(args.supabase.from("intakes")
        .select("id, patient_id, paid_at", { count: "exact" })
        .in("patient_id", patientIds.slice(index, index + CHUNK_SIZE))
        .in("payment_status", [...REVENUE_PURCHASE_PAYMENT_STATUSES])
        .not("paid_at", "is", null).lte("paid_at", until.toISOString()).limit(MAX_HISTORY_ROWS))
      if (result.error || typeof result.count !== "number" || result.count !== result.data?.length) throw new Error("first_order_history_incomplete")
      history.push(...result.data as PurchaseHistoryRow[])
    }
    return args.campaigns.map((campaign) => {
      try {
        return { ...campaign, firstOrder: aggregateFirstOrderCampaignEconomics({ campaignId: campaign.campaignId, evidence, history, rows, since, until, spendCents: campaign.spendCents }) }
      } catch {
        return { ...campaign, firstOrder: null }
      }
    })
  } catch {
    return args.campaigns.map((campaign) => ({ ...campaign, firstOrder: null }))
  }
}
