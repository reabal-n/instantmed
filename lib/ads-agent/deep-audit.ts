import "server-only"

import {
  getAdsAccountState,
  type GoogleAdsAccountState,
} from "@/lib/ads-agent/account-state"
import {
  containsProhibitedPaidMedicineTerm,
} from "@/lib/ads-agent/policy"
import {
  resolveSydneyClosedDay,
  resolveSydneyDateWindow,
  type SydneyDateWindow,
} from "@/lib/ads-agent/time"
import { searchGoogleAds } from "@/lib/google-ads/client"

const AUSTRALIA_COUNTRY_CRITERION_ID = "2036"
const DEFAULT_AUDIT_DAYS = 30
const MAX_AUDIT_DAYS = 90
const SEARCH_TERM_REVIEW_SPEND_CENTS = 1_000
const MAX_DETAIL_ROWS = 30

export type GoogleAdsDeepAuditQueryName =
  | "campaignPerformance"
  | "searchTerms"
  | "keywords"
  | "responsiveSearchAds"
  | "rsaAssets"
  | "campaignAssets"
  | "devices"
  | "dayparts"
  | "userLocations"

export type GoogleAdsDeepAuditRows = Record<
  GoogleAdsDeepAuditQueryName,
  Record<string, unknown>[]
>

export interface GoogleAdsDeepAuditMetric {
  clicks: number
  conversionValueCents: number
  conversions: number
  costCents: number
  costPerConversionCents: number | null
  ctr: number | null
  impressions: number
  valueCostRatio: number | null
}

export interface GoogleAdsDeepAuditSearchTerm extends GoogleAdsDeepAuditMetric {
  adGroupId: string | null
  adGroupName: string | null
  campaignId: string | null
  campaignName: string | null
  campaignStatus: string | null
  firstSeenDate: string | null
  lastSeenDate: string | null
  matchedKeyword: string | null
  matchType: string | null
  possiblePersonalDataSuppressed: boolean
  searchTerm: string
  targetingStatus: string | null
}

export interface GoogleAdsDeepAuditKeyword extends GoogleAdsDeepAuditMetric {
  adGroupId: string | null
  adGroupName: string | null
  adGroupStatus: string | null
  campaignId: string | null
  campaignName: string | null
  campaignStatus: string | null
  creativeQuality: string | null
  keyword: string
  landingPageQuality: string | null
  matchType: string | null
  primaryStatus: string | null
  primaryStatusReasons: string[]
  qualityScore: number | null
  resourceName: string | null
  searchPredictedCtr: string | null
  status: string | null
}

export interface GoogleAdsDeepAuditCampaign extends GoogleAdsDeepAuditMetric {
  biddingStrategyType: string | null
  budgetAmountCents: number | null
  campaignId: string | null
  campaignName: string | null
  campaignResourceName: string | null
  searchBudgetLostImpressionShare: number | null
  searchImpressionShare: number | null
  searchRankLostImpressionShare: number | null
  status: string | null
}

export interface GoogleAdsDeepAuditAd extends GoogleAdsDeepAuditMetric {
  adGroupId: string | null
  adGroupName: string | null
  adGroupStatus: string | null
  adId: string | null
  approvalStatus: string | null
  campaignId: string | null
  campaignName: string | null
  campaignStatus: string | null
  finalUrls: string[]
  resourceName: string | null
  strength: string | null
  status: string | null
}

export interface GoogleAdsDeepAuditAsset extends GoogleAdsDeepAuditMetric {
  adGroupAdResourceName: string | null
  assetResourceName: string | null
  campaignId: string | null
  campaignName: string | null
  enabled: boolean | null
  fieldType: string | null
  level: "campaign" | "responsive_search_ad"
  performanceLabel: string | null
  pinnedField: string | null
  source: string | null
  status: string | null
}

export interface GoogleAdsDeepAuditBreakdown extends GoogleAdsDeepAuditMetric {
  campaignId: string | null
  campaignName: string | null
  campaignStatus: string | null
  dimension: string
}

export interface GoogleAdsDeepAuditSignal {
  campaignId: string | null
  code:
    | "BROAD_POSITIVE_KEYWORD"
    | "CONVERTED_UNTARGETED_QUERY"
    | "DISAPPROVED_RSA"
    | "LOW_QUALITY_COMPONENT"
    | "LOW_RSA_ASSET"
    | "NO_CAMPAIGN_IMAGE_ASSET"
    | "NO_ENABLED_RSA"
    | "NO_STRUCTURED_SNIPPET"
    | "OUTSIDE_AUSTRALIA_SPEND"
    | "PAID_MEDICINE_KEYWORD"
    | "PAID_MEDICINE_QUERY"
    | "POOR_RSA_STRENGTH"
    | "SEARCH_BUDGET_HEADROOM"
    | "SEARCH_RANK_HEADROOM"
    | "UNCONVERTED_SEARCH_SPEND"
  evidence: string
  level: "action_review" | "investigate" | "opportunity"
  resourceName: string | null
}

export interface GoogleAdsDeepAuditReport {
  account: {
    activeManagerLinks: number
    activeUsers: number
    changeEventLookbackDays: 14
    currencyCode: string | null
    customerId: string | null
    enabledAdGroups: number
    enabledSearchCampaigns: number
    enabledSearchRsas: number
    passkeyEnabledUsers: number
    recentChangeEvents: number
    timeZone: string | null
    usersWithoutPasskeys: number
  }
  assets: {
    campaign: GoogleAdsDeepAuditAsset[]
    responsiveSearchAds: GoogleAdsDeepAuditAsset[]
  }
  breakdowns: {
    dayparts: GoogleAdsDeepAuditBreakdown[]
    devices: GoogleAdsDeepAuditBreakdown[]
    userLocations: GoogleAdsDeepAuditBreakdown[]
  }
  campaigns: GoogleAdsDeepAuditCampaign[]
  completeness: {
    accountState: boolean
    accountStateError: string | null
    failedQueries: Array<{ error: string; name: GoogleAdsDeepAuditQueryName }>
    successfulQueries: GoogleAdsDeepAuditQueryName[]
  }
  generatedAt: string
  keywords: {
    broadPositive: GoogleAdsDeepAuditKeyword[]
    medicineTerms: GoogleAdsDeepAuditKeyword[]
    qualityDiagnostics: GoogleAdsDeepAuditKeyword[]
    spendLeaders: GoogleAdsDeepAuditKeyword[]
  }
  privacy: {
    possiblePersonalQueriesSuppressed: number
    rawSearchTermsPersisted: false
    searchTermDetailScope: "authorised_codex_task_only"
    telegramSafe: false
  }
  responsiveSearchAds: GoogleAdsDeepAuditAd[]
  searchTerms: {
    convertedUntargeted: GoogleAdsDeepAuditSearchTerm[]
    medicineTerms: GoogleAdsDeepAuditSearchTerm[]
    spendWithoutConversion: GoogleAdsDeepAuditSearchTerm[]
    topConverted: GoogleAdsDeepAuditSearchTerm[]
  }
  signals: GoogleAdsDeepAuditSignal[]
  window: SydneyDateWindow & { days: number }
}

