import { describe, expect, it, vi } from "vitest"

import type { GoogleAdsAccountState } from "@/lib/ads-agent/account-state"
import {
  analyzeGoogleAdsDeepAudit,
  buildGoogleAdsDeepAuditQueries,
  getGoogleAdsDeepAudit,
  type GoogleAdsDeepAuditRows,
} from "@/lib/ads-agent/deep-audit"

function state(): GoogleAdsAccountState {
  return {
    adGroupCriteria: [],
    adGroups: [
      {
        resourceName: "customers/123/adGroups/20",
        values: {
          adGroup: {
            campaign: "customers/123/campaigns/10",
            resourceName: "customers/123/adGroups/20",
            status: "ENABLED",
          },
        },
      },
      {
        resourceName: "customers/123/adGroups/21",
        values: {
          adGroup: {
            campaign: "customers/123/campaigns/11",
            resourceName: "customers/123/adGroups/21",
            status: "ENABLED",
          },
        },
      },
      {
        resourceName: "customers/123/adGroups/22",
        values: {
          adGroup: {
            campaign: "customers/123/campaigns/10",
            resourceName: "customers/123/adGroups/22",
            status: "PAUSED",
          },
        },
      },
    ],
    assets: [],
    biddingStrategies: [],
    campaignAssets: [],
    campaignBudgets: [],
    campaignCriteria: [],
    campaignSharedSets: [],
    campaigns: [
      {
        resourceName: "customers/123/campaigns/10",
        values: {
          campaign: {
            advertisingChannelType: "SEARCH",
            id: "10",
            resourceName: "customers/123/campaigns/10",
            status: "ENABLED",
          },
        },
      },
      {
        resourceName: "customers/123/campaigns/11",
        values: {
          campaign: {
            advertisingChannelType: "SEARCH",
            id: "11",
            resourceName: "customers/123/campaigns/11",
            status: "PAUSED",
          },
        },
      },
    ],
    changeEvents: [{
      actorHash: "a".repeat(64),
      changeDateTime: "2026-07-30 09:00:00+10:00",
      changeResourceName: "customers/123/campaigns/10",
      changeResourceType: "CAMPAIGN",
      changedFields: null,
      clientType: "GOOGLE_ADS_WEB_CLIENT",
      resourceChangeOperation: "UPDATE",
      resourceName: "customers/123/changeEvents/1",
    }],
    conversionActions: [],
    conversionGoals: [],
    customer: {
      autoTaggingEnabled: true,
      currencyCode: "AUD",
      finalUrlSuffix: null,
      id: "123",
      resourceName: "customers/123",
      timeZone: "Australia/Sydney",
    },
    customerClientLinks: [],
    customerManagerLinks: [{
      resourceName: "customers/123/customerManagerLinks/1",
      values: { customerManagerLink: { status: "ACTIVE" } },
    }],
    customerUserAccess: [{
      resourceName: "customers/123/customerUserAccess/1",
      values: {
        customerUserAccess: { accessRole: "ADMIN", passkeyEnabled: true },
      },
    }],
    readAt: "2026-07-31T00:00:00.000Z",
    responsiveSearchAds: [{
      resourceName: "customers/123/adGroupAds/20~30",
      values: {
        adGroupAd: {
          adGroup: "customers/123/adGroups/20",
          resourceName: "customers/123/adGroupAds/20~30",
          status: "ENABLED",
        },
      },
    }],
    sharedCriteria: [],
    sharedSets: [],
  }
}

function metric(args: {
  clicks?: number
  conversions?: number
  conversionsValue?: number
  costCents?: number
  impressions?: number
} = {}) {
  return {
    clicks: args.clicks ?? 1,
    conversions: args.conversions ?? 0,
    conversionsValue: args.conversionsValue ?? 0,
    costMicros: (args.costCents ?? 500) * 10_000,
    impressions: args.impressions ?? 10,
  }
}

