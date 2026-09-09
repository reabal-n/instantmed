import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { resolveGoogleAdsPurchaseCampaignId } from "@/lib/ads-agent/campaign-attribution"
import {
  aggregateFirstOrderCampaignEconomics,
  type CampaignPurchaseRow,
  type PurchaseHistoryRow,
} from "@/lib/ads-agent/first-order-economics-core"
import type { AdsSnapshotWindow, CampaignEconomics } from "@/lib/ads-agent/types"
import { GOOGLE_ADS_ATTRIBUTION_SELECT } from "@/lib/analytics/google-ads-post-payment"
import {
  collectCustomerGrowthAttributionIntakeIds,
  readCustomerGrowthRevenueEvidence,
} from "@/lib/data/customer-growth-revenue-read"
import { filterReportableIntakes } from "@/lib/data/reporting-filters"
import { REVENUE_PURCHASE_PAYMENT_STATUSES } from "@/lib/monitoring/revenue-safety"

const MAX_HISTORY_ROWS = 5_000
const CHUNK_SIZE = 100

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