interface DeepAuditDependencies {
  getAccountState(args?: { now?: Date }): Promise<GoogleAdsAccountState>
  search(query: string): Promise<Record<string, unknown>[]>
}

interface AnalysisInput {
  accountState: GoogleAdsAccountState | null
  accountStateAvailable: boolean
  accountStateError?: string | null
  failedQueries: GoogleAdsDeepAuditReport["completeness"]["failedQueries"]
  generatedAt: string
  rows: GoogleAdsDeepAuditRows
  successfulQueries: GoogleAdsDeepAuditQueryName[]
  window: SydneyDateWindow & { days: number }
}

function gaql(args: {
  fields: string[]
  from: string
  suffix: string[]
}): string {
  return [
    "SELECT",
    args.fields.join(", "),
    `FROM ${args.from}`,
    ...args.suffix,
  ].join(" ")
}

function dateRange(window: Pick<SydneyDateWindow, "endDate" | "startDate">): string {
  return `segments.date BETWEEN '${window.startDate}' AND '${window.endDate}'`
}

/**
 * Builds the complete read-only GAQL surface for the weekly operating audit.
 * Search-term rows are never returned to the daily cron or persisted run.
 */
export function buildGoogleAdsDeepAuditQueries(
  window: Pick<SydneyDateWindow, "endDate" | "startDate">,
): Record<GoogleAdsDeepAuditQueryName, string> {
  const searchOnly = "campaign.advertising_channel_type = 'SEARCH'"
  const activeCampaign = "campaign.status != 'REMOVED'"

  return {
    campaignPerformance: gaql({
      fields: [
        "campaign.id",
        "campaign.resource_name",
        "campaign.name",
        "campaign.status",
        "campaign.bidding_strategy_type",
        "campaign_budget.amount_micros",
        "metrics.impressions",
        "metrics.clicks",
        "metrics.cost_micros",
        "metrics.conversions",
        "metrics.conversions_value",
        "metrics.search_impression_share",
        "metrics.search_budget_lost_impression_share",
        "metrics.search_rank_lost_impression_share",
      ],
      from: "campaign",
      suffix: [
        `WHERE ${dateRange(window)}`,
        `AND ${searchOnly}`,
        `AND ${activeCampaign}`,
        "ORDER BY metrics.cost_micros DESC",
      ],
    }),
    searchTerms: gaql({
      fields: [
        "search_term_view.search_term",
        "search_term_view.status",
        "segments.date",
        "segments.keyword.info.text",
        "segments.keyword.info.match_type",
        "campaign.id",
        "campaign.name",
        "campaign.status",
        "ad_group.id",
        "ad_group.name",
        "metrics.impressions",
        "metrics.clicks",
        "metrics.cost_micros",
        "metrics.conversions",
        "metrics.conversions_value",
      ],
      from: "search_term_view",
      suffix: [
        `WHERE ${dateRange(window)}`,
        `AND ${searchOnly}`,
        `AND ${activeCampaign}`,
        "ORDER BY metrics.cost_micros DESC",
        "LIMIT 5000",
      ],
    }),
    keywords: gaql({
      fields: [
        "campaign.id",
        "campaign.name",
        "campaign.status",
        "ad_group.id",
        "ad_group.name",
        "ad_group.status",
        "ad_group_criterion.resource_name",
        "ad_group_criterion.status",
        "ad_group_criterion.primary_status",
        "ad_group_criterion.primary_status_reasons",
        "ad_group_criterion.keyword.text",
        "ad_group_criterion.keyword.match_type",
        "ad_group_criterion.quality_info.quality_score",
        "ad_group_criterion.quality_info.creative_quality_score",
        "ad_group_criterion.quality_info.post_click_quality_score",
        "ad_group_criterion.quality_info.search_predicted_ctr",
        "metrics.impressions",
        "metrics.clicks",
        "metrics.cost_micros",
        "metrics.conversions",
        "metrics.conversions_value",
      ],
      from: "keyword_view",
      suffix: [
        `WHERE ${dateRange(window)}`,
        `AND ${searchOnly}`,
        `AND ${activeCampaign}`,
        "AND ad_group_criterion.status != 'REMOVED'",
        "AND ad_group_criterion.negative = FALSE",
        "ORDER BY metrics.cost_micros DESC",
      ],
    }),
    responsiveSearchAds: gaql({
      fields: [
        "campaign.id",
        "campaign.name",
        "campaign.status",
        "ad_group.id",
        "ad_group.name",
        "ad_group.status",
        "ad_group_ad.resource_name",
        "ad_group_ad.status",
        "ad_group_ad.ad_strength",
        "ad_group_ad.policy_summary.approval_status",
        "ad_group_ad.ad.id",
        "ad_group_ad.ad.final_urls",
        "metrics.impressions",
        "metrics.clicks",
        "metrics.cost_micros",
        "metrics.conversions",
        "metrics.conversions_value",
      ],
      from: "ad_group_ad",
      suffix: [
        `WHERE ${dateRange(window)}`,
        `AND ${searchOnly}`,
        `AND ${activeCampaign}`,
        "AND ad_group_ad.status != 'REMOVED'",
        "AND ad_group_ad.ad.type = 'RESPONSIVE_SEARCH_AD'",
        "ORDER BY metrics.cost_micros DESC",
      ],
    }),
    rsaAssets: gaql({
      fields: [
        "campaign.id",
        "campaign.name",
        "ad_group_ad_asset_view.ad_group_ad",
        "ad_group_ad_asset_view.asset",
        "ad_group_ad_asset_view.field_type",
        "ad_group_ad_asset_view.enabled",
        "ad_group_ad_asset_view.performance_label",
        "ad_group_ad_asset_view.pinned_field",
        "ad_group_ad_asset_view.source",
        "metrics.impressions",
        "metrics.clicks",
        "metrics.cost_micros",
        "metrics.conversions",
        "metrics.conversions_value",
      ],
      from: "ad_group_ad_asset_view",
      suffix: [
        `WHERE ${dateRange(window)}`,
        `AND ${searchOnly}`,
        `AND ${activeCampaign}`,
        "ORDER BY metrics.impressions DESC",
      ],
    }),
    campaignAssets: gaql({
      fields: [
        "campaign.id",
        "campaign.name",
        "campaign.status",
        "campaign.advertising_channel_type",
        "campaign_asset.asset",
        "campaign_asset.field_type",
        "campaign_asset.status",
        "campaign_asset.source",
        "metrics.impressions",
        "metrics.clicks",
        "metrics.cost_micros",
        "metrics.conversions",
        "metrics.conversions_value",
      ],
      from: "campaign_asset",
      suffix: [
        `WHERE ${dateRange(window)}`,
        `AND ${searchOnly}`,
        `AND ${activeCampaign}`,
        "AND campaign_asset.status != 'REMOVED'",
        "ORDER BY metrics.impressions DESC",
      ],
    }),
    devices: gaql({
      fields: [
        "campaign.id",
        "campaign.name",
        "campaign.status",
        "segments.device",
        "metrics.impressions",
        "metrics.clicks",
        "metrics.cost_micros",
        "metrics.conversions",
        "metrics.conversions_value",
      ],
      from: "campaign",
      suffix: [
        `WHERE ${dateRange(window)}`,
        `AND ${searchOnly}`,
        `AND ${activeCampaign}`,
        "ORDER BY metrics.cost_micros DESC",
      ],
    }),
    dayparts: gaql({
      fields: [
        "campaign.id",
        "campaign.name",
        "campaign.status",
        "segments.day_of_week",
        "segments.hour",
        "metrics.impressions",
        "metrics.clicks",
        "metrics.cost_micros",
        "metrics.conversions",
        "metrics.conversions_value",
      ],
      from: "campaign",
      suffix: [
        `WHERE ${dateRange(window)}`,
        `AND ${searchOnly}`,
        `AND ${activeCampaign}`,
        "ORDER BY metrics.cost_micros DESC",
      ],
    }),
    userLocations: gaql({
      fields: [
        "campaign.id",
        "campaign.name",
        "campaign.status",
        "campaign.advertising_channel_type",
        "user_location_view.country_criterion_id",
        "user_location_view.targeting_location",
        "metrics.impressions",
        "metrics.clicks",
        "metrics.cost_micros",
        "metrics.conversions",
        "metrics.conversions_value",
      ],
      from: "user_location_view",
      suffix: [
        `WHERE ${dateRange(window)}`,
        `AND ${searchOnly}`,
        `AND ${activeCampaign}`,
        "ORDER BY metrics.cost_micros DESC",
      ],
    }),
  }
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function text(value: unknown): string | null {
  if (typeof value === "string") return value.trim() || null
  if (typeof value === "number" && Number.isFinite(value)) return String(value)
  return null
}

function number(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return 0
}

function nullableNumber(value: unknown): number | null {
  if (value == null || value === "") return null
  const parsed = number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function boolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value
  if (value === "true") return true
  if (value === "false") return false
  return null
}

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map(text).filter((item): item is string => item != null)
    : []
}

