import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import {
  type GoogleAdsConversionActionPreflightResult,
  preflightGoogleAdsPurchaseConversionAction,
  searchGoogleAds,
} from "@/lib/analytics/google-ads-conversion-api"
import {
  GOOGLE_ADS_ATTRIBUTION_SELECT,
  type GoogleAdsAttributionRow,
  isLikelyGoogleAttributed,
} from "@/lib/analytics/google-ads-post-payment"
import { filterReportableIntakes } from "@/lib/data/reporting-filters"
import {
  GOOGLE_ADS_PURCHASE_IMPORT_HEALTH_DAYS,
  type GoogleAdsPurchaseImportHealthSnapshot,
} from "@/lib/monitoring/google-ads-purchase-import-health"

const DEFAULT_REPORT_DAYS = 30
const MAX_REPORT_DAYS = 90
const DEFAULT_ROW_LIMIT = 100

export type GoogleAdsReportRange = {
  endDate: string
  startDate: string
}

export type GoogleAdsCampaignRow = {
  campaign?: {
    advertisingChannelType?: string
    id?: string | number
    name?: string
    status?: string
  }
  metrics?: {
    allConversions?: number | string
    allConversionsValue?: number | string
    clicks?: number | string
    conversions?: number | string
    conversionsValue?: number | string
    costMicros?: number | string
    impressions?: number | string
  }
  segments?: {
    adNetworkType?: string
    date?: string
    device?: string
  }
}

export type GoogleAdsPurchaseConversionRow = {
  campaign?: {
    advertisingChannelType?: string
    id?: string | number
    name?: string
    status?: string
  }
  metrics?: {
    allConversions?: number | string
    allConversionsValue?: number | string
    conversions?: number | string
    conversionsValue?: number | string
  }
  segments?: {
    conversionAction?: string
    conversionActionName?: string
    date?: string
  }
}

export type GoogleAdsOfflineUploadDiagnosticsRow = {
  offlineConversionUploadConversionActionSummary?: {
    alerts?: unknown[]
    client?: string
    conversionActionName?: string
    dailySummaries?: unknown[]
    jobSummaries?: unknown[]
    lastUploadDateTime?: string
    pendingEventCount?: number | string
    status?: string
    successfulEventCount?: number | string
    totalEventCount?: number | string
  }
}

export type LocalGoogleAdsPurchaseRow = GoogleAdsAttributionRow & {
  amount_cents?: number | null
  payment_status?: string | null
  refund_amount_cents?: number | null
}

export type LocalGoogleAdsCampaignSummary = {
  campaignId: string
  grossRevenueAud: number
  netRevenueAud: number
  orders: number
  refundedAud: number
  services: Record<string, number>
}

export type GoogleAdsCampaignSummary = {
  allConversions: number
  allConversionsValueAud: number
  avgCpcAud: number | null
  campaignId: string
  campaignName: string
  channel: string | null
  clicks: number
  conversions: number
  conversionValueAud: number
  costPerLocalOrderAud: number | null
  cpaAud: number | null
  devices: string[]
  impressions: number
  localGrossRevenueAud: number
  localNetRevenueAud: number
  localOrders: number
  localRefundedAud: number
  purchaseAllConversions: number
  purchaseAllConversionsValueAud: number
  purchaseConversionActionName: string | null
  purchaseConversionActionResourceName: string | null
  purchaseConversions: number
  purchaseConversionValueAud: number
  purchaseCpaAud: number | null
  purchaseRoas: number | null
  networks: string[]
  roas: number | null
  spendAud: number
  status: string | null
}

export type GoogleAdsSpendSummary = {
  avgCpcAud: number | null
  cpaAud: number | null
  roas: number | null
  totalAllConversions: number
  totalAllConversionsValueAud: number
  totalClicks: number
  totalConversions: number
  totalConversionValueAud: number
  totalImpressions: number
  totalLocalGrossRevenueAud: number
  totalLocalNetRevenueAud: number
  totalLocalOrders: number
  totalPurchaseAllConversions: number
  totalPurchaseAllConversionsValueAud: number
  totalPurchaseConversions: number
  totalPurchaseConversionValueAud: number
  totalSpendAud: number
  purchaseCpaAud: number | null
  purchaseRoas: number | null
}

