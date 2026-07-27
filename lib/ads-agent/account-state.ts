import "server-only"

import { createHash } from "node:crypto"

import { searchGoogleAds } from "@/lib/google-ads/client"

export interface NormalizedGoogleAdsResource {
  resourceName: string | null
  values: Record<string, unknown>
}

export interface GoogleAdsCustomerState {
  autoTaggingEnabled: boolean | null
  currencyCode: string | null
  finalUrlSuffix: string | null
  id: string | null
  resourceName: string | null
  timeZone: string | null
}

export interface GoogleAdsChangeEventState {
  actorHash: string | null
  changeDateTime: string | null
  changeResourceName: string | null
  changeResourceType: string | null
  changedFields: unknown
  clientType: string | null
  resourceChangeOperation: string | null
  resourceName: string | null
}

export interface GoogleAdsAccountState {
  adGroupCriteria: NormalizedGoogleAdsResource[]
  adGroups: NormalizedGoogleAdsResource[]
  assets: NormalizedGoogleAdsResource[]
  biddingStrategies: NormalizedGoogleAdsResource[]
  campaignAssets: NormalizedGoogleAdsResource[]
  campaignBudgets: NormalizedGoogleAdsResource[]
  campaignCriteria: NormalizedGoogleAdsResource[]
  campaignSharedSets: NormalizedGoogleAdsResource[]
  campaigns: NormalizedGoogleAdsResource[]
  changeEvents: GoogleAdsChangeEventState[]
  conversionActions: NormalizedGoogleAdsResource[]
  conversionGoals: NormalizedGoogleAdsResource[]
  customer: GoogleAdsCustomerState | null
  customerClientLinks: NormalizedGoogleAdsResource[]
  customerManagerLinks: NormalizedGoogleAdsResource[]
  readAt: string
  responsiveSearchAds: NormalizedGoogleAdsResource[]
  sharedCriteria: NormalizedGoogleAdsResource[]
  sharedSets: NormalizedGoogleAdsResource[]
}

export interface GoogleAdsAccountStateQueries {
  adGroupCriteria: string
  adGroups: string
  assets: string
  biddingStrategies: string
  campaignAssets: string
  campaignBudgets: string
  campaignCriteria: string
  campaignSharedSets: string
  campaigns: string
  changeEvents: string
  conversionActions: string
  conversionGoals: string
  customer: string
  customerClientLinks: string
  customerManagerLinks: string
  responsiveSearchAds: string
  sharedCriteria: string
  sharedSets: string
}

function gaql(args: {
  fields: string[]
  from: string
  suffix?: string
}): string {
  return [
    "SELECT",
    args.fields.join(", "),
    `FROM ${args.from}`,
    args.suffix,
  ]
    .filter(Boolean)
    .join(" ")
}

/**
 * The account-state read deliberately excludes search-query views, metrics
 * containing user input, click identifiers, and every InstantMed record.
 */