function round(value: number, places = 4): number {
  const factor = 10 ** places
  return Math.round((value + Number.EPSILON) * factor) / factor
}

function calculatedMetrics(args: {
  clicks: number
  conversionValueCents: number
  conversions: number
  costCents: number
  impressions: number
}): GoogleAdsDeepAuditMetric {
  const { clicks, conversionValueCents, conversions, costCents, impressions } =
    args
  return {
    clicks,
    conversionValueCents,
    conversions,
    costCents,
    costPerConversionCents:
      conversions > 0 ? Math.round(costCents / conversions) : null,
    ctr: impressions > 0 ? round(clicks / impressions) : null,
    impressions,
    valueCostRatio:
      costCents > 0 ? round(conversionValueCents / costCents) : null,
  }
}

function metrics(row: Record<string, unknown>): GoogleAdsDeepAuditMetric {
  const raw = record(row.metrics)
  return calculatedMetrics({
    clicks: Math.max(0, number(raw.clicks)),
    conversionValueCents: Math.max(
      0,
      Math.round(number(raw.conversionsValue) * 100),
    ),
    conversions: Math.max(0, number(raw.conversions)),
    costCents: Math.max(0, Math.round(number(raw.costMicros) / 10_000)),
    impressions: Math.max(0, number(raw.impressions)),
  })
}

function compareCost(
  left: GoogleAdsDeepAuditMetric,
  right: GoogleAdsDeepAuditMetric,
): number {
  return right.costCents - left.costCents || right.clicks - left.clicks
}

const POSSIBLE_PERSONAL_QUERY_PATTERNS = [
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  /\b(?:https?:\/\/|www\.)\S+/i,
  /(?:\+?61|0)[2-478](?:[\s-]?\d){8}\b/,
  /\b\d{6,}\b/,
  /\b(?:my name is|i am called|patient name)\b/i,
]

function safeSearchTerm(value: unknown): {
  possiblePersonalDataSuppressed: boolean
  searchTerm: string
} {
  const candidate = text(value) ?? "[missing search term]"
  const suppress = POSSIBLE_PERSONAL_QUERY_PATTERNS.some((pattern) =>
    pattern.test(candidate)
  )
  return suppress
    ? {
        possiblePersonalDataSuppressed: true,
        searchTerm: "[suppressed possible personal query]",
      }
    : { possiblePersonalDataSuppressed: false, searchTerm: candidate }
}

