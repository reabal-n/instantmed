import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import {
  type GoogleAdsConversionActionPreflightResult,
  preflightGoogleAdsPurchaseConversionAction,
  searchGoogleAds,
} from "@/lib/analytics/google-ads-conversion-api"
import {
  type GoogleDataManagerRequestStatusResult,
  isGoogleDataManagerConversionsEnabled,
  retrieveGoogleDataManagerRequestStatus,
} from "@/lib/analytics/google-ads-data-manager-api"
import {
  GOOGLE_ADS_ATTRIBUTION_SELECT,
  GOOGLE_ADS_CONVERSION_UPLOAD_AUDIT_ACTION,
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

export type GoogleAdsCustomerConversionTrackingSettingsRow = {
  customer?: {
    conversionTrackingSetting?: {
      acceptedCustomerDataTerms?: boolean | string | null
      enhancedConversionsForLeadsEnabled?: boolean | string | null
    }
    id?: string | number
  }
}

export type GoogleAdsCustomerConversionTrackingSettingsSummary = {
  acceptedCustomerDataTerms: boolean | null
  customerId: string | null
  enhancedConversionsForLeadsEnabled: boolean | null
}

export type LocalGoogleAdsPurchaseRow = GoogleAdsAttributionRow & {
  amount_cents?: number | null
  payment_status?: string | null
  refund_amount_cents?: number | null
}

export type GoogleAdsOfflineUploadJobSummary = {
  failedCount: number
  jobId: string
  pendingCount: number
  raw: unknown
  successfulCount: number
  totalCount: number
}

export type GoogleAdsOfflineUploadDiagnosticsSummary = {
  alerts: unknown[]
  dailySummaries: unknown[]
  jobSummaries: GoogleAdsOfflineUploadJobSummary[]
  lastUploadDateTime: string | null
  pendingEventCount: number
  status: string | null
  successfulEventCount: number
  totalEventCount: number
}

export type GoogleAdsUploadAuditAnomalySample = {
  at: string | null
  deploymentId: string | null
  errorCode: string | null
  hasUserData: boolean | null
  hasValidIntakeJoin: boolean | null
  intakeJoinCheck: string | null
  requestPath: string | null
  runtimeSource: string | null
  source: string | null
  status: string | null
  uploadApi: string | null
  uploadIdentifier: string | null
  uploadJobId: string | null
  vercelEnv: string | null
}

export type GoogleAdsWatchedUploadAuditSummary = {
  byStatus: Record<string, number>
  deploymentIds: string[]
  expiredClickThroughWindow: number
  failed: number
  jobId: string
  latestAt: string | null
  requestPaths: string[]
  skipped: number
  sources: string[]
  success: number
  totalRows: number
  uploadIdentifier: string
}

export type GoogleAdsUploadAuditReconciliation = {
  byDeploymentId: Record<string, number>
  byIntakeJoinCheck: Record<string, number>
  byJobId: Record<string, number>
  byRequestPath: Record<string, number>
  byRequestId: Record<string, number>
  byRuntimeSource: Record<string, number>
  bySource: Record<string, number>
  byStatus: Record<string, number>
  byUploadIdentifier: Record<string, number>
  byVercelEnv: Record<string, number>
  generatedAt: string
  orphanRows: {
    invalidIntakeJoin: number
    missingIntakeId: number
    samples: GoogleAdsUploadAuditAnomalySample[]
    total: number
  }
  since: string
  totalRows: number
  watchedJob: GoogleAdsWatchedUploadAuditSummary | null
}

export type GoogleAdsEvidenceComparison = {
  externalSurfaces: {
    cronResponses: "external_receipt_required"
    localReceipts: "external_receipt_required"
    vercelLogs: "external_receipt_required"
  }
  googleAdsDiagnostics: {
    foundWatchedJob: boolean | null
    jobSummary: GoogleAdsOfflineUploadJobSummary | null
    lastUploadDateTime: string | null
    status: string | null
  }
  productionAuditLogs: {
    expiredClickThroughWindow: number
    foundWatchedJob: boolean | null
    orphanRows: number
    watchedJobFailed: number | null
    watchedJobRows: number | null
    watchedJobSuccess: number | null
  }
  watchedJobId: string | null
}

type GoogleAdsDiagnosticsClassificationValue =
  | "confirmed"
  | "not_indicated"
  | "possible"
  | "unknown"

export type GoogleAdsDiagnosticsWatchResult = {
  acceptedCount: number | null
  classification: {
    accountSideEnhancedConversionSetup: GoogleAdsDiagnosticsClassificationValue
    attributionDateLag: GoogleAdsDiagnosticsClassificationValue
    consentConfiguration: GoogleAdsDiagnosticsClassificationValue
    conversionActionConfiguration: GoogleAdsDiagnosticsClassificationValue
    expiredClickThroughWindow: GoogleAdsDiagnosticsClassificationValue
    googleProcessingLag: GoogleAdsDiagnosticsClassificationValue
    payloadShape: GoogleAdsDiagnosticsClassificationValue
  }
  dataManagerRequestStatus: string | null
  dataManagerStatusError: string | null
  diagnosticsJobSummary: GoogleAdsOfflineUploadJobSummary | null
  eligibleAt: string
  jobId: string
  matchedCount: number | null
  matchedCountAvailable: false
  pendingCount: number | null
  processingWindowElapsed: boolean
  rejectedCount: number | null
  status:
    | "processing_window_pending"
    | "diagnostics_invisible"
    | "diagnostics_stale_audit_success"
    | "diagnostics_pending"
    | "diagnostics_rejected"
    | "diagnostics_accepted_primary_zero"
    | "diagnostics_accepted"
  uploadedAt: string
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
  customerConversionTrackingSettings: GoogleAdsCustomerConversionTrackingSettingsRow[]
  dataManagerRequestStatus: GoogleDataManagerRequestStatusResult | null
  diagnostics: GoogleAdsOfflineUploadDiagnosticsSummary
  diagnosticsWatch: GoogleAdsDiagnosticsWatchResult | null
  evidenceComparison: GoogleAdsEvidenceComparison
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
  uploadAuditReconciliation: GoogleAdsUploadAuditReconciliation
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

function toBooleanOrNull(value: unknown): boolean | null {
  if (typeof value === "boolean") return value
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase()
    if (normalized === "true") return true
    if (normalized === "false") return false
  }
  return null
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function normalizeJobId(value: unknown): string | null {
  const id = clean(value)
  return id ? id : null
}

function normalizeUploadIdentifier(value: unknown): string | null {
  const id = clean(value)
  return id ? id : null
}

function getAuditUploadIdentifier(metadata: Record<string, unknown> | null | undefined): string | null {
  return normalizeUploadIdentifier(
    metadata?.upload_identifier ?? metadata?.request_id ?? metadata?.upload_job_id ?? metadata?.job_id,
  )
}

function shouldFetchDataManagerRequestStatus(watchJobId?: string | null): boolean {
  const uploadIdentifier = normalizeUploadIdentifier(watchJobId)
  if (!uploadIdentifier) return false

  return isGoogleDataManagerConversionsEnabled() ||
    Boolean(clean(process.env.GOOGLE_ADS_DIAGNOSTICS_WATCH_REQUEST_ID)) ||
    !/^\d+$/.test(uploadIdentifier)
}

function incrementCounter(counter: Record<string, number>, value: unknown): void {
  const key = clean(value) || "missing"
  counter[key] = (counter[key] || 0) + 1
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

export function buildGoogleAdsCustomerConversionTrackingSettingsQuery(): string {
  return [
    "SELECT",
    "customer.id,",
    "customer.conversion_tracking_setting.accepted_customer_data_terms,",
    "customer.conversion_tracking_setting.enhanced_conversions_for_leads_enabled",
    "FROM customer",
  ].join(" ")
}

export function summarizeGoogleAdsOfflineUploadDiagnostics(
  rows: GoogleAdsOfflineUploadDiagnosticsRow[],
): GoogleAdsOfflineUploadDiagnosticsSummary {
  const summary = rows[0]?.offlineConversionUploadConversionActionSummary
  const rawJobSummaries = Array.isArray(summary?.jobSummaries) ? summary.jobSummaries : []

  return {
    alerts: Array.isArray(summary?.alerts) ? summary.alerts : [],
    dailySummaries: Array.isArray(summary?.dailySummaries) ? summary.dailySummaries : [],
    jobSummaries: rawJobSummaries
      .map((raw): GoogleAdsOfflineUploadJobSummary | null => {
        const record = asRecord(raw)
        const jobId = normalizeJobId(record?.jobId ?? record?.job_id)
        if (!jobId) return null
        const successfulCount = toNumber(record?.successfulCount ?? record?.successful_count)
        const failedCount = toNumber(record?.failedCount ?? record?.failed_count)
        const pendingCount = toNumber(record?.pendingCount ?? record?.pending_count)
        const totalCount = toNumber(record?.totalCount ?? record?.total_count) ||
          successfulCount + failedCount + pendingCount

        return {
          failedCount,
          jobId,
          pendingCount,
          raw,
          successfulCount,
          totalCount,
        }
      })
      .filter((row): row is GoogleAdsOfflineUploadJobSummary => row != null),
    lastUploadDateTime: clean(summary?.lastUploadDateTime) || null,
    pendingEventCount: toNumber(summary?.pendingEventCount),
    status: clean(summary?.status) || null,
    successfulEventCount: toNumber(summary?.successfulEventCount),
    totalEventCount: toNumber(summary?.totalEventCount),
  }
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

    const campaignId = clean(row.campaignid) || clean(row.utm_id) || "google_ads_unmapped"
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

export function summarizeGoogleAdsCustomerConversionTrackingSettings(
  rows: GoogleAdsCustomerConversionTrackingSettingsRow[],
): GoogleAdsCustomerConversionTrackingSettingsSummary {
  const row = rows[0]
  const setting = row?.customer?.conversionTrackingSetting

  return {
    acceptedCustomerDataTerms: toBooleanOrNull(setting?.acceptedCustomerDataTerms),
    customerId: clean(row?.customer?.id) || null,
    enhancedConversionsForLeadsEnabled: toBooleanOrNull(setting?.enhancedConversionsForLeadsEnabled),
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

type GoogleAdsRawUploadAuditRow = {
  created_at?: string | null
  intake_id?: string | null
  metadata?: Record<string, unknown> | null
}

function getAuditMetadataString(metadata: Record<string, unknown> | null | undefined, key: string): string | null {
  return clean(metadata?.[key]) || null
}

function getAuditMetadataBoolean(metadata: Record<string, unknown> | null | undefined, key: string): boolean | null {
  const value = metadata?.[key]
  return typeof value === "boolean" ? value : null
}

function summarizeWatchedJobRows(
  rows: GoogleAdsRawUploadAuditRow[],
  watchJobId: string | null | undefined,
): GoogleAdsWatchedUploadAuditSummary | null {
  const uploadIdentifier = normalizeUploadIdentifier(watchJobId)
  if (!uploadIdentifier) return null

  const watchedRows = rows.filter((row) => {
    const metadata = asRecord(row.metadata)
    return getAuditUploadIdentifier(metadata) === uploadIdentifier
  })

  if (watchedRows.length === 0) {
    return {
      byStatus: {},
      deploymentIds: [],
      expiredClickThroughWindow: 0,
      failed: 0,
      jobId: uploadIdentifier,
      latestAt: null,
      requestPaths: [],
      skipped: 0,
      sources: [],
      success: 0,
      totalRows: 0,
      uploadIdentifier,
    }
  }

  const byStatus: Record<string, number> = {}
  const deploymentIds = new Set<string>()
  const requestPaths = new Set<string>()
  const sources = new Set<string>()
  let expiredClickThroughWindow = 0
  let failed = 0
  let skipped = 0
  let success = 0
  let latestAt: string | null = null
  let latestAtMs = -1

  for (const row of watchedRows) {
    const metadata = asRecord(row.metadata)
    const status = getAuditMetadataString(metadata, "status") || "unknown"
    incrementCounter(byStatus, status)
    if (status === "success") success += 1
    else if (status === "failed") failed += 1
    else if (status.startsWith("skipped")) skipped += 1

    const errorCode = getAuditMetadataString(metadata, "error_code")
    if (errorCode?.includes("EXPIRED_EVENT")) expiredClickThroughWindow += 1

    const deploymentId = getAuditMetadataString(metadata, "deployment_id")
    const requestPath = getAuditMetadataString(metadata, "request_path")
    const source = getAuditMetadataString(metadata, "source")
    if (deploymentId) deploymentIds.add(deploymentId)
    if (requestPath) requestPaths.add(requestPath)
    if (source) sources.add(source)

    const atMs = row.created_at ? Date.parse(row.created_at) : 0
    if (atMs > latestAtMs) {
      latestAtMs = atMs
      latestAt = row.created_at ?? null
    }
  }

  return {
    byStatus,
    deploymentIds: Array.from(deploymentIds).sort(),
    expiredClickThroughWindow,
    failed,
    jobId: uploadIdentifier,
    latestAt,
    requestPaths: Array.from(requestPaths).sort(),
    skipped,
    sources: Array.from(sources).sort(),
    success,
    totalRows: watchedRows.length,
    uploadIdentifier,
  }
}

function buildGoogleAdsUploadAuditAnomalySample(
  row: GoogleAdsRawUploadAuditRow,
): GoogleAdsUploadAuditAnomalySample {
  const metadata = asRecord(row.metadata)
  return {
    at: row.created_at ?? null,
    deploymentId: getAuditMetadataString(metadata, "deployment_id"),
    errorCode: getAuditMetadataString(metadata, "error_code"),
    hasUserData: getAuditMetadataBoolean(metadata, "has_user_data"),
    hasValidIntakeJoin: getAuditMetadataBoolean(metadata, "has_valid_intake_join"),
    intakeJoinCheck: getAuditMetadataString(metadata, "intake_join_check"),
    requestPath: getAuditMetadataString(metadata, "request_path"),
    runtimeSource: getAuditMetadataString(metadata, "runtime_source"),
    source: getAuditMetadataString(metadata, "source"),
    status: getAuditMetadataString(metadata, "status"),
    uploadApi: getAuditMetadataString(metadata, "upload_api"),
    uploadIdentifier: getAuditUploadIdentifier(metadata),
    uploadJobId: getAuditMetadataString(metadata, "upload_job_id"),
    vercelEnv: getAuditMetadataString(metadata, "vercel_env"),
  }
}

export async function getGoogleAdsUploadAuditReconciliation({
  generatedAt,
  since,
  supabase,
  watchJobId,
}: {
  generatedAt: string
  since: string
  supabase: SupabaseClient
  watchJobId?: string | null
}): Promise<GoogleAdsUploadAuditReconciliation> {
  const { data, error } = await supabase
    .from("audit_logs")
    .select("created_at, intake_id, metadata")
    .eq("action", GOOGLE_ADS_CONVERSION_UPLOAD_AUDIT_ACTION)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(1000)

  if (error) throw new Error(`Google Ads upload audit reconciliation failed: ${error.message}`)

  // Exclude local-dev / CI runs from the reconciliation the same way the
  // /admin/ops card already does (google-ads-health.ts). A local `pnpm dev`
  // (or CI) runner pointed at the prod service-role key writes
  // `runtime_source: "node"` rows whose intake id belongs to a DIFFERENT
  // database, so they land in prod audit_logs with a NULL `intake_id` column —
  // which getGoogleAdsUploadAuditReconciliation would otherwise count as an
  // `orphanRow`, tripping the critical `google_ads_upload_audit_source_anomaly`
  // business alert (it paged every ~4h for 10+ days off ~822 dev rows before
  // this filter). Real prod uploads run on Vercel (`runtime_source: "vercel"`);
  // legacy rows without the fingerprint are treated as prod. The reconciliation
  // is a PRODUCTION-truth surface — dev noise must never enter it.
  const rows = ((data || []) as GoogleAdsRawUploadAuditRow[]).filter(
    (row) => getAuditMetadataString(asRecord(row.metadata), "runtime_source") !== "node",
  )
  const intakeIds = Array.from(new Set(rows.map((row) => row.intake_id).filter((id): id is string => Boolean(id))))
  const validIntakeIds = new Set<string>()
  if (intakeIds.length > 0) {
    const { data: intakeRows, error: intakeError } = await supabase
      .from("intakes")
      .select("id")
      .in("id", intakeIds)
    if (intakeError) throw new Error(`Google Ads upload audit intake join failed: ${intakeError.message}`)
    for (const row of intakeRows || []) {
      const id = clean((row as { id?: string | null }).id)
      if (id) validIntakeIds.add(id)
    }
  }

  const byDeploymentId: Record<string, number> = {}
  const byIntakeJoinCheck: Record<string, number> = {}
  const byJobId: Record<string, number> = {}
  const byRequestPath: Record<string, number> = {}
  const byRequestId: Record<string, number> = {}
  const byRuntimeSource: Record<string, number> = {}
  const bySource: Record<string, number> = {}
  const byStatus: Record<string, number> = {}
  const byUploadIdentifier: Record<string, number> = {}
  const byVercelEnv: Record<string, number> = {}
  const orphanSamples: GoogleAdsUploadAuditAnomalySample[] = []
  let invalidIntakeJoin = 0
  let missingIntakeId = 0

  for (const row of rows) {
    const metadata = asRecord(row.metadata)
    const status = getAuditMetadataString(metadata, "status") || "unknown"
    const uploadJobId = getAuditMetadataString(metadata, "upload_job_id") || "missing"
    const requestId = getAuditMetadataString(metadata, "request_id") || "missing"
    const uploadIdentifier = getAuditUploadIdentifier(metadata) || "missing"
    const source = getAuditMetadataString(metadata, "source") || "unknown"
    const requestPath = getAuditMetadataString(metadata, "request_path") || "missing"
    const deploymentId = getAuditMetadataString(metadata, "deployment_id") || "missing"
    const runtimeSource = getAuditMetadataString(metadata, "runtime_source") || "missing"
    const vercelEnv = getAuditMetadataString(metadata, "vercel_env") || "missing"
    const metadataJoinCheck = getAuditMetadataString(metadata, "intake_join_check")
    const hasMetadataAnomaly = getAuditMetadataBoolean(metadata, "audit_source_anomaly") === true
    const hasValidJoin = Boolean(row.intake_id && validIntakeIds.has(row.intake_id))
    const joinCheck = metadataJoinCheck || (!row.intake_id ? "missing_intake_id" : hasValidJoin ? "ok" : "join_missing")
    const isOrphan = !row.intake_id || !hasValidJoin || hasMetadataAnomaly

    incrementCounter(byStatus, status)
    incrementCounter(byJobId, uploadJobId)
    incrementCounter(byRequestId, requestId)
    incrementCounter(byUploadIdentifier, uploadIdentifier)
    incrementCounter(bySource, source)
    incrementCounter(byRequestPath, requestPath)
    incrementCounter(byDeploymentId, deploymentId)
    incrementCounter(byRuntimeSource, runtimeSource)
    incrementCounter(byVercelEnv, vercelEnv)
    incrementCounter(byIntakeJoinCheck, joinCheck)

    if (isOrphan) {
      if (!row.intake_id) missingIntakeId += 1
      else invalidIntakeJoin += 1
      if (orphanSamples.length < 10) orphanSamples.push(buildGoogleAdsUploadAuditAnomalySample(row))
    }
  }

  return {
    byDeploymentId,
    byIntakeJoinCheck,
    byJobId,
    byRequestPath,
    byRequestId,
    byRuntimeSource,
    bySource,
    byStatus,
    byUploadIdentifier,
    byVercelEnv,
    generatedAt,
    orphanRows: {
      invalidIntakeJoin,
      missingIntakeId,
      samples: orphanSamples,
      total: invalidIntakeJoin + missingIntakeId,
    },
    since,
    totalRows: rows.length,
    watchedJob: summarizeWatchedJobRows(rows, watchJobId),
  }
}

export function buildGoogleAdsEvidenceComparison({
  auditReconciliation,
  diagnostics,
  watchJobId,
}: {
  auditReconciliation: GoogleAdsUploadAuditReconciliation
  diagnostics: GoogleAdsOfflineUploadDiagnosticsSummary
  watchJobId?: string | null
}): GoogleAdsEvidenceComparison {
  const normalizedJobId = normalizeJobId(watchJobId)
  const diagnosticsJob = normalizedJobId
    ? diagnostics.jobSummaries.find((job) => job.jobId === normalizedJobId) ?? null
    : null

  return {
    externalSurfaces: {
      cronResponses: "external_receipt_required",
      localReceipts: "external_receipt_required",
      vercelLogs: "external_receipt_required",
    },
    googleAdsDiagnostics: {
      foundWatchedJob: normalizedJobId ? Boolean(diagnosticsJob) : null,
      jobSummary: diagnosticsJob,
      lastUploadDateTime: diagnostics.lastUploadDateTime,
      status: diagnostics.status,
    },
    productionAuditLogs: {
      expiredClickThroughWindow: auditReconciliation.watchedJob?.expiredClickThroughWindow ?? 0,
      foundWatchedJob: normalizedJobId ? Boolean(auditReconciliation.watchedJob?.totalRows) : null,
      orphanRows: auditReconciliation.orphanRows.total,
      watchedJobFailed: auditReconciliation.watchedJob?.failed ?? null,
      watchedJobRows: auditReconciliation.watchedJob?.totalRows ?? null,
      watchedJobSuccess: auditReconciliation.watchedJob?.success ?? null,
    },
    watchedJobId: normalizedJobId,
  }
}

function classificationValue(
  condition: boolean,
  fallback: GoogleAdsDiagnosticsClassificationValue = "not_indicated",
): GoogleAdsDiagnosticsClassificationValue {
  return condition ? "confirmed" : fallback
}

function statusFromDataManagerRequestStatus(
  requestStatus: string | null | undefined,
  totalPurchaseConversions: number,
): GoogleAdsDiagnosticsWatchResult["status"] | null {
  if (requestStatus === "SUCCESS") {
    return totalPurchaseConversions > 0
      ? "diagnostics_accepted"
      : "diagnostics_accepted_primary_zero"
  }
  if (requestStatus === "FAILED" || requestStatus === "PARTIAL_SUCCESS") {
    return "diagnostics_rejected"
  }
  if (requestStatus === "PROCESSING" || requestStatus === "REQUEST_STATUS_UNKNOWN") {
    return "diagnostics_pending"
  }
  return null
}

export function buildGoogleAdsDiagnosticsWatchResult({
  now,
  processingWindowHours,
  report,
  uploadedAt,
  watchJobId,
}: {
  now: Date
  processingWindowHours: number
  report: Omit<GoogleAdsSpendAuditReport, "diagnosticsWatch">
  uploadedAt: string
  watchJobId: string
}): GoogleAdsDiagnosticsWatchResult {
  const uploadedAtMs = Date.parse(uploadedAt)
  const normalizedUploadedAt = Number.isFinite(uploadedAtMs)
    ? new Date(uploadedAtMs).toISOString()
    : uploadedAt
  const eligibleAt = Number.isFinite(uploadedAtMs)
    ? new Date(uploadedAtMs + processingWindowHours * 60 * 60 * 1000).toISOString()
    : now.toISOString()
  const processingWindowElapsed = now.getTime() >= Date.parse(eligibleAt)
  const diagnosticsJobSummary =
    report.diagnostics.jobSummaries.find((job) => job.jobId === watchJobId) ?? null
  const dataManagerStatusResult = report.dataManagerRequestStatus ?? null
  const dataManagerRequestStatus = dataManagerStatusResult?.status ?? null
  const dataManagerStatusError = dataManagerStatusResult?.error ?? null
  const customerSettings = summarizeGoogleAdsCustomerConversionTrackingSettings(
    report.customerConversionTrackingSettings,
  )
  const watchedAudit = report.uploadAuditReconciliation.watchedJob
  const hasExpiredClickThroughWindow = Boolean(watchedAudit?.expiredClickThroughWindow)
  const hasNonExpiredFailedAudit = Boolean(
    watchedAudit && watchedAudit.failed > watchedAudit.expiredClickThroughWindow,
  )
  const watchedAuditSucceededWithoutErrors = Boolean(
    report.preflight.ok &&
      watchedAudit &&
      watchedAudit.totalRows > 0 &&
      watchedAudit.success > 0 &&
      watchedAudit.failed === 0 &&
      watchedAudit.skipped === 0 &&
      watchedAudit.expiredClickThroughWindow === 0,
  )
  const accountSetupIncomplete =
    customerSettings.acceptedCustomerDataTerms !== true ||
    customerSettings.enhancedConversionsForLeadsEnabled !== true

  const baseClassification = {
    accountSideEnhancedConversionSetup: classificationValue(accountSetupIncomplete),
    attributionDateLag: "unknown" as GoogleAdsDiagnosticsClassificationValue,
    consentConfiguration: classificationValue(accountSetupIncomplete),
    conversionActionConfiguration: classificationValue(!report.preflight.ok),
    expiredClickThroughWindow: classificationValue(hasExpiredClickThroughWindow),
    googleProcessingLag: "unknown" as GoogleAdsDiagnosticsClassificationValue,
    payloadShape: classificationValue(hasNonExpiredFailedAudit, diagnosticsJobSummary ? "not_indicated" : "unknown"),
  }

  const dataManagerWatchStatus = statusFromDataManagerRequestStatus(
    dataManagerRequestStatus,
    report.ads.summary.totalPurchaseConversions,
  )
  if (dataManagerWatchStatus) {
    return {
      acceptedCount: null,
      classification: {
        ...baseClassification,
        attributionDateLag: dataManagerWatchStatus === "diagnostics_accepted_primary_zero" ? "possible" : "not_indicated",
        googleProcessingLag: dataManagerWatchStatus === "diagnostics_pending" ? "possible" : "not_indicated",
        payloadShape: dataManagerWatchStatus === "diagnostics_rejected" ? "confirmed" : "not_indicated",
      },
      dataManagerRequestStatus,
      dataManagerStatusError,
      diagnosticsJobSummary: null,
      eligibleAt,
      jobId: watchJobId,
      matchedCount: null,
      matchedCountAvailable: false,
      pendingCount: null,
      processingWindowElapsed,
      rejectedCount: null,
      status: dataManagerWatchStatus,
      uploadedAt: normalizedUploadedAt,
    }
  }

  if (!processingWindowElapsed) {
    return {
      acceptedCount: null,
      classification: {
        ...baseClassification,
        attributionDateLag: "possible",
        googleProcessingLag: "possible",
      },
      dataManagerRequestStatus,
      dataManagerStatusError,
      diagnosticsJobSummary: null,
      eligibleAt,
      jobId: watchJobId,
      matchedCount: null,
      matchedCountAvailable: false,
      pendingCount: null,
      processingWindowElapsed: false,
      rejectedCount: null,
      status: "processing_window_pending",
      uploadedAt: normalizedUploadedAt,
    }
  }

  if (!diagnosticsJobSummary) {
    const status = watchedAuditSucceededWithoutErrors
      ? "diagnostics_stale_audit_success"
      : "diagnostics_invisible"

    return {
      acceptedCount: null,
      classification: {
        ...baseClassification,
        attributionDateLag: watchedAuditSucceededWithoutErrors ? "not_indicated" : "possible",
        googleProcessingLag: watchedAuditSucceededWithoutErrors ? "confirmed" : "possible",
        payloadShape: watchedAuditSucceededWithoutErrors ? "not_indicated" : baseClassification.payloadShape,
      },
      dataManagerRequestStatus,
      dataManagerStatusError,
      diagnosticsJobSummary: null,
      eligibleAt,
      jobId: watchJobId,
      matchedCount: null,
      matchedCountAvailable: false,
      pendingCount: null,
      processingWindowElapsed: true,
      rejectedCount: null,
      status,
      uploadedAt: normalizedUploadedAt,
    }
  }

  const acceptedCount = diagnosticsJobSummary.successfulCount
  const pendingCount = diagnosticsJobSummary.pendingCount
  const rejectedCount = diagnosticsJobSummary.failedCount
  const status =
    rejectedCount > 0
      ? "diagnostics_rejected"
      : pendingCount > 0
        ? "diagnostics_pending"
        : acceptedCount > 0 && report.ads.summary.totalPurchaseConversions <= 0
          ? "diagnostics_accepted_primary_zero"
          : "diagnostics_accepted"

  return {
    acceptedCount,
    classification: {
      ...baseClassification,
      attributionDateLag: status === "diagnostics_accepted_primary_zero" ? "possible" : "not_indicated",
      googleProcessingLag: "not_indicated",
    },
    dataManagerRequestStatus,
    dataManagerStatusError,
    diagnosticsJobSummary,
    eligibleAt,
    jobId: watchJobId,
    matchedCount: null,
    matchedCountAvailable: false,
    pendingCount,
    processingWindowElapsed: true,
    rejectedCount,
    status,
    uploadedAt: normalizedUploadedAt,
  }
}

export async function getGoogleAdsSpendAuditReport({
  auditSince,
  days = DEFAULT_REPORT_DAYS,
  diagnosticsProcessingWindowHours = 24,
  now = new Date(),
  supabase,
  watchJobId,
  watchUploadedAt,
}: {
  auditSince?: string
  days?: number
  diagnosticsProcessingWindowHours?: number
  now?: Date
  supabase: SupabaseClient
  watchJobId?: string | null
  watchUploadedAt?: string | null
}): Promise<GoogleAdsSpendAuditReport> {
  const range = resolveGoogleAdsReportRange(days, now)
  const queryErrors: QueryError[] = []
  const generatedAt = now.toISOString()

  const [
    preflight,
    localRows,
    campaignRows,
    searchTerms,
    finalUrls,
    conversionActions,
    customerConversionTrackingSettings,
  ] = await Promise.all([
    preflightGoogleAdsPurchaseConversionAction(),
    getLocalGoogleAdsPurchases(supabase, range),
    runOptionalGoogleAdsQuery<GoogleAdsCampaignRow>("campaign_performance", buildGoogleAdsCampaignPerformanceQuery(range), queryErrors),
    runOptionalGoogleAdsQuery("search_terms", buildGoogleAdsSearchTermQuery(range), queryErrors),
    runOptionalGoogleAdsQuery("final_urls", buildGoogleAdsFinalUrlQuery(range), queryErrors),
    runOptionalGoogleAdsQuery("conversion_actions", buildGoogleAdsConversionActionsQuery(), queryErrors),
    runOptionalGoogleAdsQuery<GoogleAdsCustomerConversionTrackingSettingsRow>(
      "customer_conversion_tracking_settings",
      buildGoogleAdsCustomerConversionTrackingSettingsQuery(),
      queryErrors,
    ),
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
  const diagnostics = summarizeGoogleAdsOfflineUploadDiagnostics(offlineUploadDiagnostics)
  const dataManagerRequestStatus = shouldFetchDataManagerRequestStatus(watchJobId)
    ? await retrieveGoogleDataManagerRequestStatus(watchJobId || "")
    : null
  if (dataManagerRequestStatus?.error) {
    queryErrors.push({
      name: "data_manager_request_status",
      error: compactQueryError(dataManagerRequestStatus.error),
    })
  }
  const uploadAuditReconciliation = await getGoogleAdsUploadAuditReconciliation({
    generatedAt,
    since: auditSince || `${range.startDate}T00:00:00.000Z`,
    supabase,
    watchJobId,
  })
  const evidenceComparison = buildGoogleAdsEvidenceComparison({
    auditReconciliation: uploadAuditReconciliation,
    diagnostics,
    watchJobId,
  })
  const diagnosticsWatch = watchJobId
    ? buildGoogleAdsDiagnosticsWatchResult({
      now,
      processingWindowHours: diagnosticsProcessingWindowHours,
      report: {
        ads,
        conversionActions,
        customerConversionTrackingSettings,
        dataManagerRequestStatus,
        diagnostics,
        evidenceComparison,
        finalUrls,
        generatedAt,
        local: {
          byCampaign: Array.from(local.byCampaign.values()).sort((a, b) => b.grossRevenueAud - a.grossRevenueAud),
          summary: local.summary,
        },
        offlineUploadDiagnostics,
        preflight,
        queryErrors,
        range,
        searchTerms,
        uploadAuditReconciliation,
      },
      uploadedAt: watchUploadedAt || auditSince || `${range.startDate}T00:00:00.000Z`,
      watchJobId,
    })
    : null

  return {
    ads,
    conversionActions,
    customerConversionTrackingSettings,
    dataManagerRequestStatus,
    diagnostics,
    diagnosticsWatch,
    evidenceComparison,
    finalUrls,
    generatedAt,
    local: {
      byCampaign: Array.from(local.byCampaign.values()).sort((a, b) => b.grossRevenueAud - a.grossRevenueAud),
      summary: local.summary,
    },
    offlineUploadDiagnostics,
    preflight,
    queryErrors,
    range,
    searchTerms,
    uploadAuditReconciliation,
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
  const generatedAt = now.toISOString()

  const [preflight, localRows, customerConversionTrackingSettings, uploadAuditReconciliation] = await Promise.all([
    preflightGoogleAdsPurchaseConversionAction(),
    getLocalGoogleAdsPurchases(supabase, range),
    runOptionalGoogleAdsQuery<GoogleAdsCustomerConversionTrackingSettingsRow>(
      "customer_conversion_tracking_settings",
      buildGoogleAdsCustomerConversionTrackingSettingsQuery(),
      queryErrors,
    ),
    getGoogleAdsUploadAuditReconciliation({
      generatedAt,
      since: `${range.startDate}T00:00:00.000Z`,
      supabase,
    }),
  ])
  const local = summarizeLocalGoogleAdsPurchases(localRows)
  const customerSettings = summarizeGoogleAdsCustomerConversionTrackingSettings(customerConversionTrackingSettings)

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
    acceptedCustomerDataTerms: customerSettings.acceptedCustomerDataTerms,
    enhancedConversionsForLeadsEnabled: customerSettings.enhancedConversionsForLeadsEnabled,
    generatedAt,
    localNetRevenueAud: local.summary.netRevenueAud,
    localOrders: local.summary.orders,
    preflightOk: preflight.ok,
    purchaseAllConversions: ads.summary.totalPurchaseAllConversions,
    purchaseAllConversionsValueAud: ads.summary.totalPurchaseAllConversionsValueAud,
    purchaseConversions: ads.summary.totalPurchaseConversions,
    purchaseConversionValueAud: ads.summary.totalPurchaseConversionValueAud,
    queryErrors,
    rangeDays: range.days,
    uploadAuditReconciliation,
  }
}