function rows(): GoogleAdsDeepAuditRows {
  return {
    campaignAssets: [],
    campaignPerformance: [{
      campaign: {
        biddingStrategyType: "MAXIMIZE_CONVERSIONS",
        id: "10",
        name: "IM | Search | Med Certs",
        resourceName: "customers/123/campaigns/10",
        status: "ENABLED",
      },
      campaignBudget: { amountMicros: "20000000" },
      metrics: {
        ...metric({ conversions: 4, conversionsValue: 99.8, costCents: 8000 }),
        searchBudgetLostImpressionShare: 0.35,
        searchImpressionShare: 0.25,
        searchRankLostImpressionShare: 0.6,
      },
    }],
    dayparts: [{
      campaign: { id: "10", name: "IM | Search | Med Certs", status: "ENABLED" },
      metrics: metric({ conversions: 1, conversionsValue: 24.95 }),
      segments: { dayOfWeek: "MONDAY", hour: 8 },
    }],
    devices: [{
      campaign: { id: "10", name: "IM | Search | Med Certs", status: "ENABLED" },
      metrics: metric({ conversions: 1, conversionsValue: 24.95 }),
      segments: { device: "MOBILE" },
    }],
    keywords: [
      {
        adGroup: { id: "20", name: "Work Certificates", status: "ENABLED" },
        adGroupCriterion: {
          keyword: { matchType: "BROAD", text: "medical certificate" },
          primaryStatus: "ELIGIBLE",
          qualityInfo: {},
          resourceName: "customers/123/adGroupCriteria/20~1",
          status: "ENABLED",
        },
        campaign: { id: "10", name: "IM | Search | Med Certs", status: "ENABLED" },
        metrics: metric({ costCents: 1200 }),
      },
      {
        adGroup: { id: "20", name: "Work Certificates", status: "ENABLED" },
        adGroupCriterion: {
          keyword: { matchType: "EXACT", text: "online med cert" },
          primaryStatus: "ELIGIBLE",
          qualityInfo: {
            creativeQualityScore: "BELOW_AVERAGE",
            postClickQualityScore: "AVERAGE",
            qualityScore: 5,
            searchPredictedCtr: "AVERAGE",
          },
          resourceName: "customers/123/adGroupCriteria/20~2",
          status: "ENABLED",
        },
        campaign: { id: "10", name: "IM | Search | Med Certs", status: "ENABLED" },
        metrics: metric({ impressions: 20 }),
      },
      {
        adGroup: { id: "20", name: "Work Certificates", status: "ENABLED" },
        adGroupCriterion: {
          keyword: { matchType: "PHRASE", text: "sildenafil online" },
          primaryStatus: "ELIGIBLE",
          qualityInfo: {},
          resourceName: "customers/123/adGroupCriteria/20~3",
          status: "ENABLED",
        },
        campaign: { id: "10", name: "IM | Search | Med Certs", status: "ENABLED" },
        metrics: metric(),
      },
      {
        adGroup: {
          id: "21",
          name: "Paused Campaign Group",
          status: "ENABLED",
        },
        adGroupCriterion: {
          keyword: { matchType: "BROAD", text: "paused broad keyword" },
          primaryStatus: "ELIGIBLE",
          qualityInfo: {},
          resourceName: "customers/123/adGroupCriteria/21~4",
          status: "ENABLED",
        },
        campaign: { id: "11", name: "Paused Search", status: "PAUSED" },
        metrics: metric({ costCents: 900 }),
      },
    ],
    responsiveSearchAds: [
      {
        adGroup: { id: "20", name: "Work Certificates", status: "ENABLED" },
        adGroupAd: {
          ad: {
            finalUrls: ["https://instantmed.com.au/medical-certificate"],
            id: "30",
          },
          adStrength: "POOR",
          policySummary: { approvalStatus: "APPROVED_LIMITED" },
          resourceName: "customers/123/adGroupAds/20~30",
          status: "ENABLED",
        },
        campaign: { id: "10", name: "IM | Search | Med Certs", status: "ENABLED" },
        metrics: metric({ conversions: 1, conversionsValue: 24.95 }),
      },
      {
        adGroup: { id: "20", name: "Work Certificates", status: "ENABLED" },
        adGroupAd: {
          ad: { id: "31" },
          adStrength: "AVERAGE",
          policySummary: { approvalStatus: "DISAPPROVED" },
          resourceName: "customers/123/adGroupAds/20~31",
          status: "ENABLED",
        },
        campaign: { id: "10", name: "IM | Search | Med Certs", status: "ENABLED" },
        metrics: metric({ impressions: 0, clicks: 0, costCents: 0 }),
      },
    ],
    rsaAssets: [{
      adGroupAdAssetView: {
        adGroupAd: "customers/123/adGroupAds/20~30",
        asset: "customers/123/assets/40",
        enabled: true,
        fieldType: "HEADLINE",
        performanceLabel: "LOW",
        pinnedField: "UNSPECIFIED",
        source: "ADVERTISER",
      },
      campaign: { id: "10", name: "IM | Search | Med Certs", status: "ENABLED" },
      metrics: metric({ impressions: 100 }),
    }],
    searchTerms: [
      {
        adGroup: { id: "20", name: "Work Certificates" },
        campaign: { id: "10", name: "IM | Search | Med Certs", status: "ENABLED" },
        metrics: metric({ costCents: 1500 }),
        searchTermView: { searchTerm: "cheap medical certificate", status: "NONE" },
        segments: {
          date: "2026-07-30",
          keyword: { info: { matchType: "PHRASE", text: "medical certificate" } },
        },
      },
      {
        adGroup: { id: "20", name: "Work Certificates" },
        campaign: { id: "10", name: "IM | Search | Med Certs", status: "ENABLED" },
        metrics: metric({ costCents: 500 }),
        searchTermView: { searchTerm: "cheap medical certificate", status: "NONE" },
        segments: {
          date: "2026-07-20",
          keyword: { info: { matchType: "PHRASE", text: "medical certificate" } },
        },
      },
      {
        adGroup: { id: "20", name: "Work Certificates" },
        campaign: { id: "10", name: "IM | Search | Med Certs", status: "ENABLED" },
        metrics: metric({ conversions: 1, conversionsValue: 24.95, costCents: 570 }),
        searchTermView: { searchTerm: "medical certificate for yesterday", status: "NONE" },
        segments: {
          date: "2026-07-29",
          keyword: { info: { matchType: "PHRASE", text: "medical certificate" } },
        },
      },
      {
        adGroup: { id: "20", name: "Work Certificates" },
        campaign: { id: "10", name: "IM | Search | Med Certs", status: "ENABLED" },
        metrics: metric({ costCents: 200 }),
        searchTermView: { searchTerm: "sildenafil online", status: "NONE" },
        segments: {
          date: "2026-07-30",
          keyword: { info: { matchType: "PHRASE", text: "online script" } },
        },
      },
      {
        adGroup: { id: "20", name: "Work Certificates" },
        campaign: { id: "10", name: "IM | Search | Med Certs", status: "ENABLED" },
        metrics: metric({ costCents: 100 }),
        searchTermView: { searchTerm: "finasteride online", status: "NONE" },
        segments: {
          date: "2026-07-01",
          keyword: { info: { matchType: "PHRASE", text: "online script" } },
        },
      },
      {
        adGroup: { id: "20", name: "Work Certificates" },
        campaign: { id: "10", name: "IM | Search | Med Certs", status: "ENABLED" },
        metrics: metric({ costCents: 300 }),
        searchTermView: { searchTerm: "person@example.test med cert", status: "NONE" },
        segments: {
          date: "2026-07-30",
          keyword: { info: { matchType: "PHRASE", text: "medical certificate" } },
        },
      },
    ],
    userLocations: [
      {
        campaign: { id: "10", name: "IM | Search | Med Certs", status: "ENABLED" },
        metrics: metric({ costCents: 600 }),
        userLocationView: { countryCriterionId: "2036", targetingLocation: true },
      },
      {
        campaign: { id: "10", name: "IM | Search | Med Certs", status: "ENABLED" },
        metrics: metric({ costCents: 200 }),
        userLocationView: { countryCriterionId: "2840", targetingLocation: false },
      },
    ],
  }
}