function normalizeSearchTerms(
  rows: Record<string, unknown>[],
): GoogleAdsDeepAuditSearchTerm[] {
  const aggregated = new Map<string, {
    adGroupId: string | null
    adGroupName: string | null
    campaignId: string | null
    campaignName: string | null
    campaignStatus: string | null
    clicks: number
    conversionValueCents: number
    conversions: number
    costCents: number
    firstSeenDate: string | null
    impressions: number
    lastSeenDate: string | null
    matchedKeyword: string | null
    matchType: string | null
    rawSearchTerm: string
    targetingStatus: string | null
  }>()

  for (const row of rows) {
    const campaign = record(row.campaign)
    const adGroup = record(row.adGroup)
    const view = record(row.searchTermView)
    const segments = record(row.segments)
    const keyword = record(segments.keyword)
    const keywordInfo = record(keyword.info)
    const rawSearchTerm = text(view.searchTerm) ?? "[missing search term]"
    const date = text(segments.date)
    const rowMetrics = metrics(row)
    const key = JSON.stringify([
      text(campaign.id),
      text(adGroup.id),
      rawSearchTerm,
      text(keywordInfo.text),
      text(keywordInfo.matchType),
      text(view.status),
    ])
    const current = aggregated.get(key) ?? {
      adGroupId: text(adGroup.id),
      adGroupName: text(adGroup.name),
      campaignId: text(campaign.id),
      campaignName: text(campaign.name),
      campaignStatus: text(campaign.status),
      clicks: 0,
      conversionValueCents: 0,
      conversions: 0,
      costCents: 0,
      firstSeenDate: date,
      impressions: 0,
      lastSeenDate: date,
      matchedKeyword: text(keywordInfo.text),
      matchType: text(keywordInfo.matchType),
      rawSearchTerm,
      targetingStatus: text(view.status),
    }
    current.clicks += rowMetrics.clicks
    current.conversionValueCents += rowMetrics.conversionValueCents
    current.conversions += rowMetrics.conversions
    current.costCents += rowMetrics.costCents
    current.impressions += rowMetrics.impressions
    if (date && (!current.firstSeenDate || date < current.firstSeenDate)) {
      current.firstSeenDate = date
    }
    if (date && (!current.lastSeenDate || date > current.lastSeenDate)) {
      current.lastSeenDate = date
    }
    aggregated.set(key, current)
  }

  return Array.from(aggregated.values()).map((term) => ({
    ...calculatedMetrics(term),
    adGroupId: term.adGroupId,
    adGroupName: term.adGroupName,
    campaignId: term.campaignId,
    campaignName: term.campaignName,
    campaignStatus: term.campaignStatus,
    firstSeenDate: term.firstSeenDate,
    lastSeenDate: term.lastSeenDate,
    matchedKeyword: term.matchedKeyword,
    matchType: term.matchType,
    ...safeSearchTerm(term.rawSearchTerm),
    targetingStatus: term.targetingStatus,
  })).sort(compareCost)
}

function normalizeKeywords(
  rows: Record<string, unknown>[],
): GoogleAdsDeepAuditKeyword[] {
  return rows.map((row) => {
    const campaign = record(row.campaign)
    const adGroup = record(row.adGroup)
    const criterion = record(row.adGroupCriterion)
    const keyword = record(criterion.keyword)
    const quality = record(criterion.qualityInfo)
    return {
      ...metrics(row),
      adGroupId: text(adGroup.id),
      adGroupName: text(adGroup.name),
      adGroupStatus: text(adGroup.status),
      campaignId: text(campaign.id),
      campaignName: text(campaign.name),
      campaignStatus: text(campaign.status),
      creativeQuality: text(quality.creativeQualityScore),
      keyword: text(keyword.text) ?? "[missing keyword]",
      landingPageQuality: text(quality.postClickQualityScore),
      matchType: text(keyword.matchType),
      primaryStatus: text(criterion.primaryStatus),
      primaryStatusReasons: strings(criterion.primaryStatusReasons),
      qualityScore: nullableNumber(quality.qualityScore),
      resourceName: text(criterion.resourceName),
      searchPredictedCtr: text(quality.searchPredictedCtr),
      status: text(criterion.status),
    }
  }).sort(compareCost)
}

function normalizeCampaigns(
  rows: Record<string, unknown>[],
): GoogleAdsDeepAuditCampaign[] {
  return rows.map((row) => {
    const campaign = record(row.campaign)
    const budget = record(row.campaignBudget)
    const rawMetrics = record(row.metrics)
    const budgetMicros = nullableNumber(budget.amountMicros)
    return {
      ...metrics(row),
      biddingStrategyType: text(campaign.biddingStrategyType),
      budgetAmountCents:
        budgetMicros == null ? null : Math.round(budgetMicros / 10_000),
      campaignId: text(campaign.id),
      campaignName: text(campaign.name),
      campaignResourceName: text(campaign.resourceName),
      searchBudgetLostImpressionShare: nullableNumber(
        rawMetrics.searchBudgetLostImpressionShare,
      ),
      searchImpressionShare: nullableNumber(rawMetrics.searchImpressionShare),
      searchRankLostImpressionShare: nullableNumber(
        rawMetrics.searchRankLostImpressionShare,
      ),
      status: text(campaign.status),
    }
  }).sort(compareCost)
}

function normalizeAds(
  rows: Record<string, unknown>[],
): GoogleAdsDeepAuditAd[] {
  return rows.map((row) => {
    const campaign = record(row.campaign)
    const adGroup = record(row.adGroup)
    const adGroupAd = record(row.adGroupAd)
    const ad = record(adGroupAd.ad)
    const policy = record(adGroupAd.policySummary)
    return {
      ...metrics(row),
      adGroupId: text(adGroup.id),
      adGroupName: text(adGroup.name),
      adGroupStatus: text(adGroup.status),
      adId: text(ad.id),
      approvalStatus: text(policy.approvalStatus),
      campaignId: text(campaign.id),
      campaignName: text(campaign.name),
      campaignStatus: text(campaign.status),
      finalUrls: strings(ad.finalUrls),
      resourceName: text(adGroupAd.resourceName),
      status: text(adGroupAd.status),
      strength: text(adGroupAd.adStrength),
    }
  }).sort(compareCost)
}