export function buildGoogleAdsAccountStateQueries(): GoogleAdsAccountStateQueries {
  return {
    customer: gaql({
      fields: [
        "customer.id",
        "customer.resource_name",
        "customer.auto_tagging_enabled",
        "customer.final_url_suffix",
        "customer.currency_code",
        "customer.time_zone",
      ],
      from: "customer",
      suffix: "LIMIT 1",
    }),
    conversionActions: gaql({
      fields: [
        "conversion_action.id",
        "conversion_action.resource_name",
        "conversion_action.name",
        "conversion_action.status",
        "conversion_action.type",
        "conversion_action.category",
        "conversion_action.origin",
        "conversion_action.primary_for_goal",
        "conversion_action.include_in_conversions_metric",
        "conversion_action.counting_type",
        "conversion_action.click_through_lookback_window_days",
      ],
      from: "conversion_action",
      suffix: "ORDER BY conversion_action.id",
    }),
    conversionGoals: gaql({
      fields: [
        "customer_conversion_goal.resource_name",
        "customer_conversion_goal.category",
        "customer_conversion_goal.origin",
        "customer_conversion_goal.biddable",
      ],
      from: "customer_conversion_goal",
    }),
    campaigns: gaql({
      fields: [
        "campaign.id",
        "campaign.resource_name",
        "campaign.name",
        "campaign.status",
        "campaign.advertising_channel_type",
        "campaign.bidding_strategy",
        "campaign.bidding_strategy_type",
        "campaign.campaign_budget",
        "campaign.maximize_conversions.target_cpa_micros",
        "campaign.network_settings.target_google_search",
        "campaign.network_settings.target_search_network",
        "campaign.network_settings.target_content_network",
        "campaign.network_settings.target_partner_search_network",
        "campaign.geo_target_type_setting.positive_geo_target_type",
        "campaign.geo_target_type_setting.negative_geo_target_type",
        "campaign_budget.resource_name",
        "campaign_budget.amount_micros",
        "campaign_budget.explicitly_shared",
        "campaign_budget.status",
        "bidding_strategy.resource_name",
        "bidding_strategy.name",
        "bidding_strategy.status",
        "bidding_strategy.type",
      ],
      from: "campaign",
      suffix:
        "WHERE campaign.advertising_channel_type = 'SEARCH' ORDER BY campaign.id",
    }),
    campaignBudgets: gaql({
      fields: [
        "campaign_budget.id",
        "campaign_budget.resource_name",
        "campaign_budget.name",
        "campaign_budget.amount_micros",
        "campaign_budget.total_amount_micros",
        "campaign_budget.period",
        "campaign_budget.delivery_method",
        "campaign_budget.explicitly_shared",
        "campaign_budget.reference_count",
        "campaign_budget.status",
      ],
      from: "campaign_budget",
      suffix: "ORDER BY campaign_budget.id",
    }),
    biddingStrategies: gaql({
      fields: [
        "bidding_strategy.id",
        "bidding_strategy.resource_name",
        "bidding_strategy.name",
        "bidding_strategy.status",
        "bidding_strategy.type",
        "bidding_strategy.campaign_count",
        "bidding_strategy.non_removed_campaign_count",
        "bidding_strategy.target_cpa.target_cpa_micros",
        "bidding_strategy.target_roas.target_roas",
      ],
      from: "bidding_strategy",
      suffix: "ORDER BY bidding_strategy.id",
    }),
    campaignCriteria: gaql({
      fields: [
        "campaign_criterion.resource_name",
        "campaign_criterion.campaign",
        "campaign_criterion.criterion_id",
        "campaign_criterion.type",
        "campaign_criterion.status",
        "campaign_criterion.negative",
        "campaign_criterion.keyword.text",
        "campaign_criterion.keyword.match_type",
        "campaign_criterion.location.geo_target_constant",
        "campaign_criterion.language.language_constant",
        "campaign_criterion.ad_schedule.day_of_week",
        "campaign_criterion.ad_schedule.start_hour",
        "campaign_criterion.ad_schedule.start_minute",
        "campaign_criterion.ad_schedule.end_hour",
        "campaign_criterion.ad_schedule.end_minute",
      ],
      from: "campaign_criterion",
    }),
    adGroups: gaql({
      fields: [
        "ad_group.id",
        "ad_group.resource_name",
        "ad_group.campaign",
        "ad_group.name",
        "ad_group.status",
        "ad_group.type",
        "ad_group.cpc_bid_micros",
        "ad_group.target_cpa_micros",
      ],
      from: "ad_group",
      suffix: "ORDER BY ad_group.id",
    }),
    adGroupCriteria: gaql({
      fields: [
        "ad_group_criterion.resource_name",
        "ad_group_criterion.ad_group",
        "ad_group_criterion.criterion_id",
        "ad_group_criterion.status",
        "ad_group_criterion.type",
        "ad_group_criterion.negative",
        "ad_group_criterion.keyword.text",
        "ad_group_criterion.keyword.match_type",
        "ad_group_criterion.final_urls",
        "ad_group_criterion.quality_info.quality_score",
      ],
      from: "ad_group_criterion",
      suffix: "WHERE ad_group_criterion.type = 'KEYWORD'",
    }),
    responsiveSearchAds: gaql({
      fields: [
        "ad_group_ad.resource_name",
        "ad_group_ad.ad_group",
        "ad_group_ad.status",
        "ad_group_ad.policy_summary.approval_status",
        "ad_group_ad.policy_summary.policy_topic_entries",
        "ad_group_ad.ad.id",
        "ad_group_ad.ad.resource_name",
        "ad_group_ad.ad.type",
        "ad_group_ad.ad.final_urls",
        "ad_group_ad.ad.final_url_suffix",
        "ad_group_ad.ad.responsive_search_ad.headlines",
        "ad_group_ad.ad.responsive_search_ad.descriptions",
        "ad_group_ad.ad.responsive_search_ad.path1",
        "ad_group_ad.ad.responsive_search_ad.path2",
      ],
      from: "ad_group_ad",
      suffix: "WHERE ad_group_ad.ad.type = 'RESPONSIVE_SEARCH_AD'",
    }),
    sharedSets: gaql({
      fields: [
        "shared_set.id",
        "shared_set.resource_name",
        "shared_set.name",
        "shared_set.type",
        "shared_set.status",
        "shared_set.member_count",
        "shared_set.reference_count",
      ],
      from: "shared_set",
      suffix:
        "WHERE shared_set.type = 'NEGATIVE_KEYWORDS' ORDER BY shared_set.id",
    }),
    sharedCriteria: gaql({
      fields: [
        "shared_criterion.resource_name",
        "shared_criterion.shared_set",
        "shared_criterion.criterion_id",
        "shared_criterion.type",
        "shared_criterion.keyword.text",
        "shared_criterion.keyword.match_type",
      ],
      from: "shared_criterion",
    }),
    campaignSharedSets: gaql({
      fields: [
        "campaign_shared_set.resource_name",
        "campaign_shared_set.campaign",
        "campaign_shared_set.shared_set",
        "campaign_shared_set.status",
      ],
      from: "campaign_shared_set",
    }),
    assets: gaql({
      fields: [
        "asset.id",
        "asset.resource_name",
        "asset.name",
        "asset.type",
        "asset.source",
        "asset.final_urls",
        "asset.policy_summary.approval_status",
        "asset.policy_summary.policy_topic_entries",
        "asset.text_asset.text",
        "asset.callout_asset.callout_text",
        "asset.sitelink_asset.link_text",
        "asset.sitelink_asset.description1",
        "asset.sitelink_asset.description2",
      ],
      from: "asset",
      suffix: "ORDER BY asset.id",
    }),
    campaignAssets: gaql({
      fields: [
        "campaign_asset.resource_name",
        "campaign_asset.campaign",
        "campaign_asset.asset",
        "campaign_asset.field_type",
        "campaign_asset.status",
        "campaign_asset.source",
      ],
      from: "campaign_asset",
    }),
    customerClientLinks: gaql({
      fields: [
        "customer_client_link.resource_name",
        "customer_client_link.client_customer",
        "customer_client_link.manager_link_id",
        "customer_client_link.status",
        "customer_client_link.hidden",
      ],
      from: "customer_client_link",
    }),
    customerManagerLinks: gaql({
      fields: [
        "customer_manager_link.resource_name",
        "customer_manager_link.manager_customer",
        "customer_manager_link.manager_link_id",
        "customer_manager_link.status",
      ],
      from: "customer_manager_link",
    }),
    changeEvents: gaql({
      fields: [
        "change_event.resource_name",
        "change_event.change_date_time",
        "change_event.change_resource_name",
        "change_event.change_resource_type",
        "change_event.client_type",
        "change_event.user_email",
        "change_event.resource_change_operation",
        "change_event.changed_fields",
      ],
      from: "change_event",
      suffix:
        "WHERE change_event.change_date_time DURING LAST_14_DAYS ORDER BY change_event.change_date_time DESC LIMIT 1000",
    }),
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function asNullableString(value: unknown): string | null {
  if (typeof value === "string") return value
  if (typeof value === "number" && Number.isFinite(value)) return String(value)
  return null
}

function asNullableBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null
}

function normalizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeValue)
  }

  const record = asRecord(value)
  if (!record) return value

  return Object.fromEntries(
    Object.keys(record)
      .sort()
      .map((key) => [key, normalizeValue(record[key])]),
  )
}