describe("Google Ads Agent deep audit", () => {
  it("builds closed-date queries for every deep-audit surface", () => {
    const queries = buildGoogleAdsDeepAuditQueries({
      endDate: "2026-07-30",
      startDate: "2026-07-01",
    })
    const joined = Object.values(queries).join("\n")

    expect(Object.keys(queries)).toHaveLength(9)
    expect(joined).toContain(
      "segments.date BETWEEN '2026-07-01' AND '2026-07-30'",
    )
    expect(joined).toContain("FROM search_term_view")
    expect(joined).toContain("FROM keyword_view")
    expect(joined).toContain("FROM ad_group_ad_asset_view")
    expect(joined).toContain("FROM campaign_asset")
    expect(joined).toContain("FROM user_location_view")
    expect(queries.searchTerms).toContain("segments.date")
    expect(queries.searchTerms).toContain("campaign.status")
    expect(queries.keywords).toContain("ad_group.status")
    expect(joined).toContain("ad_group_criterion.quality_info.quality_score")
    expect(joined).toContain("metrics.search_budget_lost_impression_share")
    expect(joined).not.toContain("DURING LAST_30_DAYS")
  })

  it("separates evidence, hypotheses, and privacy-safe search-term detail", () => {
    const report = analyzeGoogleAdsDeepAudit({
      accountState: state(),
      accountStateAvailable: true,
      failedQueries: [],
      generatedAt: "2026-07-31T00:00:00.000Z",
      rows: rows(),
      successfulQueries: Object.keys(rows()) as Array<keyof GoogleAdsDeepAuditRows>,
      window: {
        days: 30,
        endDate: "2026-07-30",
        endUtcExclusive: "2026-07-30T14:00:00.000Z",
        startDate: "2026-07-01",
        startUtc: "2026-06-30T14:00:00.000Z",
      },
    })

    expect(report.account).toMatchObject({
      activeManagerLinks: 1,
      activeUsers: 1,
      changeEventLookbackDays: 14,
      enabledAdGroups: 1,
      enabledSearchCampaigns: 1,
      enabledSearchRsas: 1,
      passkeyEnabledUsers: 1,
      recentChangeEvents: 1,
      usersWithoutPasskeys: 0,
    })
    expect(report.privacy).toEqual({
      possiblePersonalQueriesSuppressed: 1,
      rawSearchTermsPersisted: false,
      searchTermDetailScope: "authorised_codex_task_only",
      telegramSafe: false,
    })
    expect(JSON.stringify(report)).not.toContain("person@example.test")
    expect(report.searchTerms.convertedUntargeted[0]?.searchTerm).toBe(
      "medical certificate for yesterday",
    )
    expect(report.searchTerms.convertedUntargeted[0]).toMatchObject({
      firstSeenDate: "2026-07-29",
      lastSeenDate: "2026-07-29",
    })
    expect(report.searchTerms.spendWithoutConversion[0]?.searchTerm).toBe(
      "cheap medical certificate",
    )
    expect(report.searchTerms.spendWithoutConversion[0]).toMatchObject({
      costCents: 2000,
      firstSeenDate: "2026-07-20",
      lastSeenDate: "2026-07-30",
    })
    expect(report.keywords.qualityDiagnostics).toHaveLength(1)
    expect(report.keywords.qualityDiagnostics[0]?.keyword).toBe("online med cert")
    expect(report.signals).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "BROAD_POSITIVE_KEYWORD" }),
      expect.objectContaining({ code: "CONVERTED_UNTARGETED_QUERY" }),
      expect.objectContaining({ code: "LOW_QUALITY_COMPONENT" }),
      expect.objectContaining({ code: "OUTSIDE_AUSTRALIA_SPEND" }),
      expect.objectContaining({ code: "PAID_MEDICINE_KEYWORD" }),
      expect.objectContaining({ code: "PAID_MEDICINE_QUERY" }),
      expect.objectContaining({
        code: "POOR_RSA_STRENGTH",
        evidence: expect.stringContaining("not an Ad Rank cause"),
      }),
      expect.objectContaining({ code: "SEARCH_BUDGET_HEADROOM" }),
      expect.objectContaining({
        code: "SEARCH_RANK_HEADROOM",
        evidence: expect.stringContaining("cause is not established"),
      }),
      expect.objectContaining({ code: "UNCONVERTED_SEARCH_SPEND" }),
    ]))
    expect(report.signals).not.toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: "LOW_QUALITY_COMPONENT",
        resourceName: "customers/123/adGroupCriteria/20~1",
      }),
      expect.objectContaining({
        code: "BROAD_POSITIVE_KEYWORD",
        resourceName: "customers/123/adGroupCriteria/21~4",
      }),
      expect.objectContaining({ code: "NO_ENABLED_RSA" }),
    ]))
    expect(
      report.signals.find((signal) => signal.code === "PAID_MEDICINE_QUERY"),
    ).toMatchObject({
      evidence: expect.stringContaining("on 2026-07-30"),
      level: "action_review",
    })
    expect(
      report.signals.find((signal) =>
        signal.code === "PAID_MEDICINE_QUERY"
        && signal.evidence.includes("finasteride online")
      ),
    ).toMatchObject({ level: "investigate" })
  })

  it("uses the last closed Sydney day and degrades partial query failures", async () => {
    const search = vi.fn(async (query: string) => {
      if (query.includes("FROM keyword_view")) {
        throw new Error("keyword_view_temporarily_unavailable")
      }
      return []
    })

    const report = await getGoogleAdsDeepAudit({
      days: 7,
      dependencies: {
        getAccountState: vi.fn(async () => state()),
        search,
      },
      now: new Date("2026-07-31T01:00:00.000Z"),
    })

    expect(report.window).toMatchObject({
      days: 7,
      endDate: "2026-07-30",
      startDate: "2026-07-24",
    })
    expect(report.completeness.accountState).toBe(true)
    expect(report.completeness.failedQueries).toEqual([{
      error: "keyword_view_temporarily_unavailable",
      name: "keywords",
    }])
    expect(search).toHaveBeenCalledTimes(9)
  })
})