function normalizeAssets(
  rows: Record<string, unknown>[],
  level: GoogleAdsDeepAuditAsset["level"],
): GoogleAdsDeepAuditAsset[] {
  return rows.map((row) => {
    const campaign = record(row.campaign)
    const view = level === "responsive_search_ad"
      ? record(row.adGroupAdAssetView)
      : record(row.campaignAsset)
    return {
      ...metrics(row),
      adGroupAdResourceName:
        level === "responsive_search_ad" ? text(view.adGroupAd) : null,
      assetResourceName: text(view.asset),
      campaignId: text(campaign.id),
      campaignName: text(campaign.name),
      enabled:
        level === "responsive_search_ad" ? boolean(view.enabled) : null,
      fieldType: text(view.fieldType),
      level,
      performanceLabel:
        level === "responsive_search_ad"
          ? text(view.performanceLabel)
          : null,
      pinnedField:
        level === "responsive_search_ad" ? text(view.pinnedField) : null,
      source: text(view.source),
      status: level === "campaign" ? text(view.status) : null,
    }
  }).sort((left, right) =>
    right.impressions - left.impressions || compareCost(left, right)
  )
}

function normalizeBreakdown(
  rows: Record<string, unknown>[],
  dimension: (row: Record<string, unknown>) => string,
): GoogleAdsDeepAuditBreakdown[] {
  return rows.map((row) => {
    const campaign = record(row.campaign)
    return {
      ...metrics(row),
      campaignId: text(campaign.id),
      campaignName: text(campaign.name),
      campaignStatus: text(campaign.status),
      dimension: dimension(row),
    }
  }).sort(compareCost)
}

function accountRecord(
  resource: { values: Record<string, unknown> },
  key: string,
): Record<string, unknown> {
  return record(resource.values[key])
}

function enabledSearchCampaignResources(
  state: GoogleAdsAccountState | null,
): Array<{ id: string | null; resourceName: string | null }> {
  if (!state) return []
  return state.campaigns.flatMap((resource) => {
    const campaign = accountRecord(resource, "campaign")
    if (
      text(campaign.status) !== "ENABLED"
      || text(campaign.advertisingChannelType) !== "SEARCH"
    ) {
      return []
    }
    return [{
      id: text(campaign.id),
      resourceName: text(campaign.resourceName) ?? resource.resourceName,
    }]
  })
}

function enabledSearchCampaignResourceNames(
  state: GoogleAdsAccountState | null,
): Set<string> {
  return new Set(
    enabledSearchCampaignResources(state)
      .map((campaign) => campaign.resourceName)
      .filter((resourceName): resourceName is string => resourceName != null),
  )
}

function enabledSearchAdGroupResourceNames(
  state: GoogleAdsAccountState | null,
): Set<string> {
  const campaignNames = enabledSearchCampaignResourceNames(state)
  if (!state) return new Set()

  return new Set(state.adGroups.flatMap((resource) => {
    const adGroup = accountRecord(resource, "adGroup")
    const campaign = text(adGroup.campaign)
    const resourceName = text(adGroup.resourceName) ?? resource.resourceName
    return text(adGroup.status) === "ENABLED"
      && campaign != null
      && campaignNames.has(campaign)
      && resourceName != null
      ? [resourceName]
      : []
  }))
}

function enabledSearchRsaResourceNames(
  state: GoogleAdsAccountState | null,
): Set<string> {
  const adGroupNames = enabledSearchAdGroupResourceNames(state)
  if (!state) return new Set()

  return new Set(state.responsiveSearchAds.flatMap((resource) => {
    const ad = accountRecord(resource, "adGroupAd")
    const adGroup = text(ad.adGroup)
    const resourceName = text(ad.resourceName) ?? resource.resourceName
    return text(ad.status) === "ENABLED"
      && adGroup != null
      && adGroupNames.has(adGroup)
      && resourceName != null
      ? [resourceName]
      : []
  }))
}

function isActiveKeyword(keyword: GoogleAdsDeepAuditKeyword): boolean {
  return keyword.campaignStatus === "ENABLED"
    && keyword.adGroupStatus === "ENABLED"
    && keyword.status === "ENABLED"
}

function isActiveAd(ad: GoogleAdsDeepAuditAd): boolean {
  return ad.campaignStatus === "ENABLED"
    && ad.adGroupStatus === "ENABLED"
    && ad.status === "ENABLED"
}

function daysBetweenDates(
  startDate: string | null,
  endDate: string,
): number | null {
  if (!startDate) return null
  const start = Date.parse(`${startDate}T00:00:00.000Z`)
  const end = Date.parse(`${endDate}T00:00:00.000Z`)
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) {
    return null
  }
  return Math.floor((end - start) / 86_400_000)
}

function observedDateRange(term: GoogleAdsDeepAuditSearchTerm): string {
  if (term.firstSeenDate && term.lastSeenDate) {
    return term.firstSeenDate === term.lastSeenDate
      ? `on ${term.lastSeenDate}`
      : `from ${term.firstSeenDate} through ${term.lastSeenDate}`
  }
  return "during the audit window"
}

function campaignAssetCoverage(
  state: GoogleAdsAccountState | null,
): Map<string, Set<string>> {
  const coverage = new Map<string, Set<string>>()
  if (!state) return coverage

  for (const resource of state.campaignAssets) {
    const asset = accountRecord(resource, "campaignAsset")
    if (text(asset.status) !== "ENABLED") continue
    const campaign = text(asset.campaign)
    const fieldType = text(asset.fieldType)
    if (!campaign || !fieldType) continue
    const fields = coverage.get(campaign) ?? new Set<string>()
    fields.add(fieldType)
    coverage.set(campaign, fields)
  }
  return coverage
}

function addSignal(
  signals: GoogleAdsDeepAuditSignal[],
  signal: GoogleAdsDeepAuditSignal,
): void {
  const duplicate = signals.some((candidate) =>
    candidate.code === signal.code
    && candidate.resourceName === signal.resourceName
    && candidate.evidence === signal.evidence
  )
  if (!duplicate) signals.push(signal)
}