function findResourceName(row: Record<string, unknown>): string | null {
  for (const key of Object.keys(row).sort()) {
    const resource = asRecord(row[key])
    const resourceName = asNullableString(resource?.resourceName)
    if (resourceName) return resourceName
  }

  return asNullableString(row.resourceName)
}

function normalizeRows(
  rows: Record<string, unknown>[],
): NormalizedGoogleAdsResource[] {
  return rows
    .map((row) => ({
      resourceName: findResourceName(row),
      values: normalizeValue(row) as Record<string, unknown>,
    }))
    .sort((left, right) => {
      const resourceOrder = (left.resourceName ?? "").localeCompare(
        right.resourceName ?? "",
      )
      if (resourceOrder !== 0) return resourceOrder
      return JSON.stringify(left.values).localeCompare(JSON.stringify(right.values))
    })
}

function normalizeCustomer(
  rows: Record<string, unknown>[],
): GoogleAdsCustomerState | null {
  const customer = asRecord(rows[0]?.customer)
  if (!customer) return null

  return {
    autoTaggingEnabled: asNullableBoolean(customer.autoTaggingEnabled),
    currencyCode: asNullableString(customer.currencyCode),
    finalUrlSuffix: asNullableString(customer.finalUrlSuffix),
    id: asNullableString(customer.id),
    resourceName: asNullableString(customer.resourceName),
    timeZone: asNullableString(customer.timeZone),
  }
}

