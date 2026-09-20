import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { resolveGoogleAdsPurchaseCampaignId } from "@/lib/ads-agent/campaign-attribution"
import {
  aggregateCampaignRepeatValue,
  aggregateFirstOrderCampaignEconomics,
  type CampaignPurchaseRow,
  type CohortPurchaseRow,
  type PurchaseHistoryRow,
  refreshCampaignCash,
  REPEAT_COHORT_WINDOW_DAYS,
} from "@/lib/ads-agent/first-order-economics-core"
import { POLICY } from "@/lib/ads-agent/policy"
import type { AdsRepeatValueEvidence, AdsSnapshotWindow, CampaignEconomics } from "@/lib/ads-agent/types"
import { GOOGLE_ADS_ATTRIBUTION_SELECT } from "@/lib/analytics/google-ads-post-payment"
import {
  collectCustomerGrowthAttributionIntakeIds,
  readCustomerGrowthRevenueEvidence,
} from "@/lib/data/customer-growth-revenue-read"
import { filterReportableIntakes } from "@/lib/data/reporting-filters"
import { REVENUE_PURCHASE_PAYMENT_STATUSES } from "@/lib/monitoring/revenue-safety"

const MAX_HISTORY_ROWS = 5_000
const CHUNK_SIZE = 100

/**
 * Reader failures that only leave the first-order diagnostic unknown (which
 * purchase was a patient's first). They never touch the cash-ledger,
 * purchase-row, actual-fee or spend truth, so they stay advisory. Every other
 * failure, including an unexpected one, is a financial-integrity failure.
 */
const ATTRIBUTION_ONLY_FAILURES: ReadonlySet<string> = new Set([
  "first_order_history_incomplete",
  "first_order_history_unavailable",
  "first_order_identity_unavailable",
])

export interface FirstOrderCampaignEconomicsEvidence {
  campaigns: CampaignEconomics[]
  /**
   * Campaign IDs whose fresh cash-ledger, purchase-row, actual-fee or spend
   * evidence failed or came back incomplete, with the reason. Identity and
   * purchase-history gaps are not listed; they only leave `firstOrder` null.
   */
  financialFailures: ReadonlyMap<string, string>
}

function failureReason(error: unknown): string {
  return error instanceof Error && error.message ? error.message : "first_order_read_failed"
}

/** Read only: exact cash-ledger evidence plus all historical purchases for affected patients. */
export async function readFirstOrderCampaignEconomicsEvidence(args: {
  campaigns: CampaignEconomics[]
  range: AdsSnapshotWindow
  supabase: SupabaseClient
}): Promise<FirstOrderCampaignEconomicsEvidence> {
  const since = new Date(args.range.startUtc)
  // The canonical cash reader uses an inclusive end; Ads windows are exclusive.
  const until = new Date(Date.parse(args.range.endUtcExclusive) - 1)
  const financialFailures = new Map<string, string>()
  let financialCampaigns = args.campaigns
  const unavailable = (campaign: CampaignEconomics, error: unknown): CampaignEconomics => {
    const reason = failureReason(error)
    if (!ATTRIBUTION_ONLY_FAILURES.has(reason)) {
      financialFailures.set(campaign.campaignId, reason)
      return { ...campaign, firstOrder: null, contributionCents: null, contributionMargin: null, netRetainedRevenueCents: null, stripeFeeCents: null }
    }
    return { ...campaign, firstOrder: null }
  }
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
    financialCampaigns = args.campaigns.map((campaign) => {
      try {
        return refreshCampaignCash({ campaign, evidence, rows, since, until })
      } catch (error) {
        return unavailable(campaign, error)
      }
    })
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
    const campaigns = financialCampaigns.map((campaign) => {
      if (financialFailures.has(campaign.campaignId)) return campaign
      try {
        return { ...campaign, firstOrder: aggregateFirstOrderCampaignEconomics({ campaignId: campaign.campaignId, evidence, history, rows, since, until, spendCents: campaign.spendCents }) }
      } catch (error) {
        return unavailable(campaign, error)
      }
    })
    return { campaigns, financialFailures }
  } catch (error) {
    return { campaigns: financialCampaigns.map((campaign) => unavailable(campaign, error)), financialFailures }
  }
}