function buildSignals(args: {
  accountState: GoogleAdsAccountState | null
  ads: GoogleAdsDeepAuditAd[]
  assets: GoogleAdsDeepAuditAsset[]
  campaigns: GoogleAdsDeepAuditCampaign[]
  keywords: GoogleAdsDeepAuditKeyword[]
  locations: GoogleAdsDeepAuditBreakdown[]
  searchTerms: GoogleAdsDeepAuditSearchTerm[]
  windowEndDate: string
}): GoogleAdsDeepAuditSignal[] {
  const signals: GoogleAdsDeepAuditSignal[] = []
  const activeAdResources = new Set(
    args.ads
      .filter(isActiveAd)
      .map((ad) => ad.resourceName)
      .filter((resourceName): resourceName is string => resourceName != null),
  )

  for (const keyword of args.keywords) {
    if (isActiveKeyword(keyword) && keyword.matchType === "BROAD") {
      addSignal(signals, {
        campaignId: keyword.campaignId,
        code: "BROAD_POSITIVE_KEYWORD",
        evidence: `${keyword.keyword} is an enabled positive broad-match keyword`,
        level: "action_review",
        resourceName: keyword.resourceName,
      })
    }
    if (
      isActiveKeyword(keyword)
      && containsProhibitedPaidMedicineTerm(keyword.keyword)
    ) {
      addSignal(signals, {
        campaignId: keyword.campaignId,
        code: "PAID_MEDICINE_KEYWORD",
        evidence: `${keyword.keyword} is a positive medicine-name keyword`,
        level: "action_review",
        resourceName: keyword.resourceName,
      })
    }
    const qualityComponents = [
      keyword.creativeQuality,
      keyword.landingPageQuality,
      keyword.searchPredictedCtr,
    ]
    if (
      keyword.impressions > 0
      && isActiveKeyword(keyword)
      && keyword.qualityScore != null
      && qualityComponents.includes("BELOW_AVERAGE")
    ) {
      addSignal(signals, {
        campaignId: keyword.campaignId,
        code: "LOW_QUALITY_COMPONENT",
        evidence:
          `${keyword.keyword} has QS ${keyword.qualityScore} with at least one below-average component`,
        level: "investigate",
        resourceName: keyword.resourceName,
      })
    }
  }

  for (const term of args.searchTerms) {
    const activeAndNotExcluded = term.campaignStatus === "ENABLED"
      && !["EXCLUDED", "ADDED_EXCLUDED"].includes(
        term.targetingStatus ?? "",
      )
    const lastObservedDaysAgo = daysBetweenDates(
      term.lastSeenDate,
      args.windowEndDate,
    )
    if (
      activeAndNotExcluded
      && !term.possiblePersonalDataSuppressed
      && containsProhibitedPaidMedicineTerm(term.searchTerm)
    ) {
      addSignal(signals, {
        campaignId: term.campaignId,
        code: "PAID_MEDICINE_QUERY",
        evidence:
          `${term.searchTerm} appeared ${observedDateRange(term)} with current search-term status ${term.targetingStatus ?? "UNKNOWN"}; verify current keyword and negative-list attachment before any mutation`,
        level:
          lastObservedDaysAgo != null && lastObservedDaysAgo <= 6
            ? "action_review"
            : "investigate",
        resourceName: null,
      })
    }
    if (
      activeAndNotExcluded
      && term.conversions === 0
      && term.costCents >= SEARCH_TERM_REVIEW_SPEND_CENTS
    ) {
      addSignal(signals, {
        campaignId: term.campaignId,
        code: "UNCONVERTED_SEARCH_SPEND",
        evidence:
          `${term.searchTerm} spent A$${(term.costCents / 100).toFixed(2)} with no reported conversion ${observedDateRange(term)}; review intent, match, landing page, and negative controls before action`,
        level: "investigate",
        resourceName: null,
      })
    }
    if (
      term.campaignStatus === "ENABLED"
      && term.conversions > 0
      && term.targetingStatus === "NONE"
      && !term.possiblePersonalDataSuppressed
    ) {
      addSignal(signals, {
        campaignId: term.campaignId,
        code: "CONVERTED_UNTARGETED_QUERY",
        evidence:
          `${term.searchTerm} converted ${round(term.conversions, 2)} time(s) ${observedDateRange(term)} but is not currently a targeted keyword`,
        level: "opportunity",
        resourceName: null,
      })
    }
  }

  for (const ad of args.ads) {
    if (isActiveAd(ad) && ad.approvalStatus === "DISAPPROVED") {
      addSignal(signals, {
        campaignId: ad.campaignId,
        code: "DISAPPROVED_RSA",
        evidence: `RSA ${ad.adId ?? ad.resourceName ?? "unknown"} is disapproved`,
        level: "action_review",
        resourceName: ad.resourceName,
      })
    }
    if (isActiveAd(ad) && ad.strength === "POOR" && ad.impressions > 0) {
      addSignal(signals, {
        campaignId: ad.campaignId,
        code: "POOR_RSA_STRENGTH",
        evidence:
          `RSA ${ad.adId ?? ad.resourceName ?? "unknown"} is POOR after ${ad.impressions} impressions; this is a creative diagnostic, not an Ad Rank cause`,
        level: "investigate",
        resourceName: ad.resourceName,
      })
    }
  }

  for (const asset of args.assets) {
    if (
      asset.enabled !== false
      && asset.adGroupAdResourceName != null
      && activeAdResources.has(asset.adGroupAdResourceName)
      && asset.performanceLabel === "LOW"
      && asset.impressions > 0
    ) {
      addSignal(signals, {
        campaignId: asset.campaignId,
        code: "LOW_RSA_ASSET",
        evidence:
          `${asset.fieldType ?? "RSA asset"} ${asset.assetResourceName ?? "unknown"} has Google's LOW performance label`,
        level: "investigate",
        resourceName: asset.assetResourceName,
      })
    }
  }

  for (const campaign of args.campaigns) {
    if (
      campaign.status === "ENABLED"
      && (campaign.searchBudgetLostImpressionShare ?? 0) >= 0.2
    ) {
      addSignal(signals, {
        campaignId: campaign.campaignId,
        code: "SEARCH_BUDGET_HEADROOM",
        evidence:
          `${round((campaign.searchBudgetLostImpressionShare ?? 0) * 100, 1)}% Search impression share was lost to budget; scale only if fee-aware contribution gates pass`,
        level: "opportunity",
        resourceName: campaign.campaignResourceName,
      })
    }
    if (
      campaign.status === "ENABLED"
      && (campaign.searchRankLostImpressionShare ?? 0) >= 0.5
    ) {
      addSignal(signals, {
        campaignId: campaign.campaignId,
        code: "SEARCH_RANK_HEADROOM",
        evidence:
          `${round((campaign.searchRankLostImpressionShare ?? 0) * 100, 1)}% Search impression share was lost to Ad Rank; the cause is not established`,
        level: "investigate",
        resourceName: campaign.campaignResourceName,
      })
    }
  }

  for (const location of args.locations) {
    const countryId = location.dimension.split(":")[0]
    if (
      location.campaignStatus === "ENABLED"
      && countryId !== AUSTRALIA_COUNTRY_CRITERION_ID
      && location.costCents > 0
    ) {
      addSignal(signals, {
        campaignId: location.campaignId,
        code: "OUTSIDE_AUSTRALIA_SPEND",
        evidence:
          `Country criterion ${countryId} spent A$${(location.costCents / 100).toFixed(2)}`,
        level: "action_review",
        resourceName: null,
      })
    }
  }

  const coverage = campaignAssetCoverage(args.accountState)
  for (const campaign of enabledSearchCampaignResources(args.accountState)) {
    const fields = campaign.resourceName
      ? coverage.get(campaign.resourceName) ?? new Set<string>()
      : new Set<string>()
    if (!fields.has("AD_IMAGE")) {
      addSignal(signals, {
        campaignId: campaign.id,
        code: "NO_CAMPAIGN_IMAGE_ASSET",
        evidence: "Enabled Search campaign has no enabled campaign-level AD_IMAGE",
        level: "opportunity",
        resourceName: campaign.resourceName,
      })
    }
    if (!fields.has("STRUCTURED_SNIPPET")) {
      addSignal(signals, {
        campaignId: campaign.id,
        code: "NO_STRUCTURED_SNIPPET",
        evidence: "Enabled Search campaign has no enabled campaign-level structured snippet",
        level: "opportunity",
        resourceName: campaign.resourceName,
      })
    }
  }

  if (args.accountState) {
    const enabledAdGroups = enabledSearchAdGroupResourceNames(args.accountState)
    const adGroupsWithEnabledRsa = new Set(
      args.accountState.responsiveSearchAds.flatMap((resource) => {
        const ad = accountRecord(resource, "adGroupAd")
        const adGroup = text(ad.adGroup)
        return text(ad.status) === "ENABLED"
          && adGroup != null
          && enabledAdGroups.has(adGroup)
          ? [adGroup]
          : []
      }),
    )
    for (const adGroup of enabledAdGroups) {
      if (!adGroupsWithEnabledRsa.has(adGroup)) {
        addSignal(signals, {
          campaignId: null,
          code: "NO_ENABLED_RSA",
          evidence: `${adGroup} has no enabled responsive search ad`,
          level: "action_review",
          resourceName: adGroup,
        })
      }
    }
  }

  const priority = { action_review: 0, investigate: 1, opportunity: 2 }
  return signals.sort((left, right) =>
    priority[left.level] - priority[right.level]
    || left.code.localeCompare(right.code)
    || (left.campaignId ?? "").localeCompare(right.campaignId ?? "")
  )
}