export type GoogleAdsSpendReport = {
  campaigns: GoogleAdsCampaignSummary[]
  summary: GoogleAdsSpendSummary
}

type GoogleAdsSecondaryRow = Record<string, unknown>

type QueryError = {
  name: string
  error: string
}

export type GoogleAdsSpendAuditReport = {
  ads: GoogleAdsSpendReport
  conversionActions: GoogleAdsSecondaryRow[]
  finalUrls: GoogleAdsSecondaryRow[]
  generatedAt: string
  local: {
    byCampaign: LocalGoogleAdsCampaignSummary[]
    summary: {
      grossRevenueAud: number
      netRevenueAud: number
      orders: number
      refundedAud: number
    }
  }
  offlineUploadDiagnostics: GoogleAdsOfflineUploadDiagnosticsRow[]
  preflight: GoogleAdsConversionActionPreflightResult
  queryErrors: QueryError[]
  range: GoogleAdsReportRange & { days: number }
  searchTerms: GoogleAdsSecondaryRow[]
}

function clean(value: unknown): string {
  if (typeof value === "string") return value.trim()
  if (typeof value === "number" && Number.isFinite(value)) return String(value)
  return ""
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function roundRatio(value: number): number {
  return Math.round((value + Number.EPSILON) * 1000) / 1000
}

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

function microsToAud(value: unknown): number {
  return roundMoney(toNumber(value) / 1_000_000)
}

function centsToAud(value: unknown): number {
  return roundMoney(toNumber(value) / 100)
}

function divideMoney(numerator: number, denominator: number): number | null {
  return denominator > 0 ? roundMoney(numerator / denominator) : null
}

function divideRatio(numerator: number, denominator: number): number | null {
  return denominator > 0 ? roundRatio(numerator / denominator) : null
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function resolveGoogleAdsReportRange(days = DEFAULT_REPORT_DAYS, now = new Date()): GoogleAdsReportRange & { days: number } {
  const normalizedDays = Math.min(Math.max(Math.floor(days) || DEFAULT_REPORT_DAYS, 1), MAX_REPORT_DAYS)
  const end = new Date(now)
  const start = new Date(now)
  start.setUTCDate(start.getUTCDate() - normalizedDays + 1)

  return {
    days: normalizedDays,
    endDate: toDateKey(end),
    startDate: toDateKey(start),
  }
}

export function buildGoogleAdsCampaignPerformanceQuery(range: GoogleAdsReportRange): string {
  return [
    "SELECT",
    "segments.date,",
    "segments.device,",
    "segments.ad_network_type,",
    "campaign.id,",
    "campaign.name,",
    "campaign.status,",
    "campaign.advertising_channel_type,",
    "metrics.impressions,",
    "metrics.clicks,",
    "metrics.cost_micros,",
    "metrics.conversions,",
    "metrics.conversions_value,",
    "metrics.all_conversions,",
    "metrics.all_conversions_value",
    "FROM campaign",
    `WHERE segments.date BETWEEN '${range.startDate}' AND '${range.endDate}'`,
    "ORDER BY metrics.cost_micros DESC",
  ].join(" ")
}

export function buildGoogleAdsPurchaseConversionQuery(
  range: GoogleAdsReportRange,
  conversionActionResourceName: string,
): string {
  const resourceName = conversionActionResourceName.replace(/'/g, "\\'")

  return [
    "SELECT",
    "segments.date,",
    "segments.conversion_action,",
    "segments.conversion_action_name,",
    "campaign.id,",
    "campaign.name,",
    "campaign.status,",
    "campaign.advertising_channel_type,",
    "metrics.conversions,",
    "metrics.conversions_value,",
    "metrics.all_conversions,",
    "metrics.all_conversions_value",
    "FROM campaign",
    `WHERE segments.date BETWEEN '${range.startDate}' AND '${range.endDate}'`,
    `AND segments.conversion_action = '${resourceName}'`,
    "ORDER BY metrics.conversions_value DESC",
  ].join(" ")
}

function normalizeGoogleAdsReportNumericId(value: string): string {
  const resourceId = value.trim().match(/\/(\d+)$/)?.[1]
  const normalized = (resourceId || value).replace(/-/g, "")
  if (!/^\d+$/.test(normalized)) {
    throw new Error("Google Ads conversion action id must be numeric")
  }
  return normalized
}

export function buildGoogleAdsOfflineConversionActionSummaryQuery(conversionActionId: string): string {
  const normalizedConversionActionId = normalizeGoogleAdsReportNumericId(conversionActionId)

  return [
    "SELECT",
    "offline_conversion_upload_conversion_action_summary.conversion_action_name,",
    "offline_conversion_upload_conversion_action_summary.alerts,",
    "offline_conversion_upload_conversion_action_summary.client,",
    "offline_conversion_upload_conversion_action_summary.daily_summaries,",
    "offline_conversion_upload_conversion_action_summary.job_summaries,",
    "offline_conversion_upload_conversion_action_summary.last_upload_date_time,",
    "offline_conversion_upload_conversion_action_summary.pending_event_count,",
    "offline_conversion_upload_conversion_action_summary.status,",
    "offline_conversion_upload_conversion_action_summary.successful_event_count,",
    "offline_conversion_upload_conversion_action_summary.total_event_count",
    "FROM offline_conversion_upload_conversion_action_summary",
    `WHERE offline_conversion_upload_conversion_action_summary.conversion_action_id = ${normalizedConversionActionId}`,
  ].join(" ")
}

export function buildGoogleAdsSearchTermQuery(range: GoogleAdsReportRange, limit = DEFAULT_ROW_LIMIT): string {
  return [
    "SELECT",
    "search_term_view.search_term,",
    "search_term_view.status,",
    "segments.keyword.info.match_type,",
    "segments.device,",
    "campaign.id,",
    "campaign.name,",
    "ad_group.id,",
    "ad_group.name,",
    "metrics.impressions,",
    "metrics.clicks,",
    "metrics.cost_micros,",
    "metrics.conversions,",
    "metrics.conversions_value",
    "FROM search_term_view",
    `WHERE segments.date BETWEEN '${range.startDate}' AND '${range.endDate}'`,
    "ORDER BY metrics.cost_micros DESC",
    `LIMIT ${Math.min(Math.max(Math.floor(limit) || DEFAULT_ROW_LIMIT, 1), 500)}`,
  ].join(" ")
}

export function buildGoogleAdsFinalUrlQuery(range: GoogleAdsReportRange, limit = DEFAULT_ROW_LIMIT): string {
  return [
    "SELECT",
    "segments.date,",
    "campaign.id,",
    "campaign.name,",
    "ad_group.id,",
    "ad_group.name,",
    "ad_group_ad.ad.id,",
    "ad_group_ad.ad.final_urls,",
    "ad_group_ad.status,",
    "ad_group_ad.policy_summary.approval_status,",
    "metrics.impressions,",
    "metrics.clicks,",
    "metrics.cost_micros,",
    "metrics.conversions,",
    "metrics.conversions_value",
    "FROM ad_group_ad",
    `WHERE segments.date BETWEEN '${range.startDate}' AND '${range.endDate}'`,
    "AND ad_group_ad.status != 'REMOVED'",
    "ORDER BY metrics.cost_micros DESC",
    `LIMIT ${Math.min(Math.max(Math.floor(limit) || DEFAULT_ROW_LIMIT, 1), 500)}`,
  ].join(" ")
}

export function buildGoogleAdsConversionActionsQuery(): string {
  return [
    "SELECT",
    "conversion_action.id,",
    "conversion_action.name,",
    "conversion_action.status,",
    "conversion_action.type,",
    "conversion_action.category,",
    "conversion_action.counting_type,",
    "conversion_action.primary_for_goal,",
    "conversion_action.include_in_conversions_metric",
    "FROM conversion_action",
    "WHERE conversion_action.status != 'REMOVED'",
    "ORDER BY conversion_action.name",
  ].join(" ")
}

function addToken(set: Set<string>, value: unknown): void {
  const token = clean(value)
  if (token) set.add(token)
}

export function summarizeLocalGoogleAdsPurchases(rows: LocalGoogleAdsPurchaseRow[]): {
  byCampaign: Map<string, LocalGoogleAdsCampaignSummary>
  summary: GoogleAdsSpendAuditReport["local"]["summary"]
} {
  const byCampaign = new Map<string, LocalGoogleAdsCampaignSummary>()
  let grossRevenueAud = 0
  let netRevenueAud = 0
  let orders = 0
  let refundedAud = 0

  for (const row of rows) {
    if (!isLikelyGoogleAttributed(row)) continue

    const campaignId = clean(row.campaignid) || clean(row.utm_id) || "missing_campaign"
    const gross = centsToAud(row.amount_cents)
    const refunded = centsToAud(row.refund_amount_cents)
    const net = roundMoney(gross - refunded)
    const service = [clean(row.category), clean(row.subtype)].filter(Boolean).join(":") || "unknown"
    const current = byCampaign.get(campaignId) || {
      campaignId,
      grossRevenueAud: 0,
      netRevenueAud: 0,
      orders: 0,
      refundedAud: 0,
      services: {},
    }

    current.orders += 1
    current.grossRevenueAud = roundMoney(current.grossRevenueAud + gross)
    current.refundedAud = roundMoney(current.refundedAud + refunded)
    current.netRevenueAud = roundMoney(current.netRevenueAud + net)
    current.services[service] = (current.services[service] || 0) + 1
    byCampaign.set(campaignId, current)

    orders += 1
    grossRevenueAud = roundMoney(grossRevenueAud + gross)
    refundedAud = roundMoney(refundedAud + refunded)
    netRevenueAud = roundMoney(netRevenueAud + net)
  }

  return {
    byCampaign,
    summary: {
      grossRevenueAud,
      netRevenueAud,
      orders,
      refundedAud,
    },
  }
}

export function summarizeGoogleAdsCampaignRows(
  rows: GoogleAdsCampaignRow[],
  localByCampaign = new Map<string, LocalGoogleAdsCampaignSummary>(),
  purchaseRows: GoogleAdsPurchaseConversionRow[] = [],
): GoogleAdsSpendReport {
  const campaignMap = new Map<string, GoogleAdsCampaignSummary & { deviceSet: Set<string>; networkSet: Set<string> }>()

  for (const row of rows) {
    const campaignId = clean(row.campaign?.id) || "unknown_campaign"
    const current = campaignMap.get(campaignId) || {
      allConversions: 0,
      allConversionsValueAud: 0,
      avgCpcAud: null,
      campaignId,
      campaignName: clean(row.campaign?.name) || campaignId,
      channel: clean(row.campaign?.advertisingChannelType) || null,
      clicks: 0,
      conversions: 0,
      conversionValueAud: 0,
      costPerLocalOrderAud: null,
      cpaAud: null,
      deviceSet: new Set<string>(),
      devices: [],
      impressions: 0,
      localGrossRevenueAud: 0,
      localNetRevenueAud: 0,
      localOrders: 0,
      localRefundedAud: 0,
      purchaseAllConversions: 0,
      purchaseAllConversionsValueAud: 0,
      purchaseConversionActionName: null,
      purchaseConversionActionResourceName: null,
      purchaseConversions: 0,
      purchaseConversionValueAud: 0,
      purchaseCpaAud: null,
      purchaseRoas: null,
      networkSet: new Set<string>(),
      networks: [],
      roas: null,
      spendAud: 0,
      status: clean(row.campaign?.status) || null,
    }

    current.impressions += toNumber(row.metrics?.impressions)
    current.clicks += toNumber(row.metrics?.clicks)
    current.spendAud = roundMoney(current.spendAud + microsToAud(row.metrics?.costMicros))
    current.conversions += toNumber(row.metrics?.conversions)
    current.conversionValueAud = roundMoney(current.conversionValueAud + toNumber(row.metrics?.conversionsValue))
    current.allConversions += toNumber(row.metrics?.allConversions)
    current.allConversionsValueAud = roundMoney(current.allConversionsValueAud + toNumber(row.metrics?.allConversionsValue))
    addToken(current.deviceSet, row.segments?.device)
    addToken(current.networkSet, row.segments?.adNetworkType)
    campaignMap.set(campaignId, current)
  }

  for (const [campaignId, local] of localByCampaign.entries()) {
    const current = campaignMap.get(campaignId) || {
      allConversions: 0,
      allConversionsValueAud: 0,
      avgCpcAud: null,
      campaignId,
      campaignName: campaignId,
      channel: null,
      clicks: 0,
      conversions: 0,
      conversionValueAud: 0,
      costPerLocalOrderAud: null,
      cpaAud: null,
      deviceSet: new Set<string>(),
      devices: [],
      impressions: 0,
      localGrossRevenueAud: 0,
      localNetRevenueAud: 0,
      localOrders: 0,
      localRefundedAud: 0,
      purchaseAllConversions: 0,
      purchaseAllConversionsValueAud: 0,
      purchaseConversionActionName: null,
      purchaseConversionActionResourceName: null,
      purchaseConversions: 0,
      purchaseConversionValueAud: 0,
      purchaseCpaAud: null,
      purchaseRoas: null,
      networkSet: new Set<string>(),
      networks: [],
      roas: null,
      spendAud: 0,
      status: null,
    }

    current.localOrders = local.orders
    current.localGrossRevenueAud = local.grossRevenueAud
    current.localNetRevenueAud = local.netRevenueAud
    current.localRefundedAud = local.refundedAud
    campaignMap.set(campaignId, current)
  }

  for (const row of purchaseRows) {
    const campaignId = clean(row.campaign?.id) || "unknown_campaign"
    const current = campaignMap.get(campaignId) || {
      allConversions: 0,
      allConversionsValueAud: 0,
      avgCpcAud: null,
      campaignId,
      campaignName: clean(row.campaign?.name) || campaignId,
      channel: clean(row.campaign?.advertisingChannelType) || null,
      clicks: 0,
      conversions: 0,
      conversionValueAud: 0,
      costPerLocalOrderAud: null,
      cpaAud: null,
      deviceSet: new Set<string>(),
      devices: [],
      impressions: 0,
      localGrossRevenueAud: 0,
      localNetRevenueAud: 0,
      localOrders: 0,
      localRefundedAud: 0,
      purchaseAllConversions: 0,
      purchaseAllConversionsValueAud: 0,
      purchaseConversionActionName: null,
      purchaseConversionActionResourceName: null,
      purchaseConversions: 0,
      purchaseConversionValueAud: 0,
      purchaseCpaAud: null,
      purchaseRoas: null,
      networkSet: new Set<string>(),
      networks: [],
      roas: null,
      spendAud: 0,
      status: clean(row.campaign?.status) || null,
    }

    current.purchaseConversions += toNumber(row.metrics?.conversions)
    current.purchaseConversionValueAud = roundMoney(
      current.purchaseConversionValueAud + toNumber(row.metrics?.conversionsValue),
    )
    current.purchaseAllConversions += toNumber(row.metrics?.allConversions)
    current.purchaseAllConversionsValueAud = roundMoney(
      current.purchaseAllConversionsValueAud + toNumber(row.metrics?.allConversionsValue),
    )
    current.purchaseConversionActionResourceName ||= clean(row.segments?.conversionAction) || null
    current.purchaseConversionActionName ||= clean(row.segments?.conversionActionName) || null
    campaignMap.set(campaignId, current)
  }

  const campaigns = Array.from(campaignMap.values()).map((campaign) => {
    const devices = Array.from(campaign.deviceSet).sort()
    const networks = Array.from(campaign.networkSet).sort()

    return {
      ...campaign,
      avgCpcAud: divideMoney(campaign.spendAud, campaign.clicks),
      costPerLocalOrderAud: divideMoney(campaign.spendAud, campaign.localOrders),
      cpaAud: divideMoney(campaign.spendAud, campaign.conversions),
      purchaseCpaAud: divideMoney(campaign.spendAud, campaign.purchaseConversions),
      purchaseRoas: divideRatio(campaign.purchaseConversionValueAud, campaign.spendAud),
      devices,
      networks,
      roas: divideRatio(campaign.conversionValueAud, campaign.spendAud),
      deviceSet: undefined,
      networkSet: undefined,
    }
  }).map(({ deviceSet: _deviceSet, networkSet: _networkSet, ...campaign }) => campaign)
    .sort((a, b) => b.spendAud - a.spendAud)

  const summary = campaigns.reduce<GoogleAdsSpendSummary>((acc, campaign) => {
    acc.totalAllConversions += campaign.allConversions
    acc.totalAllConversionsValueAud = roundMoney(acc.totalAllConversionsValueAud + campaign.allConversionsValueAud)
    acc.totalClicks += campaign.clicks
    acc.totalConversions += campaign.conversions
    acc.totalConversionValueAud = roundMoney(acc.totalConversionValueAud + campaign.conversionValueAud)
    acc.totalImpressions += campaign.impressions
    acc.totalLocalGrossRevenueAud = roundMoney(acc.totalLocalGrossRevenueAud + campaign.localGrossRevenueAud)
    acc.totalLocalNetRevenueAud = roundMoney(acc.totalLocalNetRevenueAud + campaign.localNetRevenueAud)
    acc.totalLocalOrders += campaign.localOrders
    acc.totalPurchaseAllConversions += campaign.purchaseAllConversions
    acc.totalPurchaseAllConversionsValueAud = roundMoney(acc.totalPurchaseAllConversionsValueAud + campaign.purchaseAllConversionsValueAud)
    acc.totalPurchaseConversions += campaign.purchaseConversions
    acc.totalPurchaseConversionValueAud = roundMoney(acc.totalPurchaseConversionValueAud + campaign.purchaseConversionValueAud)
    acc.totalSpendAud = roundMoney(acc.totalSpendAud + campaign.spendAud)
    return acc
  }, {
    avgCpcAud: null,
    cpaAud: null,
    roas: null,
    totalAllConversions: 0,
    totalAllConversionsValueAud: 0,
    totalClicks: 0,
    totalConversions: 0,
    totalConversionValueAud: 0,
    totalImpressions: 0,
    totalLocalGrossRevenueAud: 0,
    totalLocalNetRevenueAud: 0,
    totalLocalOrders: 0,
    totalPurchaseAllConversions: 0,
    totalPurchaseAllConversionsValueAud: 0,
    totalPurchaseConversions: 0,
    totalPurchaseConversionValueAud: 0,
    totalSpendAud: 0,
    purchaseCpaAud: null,
    purchaseRoas: null,
  })

  summary.avgCpcAud = divideMoney(summary.totalSpendAud, summary.totalClicks)
  summary.cpaAud = divideMoney(summary.totalSpendAud, summary.totalConversions)
  summary.roas = divideRatio(summary.totalConversionValueAud, summary.totalSpendAud)
  summary.purchaseCpaAud = divideMoney(summary.totalSpendAud, summary.totalPurchaseConversions)
  summary.purchaseRoas = divideRatio(summary.totalPurchaseConversionValueAud, summary.totalSpendAud)

  return { campaigns, summary }
}

function compactQueryError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  return message.replace(/\s+/g, " ").slice(0, 160)
}

async function runOptionalGoogleAdsQuery<T extends GoogleAdsSecondaryRow>(
  name: string,
  query: string,
  errors: QueryError[],
): Promise<T[]> {
  try {
    return await searchGoogleAds<T>(query)
  } catch (error) {
    errors.push({ name, error: compactQueryError(error) })
    return []
  }
}

async function getLocalGoogleAdsPurchases(
  supabase: SupabaseClient,
  range: GoogleAdsReportRange,
): Promise<LocalGoogleAdsPurchaseRow[]> {
  const { data, error } = await filterReportableIntakes(
    supabase
      .from("intakes")
      .select(`payment_status, refund_amount_cents, paid_at, ${GOOGLE_ADS_ATTRIBUTION_SELECT}`)
      .in("payment_status", ["paid", "partially_refunded", "refunded"])
      .not("paid_at", "is", null)
      .gte("paid_at", `${range.startDate}T00:00:00.000Z`)
      .lte("paid_at", `${range.endDate}T23:59:59.999Z`),
  )

  if (error) throw new Error(`Local Google Ads purchase query failed: ${error.message}`)
  return (data || []) as LocalGoogleAdsPurchaseRow[]
}

export async function getGoogleAdsSpendAuditReport({
  days = DEFAULT_REPORT_DAYS,
  now = new Date(),
  supabase,
}: {
  days?: number
  now?: Date
  supabase: SupabaseClient
}): Promise<GoogleAdsSpendAuditReport> {
  const range = resolveGoogleAdsReportRange(days, now)
  const queryErrors: QueryError[] = []

  const [preflight, localRows, campaignRows, searchTerms, finalUrls, conversionActions] = await Promise.all([
    preflightGoogleAdsPurchaseConversionAction(),
    getLocalGoogleAdsPurchases(supabase, range),
    runOptionalGoogleAdsQuery<GoogleAdsCampaignRow>("campaign_performance", buildGoogleAdsCampaignPerformanceQuery(range), queryErrors),
    runOptionalGoogleAdsQuery("search_terms", buildGoogleAdsSearchTermQuery(range), queryErrors),
    runOptionalGoogleAdsQuery("final_urls", buildGoogleAdsFinalUrlQuery(range), queryErrors),
    runOptionalGoogleAdsQuery("conversion_actions", buildGoogleAdsConversionActionsQuery(), queryErrors),
  ])

  const purchaseConversionActionResourceName = preflight.conversionAction?.resourceName || null
  const purchaseConversionRows = purchaseConversionActionResourceName
    ? await runOptionalGoogleAdsQuery<GoogleAdsPurchaseConversionRow>(
      "purchase_conversion_performance",
      buildGoogleAdsPurchaseConversionQuery(range, purchaseConversionActionResourceName),
      queryErrors,
    )
    : []
  const offlineUploadDiagnostics = preflight.conversionAction?.id
    ? await runOptionalGoogleAdsQuery<GoogleAdsOfflineUploadDiagnosticsRow>(
      "offline_upload_diagnostics",
      buildGoogleAdsOfflineConversionActionSummaryQuery(preflight.conversionAction.id),
      queryErrors,
    )
    : []
  const local = summarizeLocalGoogleAdsPurchases(localRows)
  const ads = summarizeGoogleAdsCampaignRows(campaignRows, local.byCampaign, purchaseConversionRows)

  return {
    ads,
    conversionActions,
    finalUrls,
    generatedAt: now.toISOString(),
    local: {
      byCampaign: Array.from(local.byCampaign.values()).sort((a, b) => b.grossRevenueAud - a.grossRevenueAud),
      summary: local.summary,
    },
    offlineUploadDiagnostics,
    preflight,
    queryErrors,
    range,
    searchTerms,
  }
}

export async function getGoogleAdsPurchaseImportHealth({
  days = GOOGLE_ADS_PURCHASE_IMPORT_HEALTH_DAYS,
  now = new Date(),
  supabase,
}: {
  days?: number
  now?: Date
  supabase: SupabaseClient
}): Promise<GoogleAdsPurchaseImportHealthSnapshot> {
  const range = resolveGoogleAdsReportRange(days, now)
  const queryErrors: QueryError[] = []

  const [preflight, localRows] = await Promise.all([
    preflightGoogleAdsPurchaseConversionAction(),
    getLocalGoogleAdsPurchases(supabase, range),
  ])
  const local = summarizeLocalGoogleAdsPurchases(localRows)

  const purchaseConversionActionResourceName = preflight.conversionAction?.resourceName || null
  const purchaseConversionRows = purchaseConversionActionResourceName
    ? await runOptionalGoogleAdsQuery<GoogleAdsPurchaseConversionRow>(
      "purchase_conversion_performance",
      buildGoogleAdsPurchaseConversionQuery(range, purchaseConversionActionResourceName),
      queryErrors,
    )
    : []
  const ads = summarizeGoogleAdsCampaignRows([], new Map(), purchaseConversionRows)

  return {
    generatedAt: now.toISOString(),
    localNetRevenueAud: local.summary.netRevenueAud,
    localOrders: local.summary.orders,
    preflightOk: preflight.ok,
    purchaseAllConversions: ads.summary.totalPurchaseAllConversions,
    purchaseAllConversionsValueAud: ads.summary.totalPurchaseAllConversionsValueAud,
    purchaseConversions: ads.summary.totalPurchaseConversions,
    purchaseConversionValueAud: ads.summary.totalPurchaseConversionValueAud,
    queryErrors,
    rangeDays: range.days,
  }
}