/** Campaigns only: any failure leaves `firstOrder` null (stored-snapshot diagnostic use). */
export async function readFirstOrderCampaignEconomics(args: {
  campaigns: CampaignEconomics[]
  range: AdsSnapshotWindow
  supabase: SupabaseClient
}): Promise<CampaignEconomics[]> {
  const fresh = await readFirstOrderCampaignEconomicsEvidence(args)
  // Stored snapshots already own their financial read. This legacy wrapper
  // enriches only the diagnostic; authorization consumes the full fresh result.
  return args.campaigns.map((campaign, index) => ({ ...campaign, firstOrder: fresh.campaigns[index].firstOrder }))
}

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Read only: the matured first-order cohort for each campaign and its 60-day
 * repeat cash on any channel. Horizon = 60 days of maturity plus the cohort
 * span before the window end. Any failure yields null for every campaign.
 */
export async function readCampaignRepeatValue(args: {
  campaigns: CampaignEconomics[]
  range: AdsSnapshotWindow
  supabase: SupabaseClient
}): Promise<Map<string, AdsRepeatValueEvidence | null>> {
  const result = new Map<string, AdsRepeatValueEvidence | null>(
    args.campaigns.map((campaign) => [campaign.campaignId, null]),
  )
  const until = new Date(Date.parse(args.range.endUtcExclusive) - 1)
  const cohortEnd = new Date(until.getTime() - REPEAT_COHORT_WINDOW_DAYS * DAY_MS)
  const cohortStart = new Date(
    until.getTime() - (REPEAT_COHORT_WINDOW_DAYS + POLICY.scripts.scale.repeatValue.cohortSpanDays) * DAY_MS,
  )
  try {
    const evidence = await readCustomerGrowthRevenueEvidence(args.supabase, cohortStart, until)
    const ids = [...collectCustomerGrowthAttributionIntakeIds(evidence)]
    const rows: CampaignPurchaseRow[] = []
    for (let index = 0; index < ids.length; index += CHUNK_SIZE) {
      const chunk = ids.slice(index, index + CHUNK_SIZE)
      const read = await filterReportableIntakes(args.supabase.from("intakes")
        .select(`id, patient_id, paid_at, stripe_fee_cents, stripe_balance_transaction_id, stripe_fee_synced_at, ${GOOGLE_ADS_ATTRIBUTION_SELECT}`, { count: "exact" })
        .in("id", chunk).limit(CHUNK_SIZE))
      if (read.error || read.count !== chunk.length || read.data?.length !== chunk.length) throw new Error("repeat_value_rows_incomplete")
      rows.push(...read.data as CampaignPurchaseRow[])
    }
    const campaignIds = new Set(args.campaigns.map((campaign) => campaign.campaignId))
    const cohortRows = rows.filter((row) => {
      const paidAt = Date.parse(row.paid_at ?? "")
      return campaignIds.has(resolveGoogleAdsPurchaseCampaignId(row) ?? "")
        && paidAt >= cohortStart.getTime() && paidAt <= cohortEnd.getTime()
    })
    if (cohortRows.some((row) => !row.patient_id)) throw new Error("repeat_value_identity_unavailable")
    const patientIds = [...new Set(cohortRows.map((row) => row.patient_id!))]
    const history: CohortPurchaseRow[] = []
    for (let index = 0; index < patientIds.length; index += CHUNK_SIZE) {
      const read = await filterReportableIntakes(args.supabase.from("intakes")
        .select("id, patient_id, paid_at, amount_cents, stripe_fee_cents, stripe_balance_transaction_id, stripe_fee_synced_at", { count: "exact" })
        .in("patient_id", patientIds.slice(index, index + CHUNK_SIZE))
        .in("payment_status", [...REVENUE_PURCHASE_PAYMENT_STATUSES])
        .not("paid_at", "is", null).lte("paid_at", until.toISOString()).limit(MAX_HISTORY_ROWS))
      if (read.error || typeof read.count !== "number" || read.count !== read.data?.length) throw new Error("repeat_value_history_incomplete")
      history.push(...read.data as CohortPurchaseRow[])
    }
    for (const campaign of args.campaigns) {
      try {
        result.set(campaign.campaignId, aggregateCampaignRepeatValue({
          campaignId: campaign.campaignId, cohortEnd, cohortRows, cohortStart, evidence, history, until,
        }))
      } catch {
        result.set(campaign.campaignId, null)
      }
    }
    return result
  } catch {
    return result
  }
}