export function analyzeGoogleAdsDeepAudit(
  input: AnalysisInput,
): GoogleAdsDeepAuditReport {
  const campaigns = normalizeCampaigns(input.rows.campaignPerformance)
  const searchTerms = normalizeSearchTerms(input.rows.searchTerms)
  const keywords = normalizeKeywords(input.rows.keywords)
  const ads = normalizeAds(input.rows.responsiveSearchAds)
  const rsaAssets = normalizeAssets(input.rows.rsaAssets, "responsive_search_ad")
  const campaignAssets = normalizeAssets(input.rows.campaignAssets, "campaign")
  const devices = normalizeBreakdown(
    input.rows.devices,
    (row) => text(record(row.segments).device) ?? "UNKNOWN",
  )
  const dayparts = normalizeBreakdown(input.rows.dayparts, (row) => {
    const segments = record(row.segments)
    const day = text(segments.dayOfWeek) ?? "UNKNOWN"
    const hour = String(Math.max(0, Math.min(23, number(segments.hour)))).padStart(2, "0")
    return `${day}:${hour}:00`
  })
  const userLocations = normalizeBreakdown(input.rows.userLocations, (row) => {
    const location = record(row.userLocationView)
    return `${text(location.countryCriterionId) ?? "UNKNOWN"}:${boolean(location.targetingLocation) === true ? "targeted" : "not_targeted"}`
  })

  const state = input.accountState
  const signals = buildSignals({
    accountState: state,
    ads,
    assets: rsaAssets,
    campaigns,
    keywords,
    locations: userLocations,
    searchTerms,
    windowEndDate: input.window.endDate,
  })
  const possiblePersonalQueriesSuppressed = searchTerms.filter(
    (term) => term.possiblePersonalDataSuppressed,
  ).length

  return {
    account: {
      activeManagerLinks: state
        ? state.customerManagerLinks.filter((resource) =>
            text(accountRecord(resource, "customerManagerLink").status)
            === "ACTIVE"
          ).length
        : 0,
      activeUsers: state
        ? state.customerUserAccess.filter((resource) =>
            text(accountRecord(resource, "customerUserAccess").accessRole)
            !== "UNKNOWN"
          ).length
        : 0,
      changeEventLookbackDays: 14,
      currencyCode: state?.customer?.currencyCode ?? null,
      customerId: state?.customer?.id ?? null,
      enabledAdGroups: enabledSearchAdGroupResourceNames(state).size,
      enabledSearchCampaigns: enabledSearchCampaignResources(state).length,
      enabledSearchRsas: enabledSearchRsaResourceNames(state).size,
      passkeyEnabledUsers: state
        ? state.customerUserAccess.filter((resource) =>
            boolean(accountRecord(resource, "customerUserAccess").passkeyEnabled)
            === true
          ).length
        : 0,
      recentChangeEvents: state?.changeEvents.length ?? 0,
      timeZone: state?.customer?.timeZone ?? null,
      usersWithoutPasskeys: state
        ? state.customerUserAccess.filter((resource) =>
            boolean(accountRecord(resource, "customerUserAccess").passkeyEnabled)
            !== true
          ).length
        : 0,
    },
    assets: {
      campaign: campaignAssets.slice(0, MAX_DETAIL_ROWS),
      responsiveSearchAds: rsaAssets.slice(0, MAX_DETAIL_ROWS),
    },
    breakdowns: {
      dayparts,
      devices,
      userLocations,
    },
    campaigns,
    completeness: {
      accountState: input.accountStateAvailable,
      accountStateError: input.accountStateError ?? null,
      failedQueries: input.failedQueries,
      successfulQueries: input.successfulQueries,
    },
    generatedAt: input.generatedAt,
    keywords: {
      broadPositive: keywords
        .filter((keyword) =>
          isActiveKeyword(keyword) && keyword.matchType === "BROAD"
        )
        .slice(0, MAX_DETAIL_ROWS),
      medicineTerms: keywords
        .filter((keyword) =>
          isActiveKeyword(keyword)
          && containsProhibitedPaidMedicineTerm(keyword.keyword)
        )
        .slice(0, MAX_DETAIL_ROWS),
      qualityDiagnostics: keywords
        .filter((keyword) =>
          keyword.impressions > 0
          && isActiveKeyword(keyword)
          && keyword.qualityScore != null
          && [
            keyword.creativeQuality,
            keyword.landingPageQuality,
            keyword.searchPredictedCtr,
          ].includes("BELOW_AVERAGE")
        )
        .slice(0, MAX_DETAIL_ROWS),
      spendLeaders: keywords.slice(0, MAX_DETAIL_ROWS),
    },
    privacy: {
      possiblePersonalQueriesSuppressed,
      rawSearchTermsPersisted: false,
      searchTermDetailScope: "authorised_codex_task_only",
      telegramSafe: false,
    },
    responsiveSearchAds: ads,
    searchTerms: {
      convertedUntargeted: searchTerms
        .filter((term) =>
          term.conversions > 0
          && term.campaignStatus === "ENABLED"
          && term.targetingStatus === "NONE"
          && !term.possiblePersonalDataSuppressed
        )
        .slice(0, MAX_DETAIL_ROWS),
      medicineTerms: searchTerms
        .filter((term) =>
          !term.possiblePersonalDataSuppressed
          && term.campaignStatus === "ENABLED"
          && containsProhibitedPaidMedicineTerm(term.searchTerm)
        )
        .slice(0, MAX_DETAIL_ROWS),
      spendWithoutConversion: searchTerms
        .filter((term) =>
          term.campaignStatus === "ENABLED"
          && term.conversions === 0
          && term.costCents > 0
        )
        .slice(0, MAX_DETAIL_ROWS),
      topConverted: [...searchTerms]
        .filter((term) => term.conversions > 0)
        .sort((left, right) =>
          right.conversions - left.conversions || compareCost(left, right)
        )
        .slice(0, MAX_DETAIL_ROWS),
    },
    signals,
    window: input.window,
  }
}