function hashChangeActor(value: unknown): string | null {
  const actor = asNullableString(value)?.trim().toLowerCase()
  if (!actor) return null
  return createHash("sha256").update(actor, "utf8").digest("hex")
}

function normalizeChangeEvents(
  rows: Record<string, unknown>[],
): GoogleAdsChangeEventState[] {
  return rows
    .map((row) => {
      const event = asRecord(row.changeEvent) ?? {}
      return {
        actorHash: hashChangeActor(event.userEmail),
        changeDateTime: asNullableString(event.changeDateTime),
        changeResourceName: asNullableString(event.changeResourceName),
        changeResourceType: asNullableString(event.changeResourceType),
        changedFields: normalizeValue(event.changedFields),
        clientType: asNullableString(event.clientType),
        resourceChangeOperation: asNullableString(
          event.resourceChangeOperation,
        ),
        resourceName: asNullableString(event.resourceName),
      }
    })
    .sort((left, right) => {
      const timeOrder = (right.changeDateTime ?? "").localeCompare(
        left.changeDateTime ?? "",
      )
      if (timeOrder !== 0) return timeOrder
      return (left.resourceName ?? "").localeCompare(right.resourceName ?? "")
    })
}

export async function getAdsAccountState(args: {
  now?: Date
} = {}): Promise<GoogleAdsAccountState> {
  const now = args.now ?? new Date()
  if (!Number.isFinite(now.getTime())) {
    throw new Error("Cannot read Google Ads account state at an invalid time")
  }

  const queries = buildGoogleAdsAccountStateQueries()
  const entries = Object.entries(queries) as Array<
    [keyof GoogleAdsAccountStateQueries, string]
  >
  const rows = {} as Record<
    keyof GoogleAdsAccountStateQueries,
    Record<string, unknown>[]
  >

  // Sequential reads avoid a daily control-plane run causing an API burst.
  // Any failed critical query rejects the full read and is classified RED by
  // the tracking-health layer rather than silently yielding an empty section.
  for (const [key, query] of entries) {
    rows[key] = await searchGoogleAds<Record<string, unknown>>(query)
  }

  return {
    readAt: now.toISOString(),
    customer: normalizeCustomer(rows.customer),
    conversionActions: normalizeRows(rows.conversionActions),
    conversionGoals: normalizeRows(rows.conversionGoals),
    campaigns: normalizeRows(rows.campaigns),
    campaignBudgets: normalizeRows(rows.campaignBudgets),
    biddingStrategies: normalizeRows(rows.biddingStrategies),
    campaignCriteria: normalizeRows(rows.campaignCriteria),
    adGroups: normalizeRows(rows.adGroups),
    adGroupCriteria: normalizeRows(rows.adGroupCriteria),
    responsiveSearchAds: normalizeRows(rows.responsiveSearchAds),
    sharedSets: normalizeRows(rows.sharedSets),
    sharedCriteria: normalizeRows(rows.sharedCriteria),
    campaignSharedSets: normalizeRows(rows.campaignSharedSets),
    assets: normalizeRows(rows.assets),
    campaignAssets: normalizeRows(rows.campaignAssets),
    customerClientLinks: normalizeRows(rows.customerClientLinks),
    customerManagerLinks: normalizeRows(rows.customerManagerLinks),
    changeEvents: normalizeChangeEvents(rows.changeEvents),
  }
}