function emptyRows(): GoogleAdsDeepAuditRows {
  return {
    campaignAssets: [],
    campaignPerformance: [],
    dayparts: [],
    devices: [],
    keywords: [],
    responsiveSearchAds: [],
    rsaAssets: [],
    searchTerms: [],
    userLocations: [],
  }
}

function compactError(error: unknown): string {
  return (error instanceof Error ? error.message : String(error))
    .replace(/\s+/g, " ")
    .slice(0, 180)
}

export async function getGoogleAdsDeepAudit(args: {
  days?: number
  dependencies?: Partial<DeepAuditDependencies>
  now?: Date
} = {}): Promise<GoogleAdsDeepAuditReport> {
  const now = args.now ?? new Date()
  if (!Number.isFinite(now.getTime())) {
    throw new Error("Cannot build Google Ads deep audit at an invalid time")
  }
  const days = Math.min(
    Math.max(Math.floor(args.days ?? DEFAULT_AUDIT_DAYS), 1),
    MAX_AUDIT_DAYS,
  )
  const closedDay = resolveSydneyClosedDay(now)
  const resolvedWindow = resolveSydneyDateWindow(closedDay.reportDate, days)
  const window = { ...resolvedWindow, days }
  const queries = buildGoogleAdsDeepAuditQueries(window)
  const rows = emptyRows()
  const failedQueries: GoogleAdsDeepAuditReport["completeness"]["failedQueries"] = []
  const successfulQueries: GoogleAdsDeepAuditQueryName[] = []
  const dependencies: DeepAuditDependencies = {
    getAccountState: args.dependencies?.getAccountState ?? getAdsAccountState,
    search: args.dependencies?.search ?? searchGoogleAds,
  }

  let accountState: GoogleAdsAccountState | null = null
  let accountStateAvailable = false
  let accountStateError: string | null = null
  try {
    accountState = await dependencies.getAccountState({ now })
    accountStateAvailable = true
  } catch (error) {
    accountState = null
    accountStateError = compactError(error)
  }

  // Weekly only. Keep requests sequential to avoid bursting the Ads API.
  for (const [name, query] of Object.entries(queries) as Array<
    [GoogleAdsDeepAuditQueryName, string]
  >) {
    try {
      rows[name] = await dependencies.search(query)
      successfulQueries.push(name)
    } catch (error) {
      failedQueries.push({ error: compactError(error), name })
    }
  }

  return analyzeGoogleAdsDeepAudit({
    accountState,
    accountStateAvailable,
    accountStateError,
    failedQueries,
    generatedAt: now.toISOString(),
    rows,
    successfulQueries,
    window,
  })
}
