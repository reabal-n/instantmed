import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getAdsAccountState: vi.fn(),
  getGoogleAdsCampaignRowsForRange: vi.fn(),
  getLocalGoogleAdsPurchasesForRange: vi.fn(),
  getStripeFeeMap: vi.fn(),
  hashGoogleAdsAccountState: vi.fn(() => "a".repeat(64)),
}))

vi.mock("@/lib/ads-agent/account-state", () => ({
  getAdsAccountState: mocks.getAdsAccountState,
  hashGoogleAdsAccountState: mocks.hashGoogleAdsAccountState,
}))

vi.mock("@/lib/ads-agent/stripe-fees", () => ({
  getStripeFeeMap: mocks.getStripeFeeMap,
}))

vi.mock("@/lib/analytics/google-ads-report", () => ({
  getGoogleAdsCampaignRowsForRange: mocks.getGoogleAdsCampaignRowsForRange,
  getLocalGoogleAdsPurchasesForRange: mocks.getLocalGoogleAdsPurchasesForRange,
}))

import { buildAdsAgentSnapshot } from "@/lib/ads-agent/snapshot"

const REPORT_NOW = new Date("2026-07-27T23:00:00.000Z")

const scriptsCampaign = {
  resourceName: "customers/1234567890/campaigns/23870042807",
  values: {
    campaign: {
      advertisingChannelType: "SEARCH",
      id: "23870042807",
      name: "JDM | Search | Scripts",
      resourceName: "customers/1234567890/campaigns/23870042807",
      status: "ENABLED",
    },
    campaignBudget: {
      amountMicros: "40000000",
      resourceName: "customers/1234567890/campaignBudgets/400",
    },
  },
}

const pausedCampaign = {
  resourceName: "customers/1234567890/campaigns/999",
  values: {
    campaign: {
      advertisingChannelType: "SEARCH",
      id: "999",
      name: "Specialist",
      resourceName: "customers/1234567890/campaigns/999",
      status: "PAUSED",
    },
    campaignBudget: {
      amountMicros: "10000000",
      resourceName: "customers/1234567890/campaignBudgets/999",
    },
  },
}

const displayCampaign = {
  resourceName: "customers/1234567890/campaigns/888",
  values: {
    campaign: {
      advertisingChannelType: "DISPLAY",
      id: "888",
      name: "Display",
      resourceName: "customers/1234567890/campaigns/888",
      status: "PAUSED",
    },
    campaignBudget: {
      amountMicros: "5000000",
      resourceName: "customers/1234567890/campaignBudgets/888",
    },
  },
}

const accountState = {
  adGroupCriteria: [],
  adGroups: [],
  assets: [],
  biddingStrategies: [],
  campaignAssets: [],
  campaignBudgets: [],
  campaignCriteria: [],
  campaignSharedSets: [],
  campaigns: [scriptsCampaign, pausedCampaign, displayCampaign],
  changeEvents: [{
    actorHash: "a".repeat(64),
    changeDateTime: "2026-07-27 08:30:00+10:00",
    changeResourceName: scriptsCampaign.resourceName,
    changeResourceType: "CAMPAIGN",
    changedFields: null,
    clientType: "GOOGLE_ADS_WEB_CLIENT",
    resourceChangeOperation: "UPDATE",
    resourceName: "customers/1234567890/changeEvents/event-1",
  }],
  conversionActions: [],
  conversionGoals: [],
  customer: {
    autoTaggingEnabled: true,
    currencyCode: "AUD",
    finalUrlSuffix: "utm_source=google&utm_medium=cpc",
    id: "1234567890",
    resourceName: "customers/1234567890",
    timeZone: "Australia/Sydney",
  },
  customerClientLinks: [],
  customerManagerLinks: [],
  customerUserAccess: [],
  readAt: REPORT_NOW.toISOString(),
  responsiveSearchAds: [],
  sharedCriteria: [],
  sharedSets: [],
}

const dailySpendRows = [{
  campaign: {
    advertisingChannelType: "SEARCH",
    id: "23870042807",
    name: "JDM | Search | Scripts",
    status: "ENABLED",
  },
  metrics: { costMicros: "10000000" },
}]

const rollingSpendRows = [
  {
    campaign: {
      advertisingChannelType: "SEARCH",
      id: "23870042807",
      name: "JDM | Search | Scripts",
      status: "ENABLED",
    },
    metrics: { costMicros: "343640000" },
  },
  {
    campaign: {
      advertisingChannelType: "SEARCH",
      id: "999",
      name: "Specialist",
      status: "PAUSED",
    },
    metrics: { costMicros: "234850000" },
  },
]

const scriptOrderOne = {
  amount_cents: 34950,
  campaignid: "23870042807",
  category: "prescription",
  id: "intake-script-1",
  paid_at: "2026-07-27T01:00:00.000Z",
  payment_status: "partially_refunded",
  refund_amount_cents: 5000,
  stripe_payment_intent_id: "pi_script_1",
  subtype: "repeat",
}

const scriptOrderTwo = {
  amount_cents: 25950,
  campaignid: "23870042807",
  category: "prescription",
  id: "intake-script-2",
  paid_at: "2026-07-15T01:00:00.000Z",
  payment_status: "paid",
  refund_amount_cents: 0,
  stripe_payment_intent_id: "pi_script_2",
  subtype: "repeat",
}

const nameOnlyOrder = {
  amount_cents: 2995,
  campaignid: null,
  category: "prescription",
  id: "intake-name-only",
  paid_at: "2026-07-10T01:00:00.000Z",
  payment_status: "paid",
  refund_amount_cents: 0,
  stripe_payment_intent_id: "pi_name_only",
  subtype: "repeat",
  utm_campaign: "JDM | Search | Scripts",
  utm_medium: "cpc",
  utm_source: "google",
}

function setupHealthyInputs(): void {
  mocks.getAdsAccountState.mockResolvedValue(accountState)
  mocks.getGoogleAdsCampaignRowsForRange.mockImplementation(
    async (range: { startDate: string }) =>
      range.startDate === "2026-07-27" ? dailySpendRows : rollingSpendRows,
  )
  mocks.getLocalGoogleAdsPurchasesForRange.mockImplementation(
    async (_supabase: unknown, range: { startDate: string }) =>
      range.startDate === "2026-07-27"
        ? [scriptOrderOne]
        : [scriptOrderOne, scriptOrderTwo, nameOnlyOrder],
  )
  mocks.getStripeFeeMap.mockResolvedValue(new Map([
    ["intake-script-1", {
      status: "available",
      feeCents: 1500,
      source: "stripe",
    }],
    ["intake-script-2", {
      status: "available",
      feeCents: 1201,
      source: "cache",
    }],
    ["intake-name-only", {
      status: "available",
      feeCents: 100,
      source: "cache",
    }],
  ]))
}

describe("Google Ads Agent snapshot", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    setupHealthyInputs()
  })

  it("reconciles closed Sydney windows with fee-aware campaign-ID economics", async () => {
    const snapshot = await buildAdsAgentSnapshot({
      now: REPORT_NOW,
      supabase: {} as never,
    })

    expect(snapshot.reportDate).toBe("2026-07-27")
    expect(snapshot.windows).toEqual({
      daily: {
        endDate: "2026-07-27",
        endUtcExclusive: "2026-07-27T14:00:00.000Z",
        startDate: "2026-07-27",
        startUtc: "2026-07-26T14:00:00.000Z",
      },
      rolling30: {
        endDate: "2026-07-27",
        endUtcExclusive: "2026-07-27T14:00:00.000Z",
        startDate: "2026-06-28",
        startUtc: "2026-06-27T14:00:00.000Z",
      },
    })

    expect(
      snapshot.rolling30.find(
        (row) => row.campaignId === "23870042807",
      ),
    ).toMatchObject({
      campaignName: "JDM | Search | Scripts",
      campaignStatus: "ENABLED",
      contributionCents: 18835,
      grossRevenueCents: 60900,
      netRetainedRevenueCents: 55900,
      orders: 2,
      refundCents: 5000,
      refundRate: 0.5,
      spendCents: 34364,
      stripeFeeCents: 2701,
    })
    expect(
      snapshot.rolling30.find(
        (row) => row.campaignId === "23870042807",
      )?.contributionMargin,
    ).toBeCloseTo(0.337, 3)

    const unmapped = snapshot.rolling30.find(
      (row) => row.campaignId === "google_ads_unmapped",
    )
    expect(unmapped?.orders).toBe(1)
    expect(unmapped?.campaignName).toBe("Unmapped Google Ads")

    expect(snapshot.totals.rolling30.enabled).toMatchObject({
      contributionCents: 18835,
      spendCents: 34364,
    })
    expect(snapshot.totals.rolling30.paused).toMatchObject({
      contributionCents: -23485,
      spendCents: 23485,
    })
    expect(snapshot.totals.rolling30.enabled.spendCents).not.toBe(
      snapshot.totals.rolling30.paused.spendCents,
    )

    expect(snapshot.account).toMatchObject({
      autoTaggingEnabled: true,
      dailyBudgetTotalCents: 4000,
      finalUrlSuffix: "utm_source=google&utm_medium=cpc",
      lastChangeActor: "a".repeat(64),
    })
    expect(snapshot.account.accountHash).toMatch(/^[a-f0-9]{64}$/)
    expect(snapshot.tracking).toEqual({
      evidenceAsOf: REPORT_NOW.toISOString(),
      reasonCodes: ["TRACKING_HEALTH_NOT_CLASSIFIED"],
      scaleAllowed: false,
      state: "RED",
    })
    expect(Object.values(snapshot.inputs).every(
      (input) => input.status === "fresh",
    )).toBe(true)
  })

  it("represents missing spend as unavailable rather than zero", async () => {
    mocks.getGoogleAdsCampaignRowsForRange.mockRejectedValue(
      new Error("google_ads_unavailable"),
    )

    const snapshot = await buildAdsAgentSnapshot({
      now: REPORT_NOW,
      supabase: {} as never,
    })
    const scripts = snapshot.rolling30.find(
      (row) => row.campaignId === "23870042807",
    )

    expect(scripts).toMatchObject({
      contributionCents: null,
      spendCents: null,
    })
    expect(scripts?.unavailableReasonCodes).toContain("SPEND_UNAVAILABLE")
    expect(snapshot.inputs.googleAdsRolling30.status).toBe("failed")
  })

  it("represents missing local revenue as unavailable rather than zero", async () => {
    mocks.getLocalGoogleAdsPurchasesForRange.mockRejectedValue(
      new Error("supabase_unavailable"),
    )

    const snapshot = await buildAdsAgentSnapshot({
      now: REPORT_NOW,
      supabase: {} as never,
    })
    const scripts = snapshot.rolling30.find(
      (row) => row.campaignId === "23870042807",
    )

    expect(scripts).toMatchObject({
      contributionCents: null,
      grossRevenueCents: null,
      netRetainedRevenueCents: null,
      orders: null,
      refundCents: null,
      stripeFeeCents: null,
    })
    expect(scripts?.unavailableReasonCodes).toContain("REVENUE_UNAVAILABLE")
    expect(snapshot.inputs.localRolling30.status).toBe("failed")
  })

  it("represents an unavailable Stripe fee as unavailable rather than zero", async () => {
    mocks.getStripeFeeMap.mockResolvedValue(new Map([
      ["intake-script-1", {
        status: "unavailable",
        reason: "stripe_fee_lookup_failed",
      }],
      ["intake-script-2", {
        status: "available",
        feeCents: 1201,
        source: "cache",
      }],
      ["intake-name-only", {
        status: "available",
        feeCents: 100,
        source: "cache",
      }],
    ]))

    const snapshot = await buildAdsAgentSnapshot({
      now: REPORT_NOW,
      supabase: {} as never,
    })
    const scripts = snapshot.rolling30.find(
      (row) => row.campaignId === "23870042807",
    )

    expect(scripts).toMatchObject({
      contributionCents: null,
      stripeFeeCents: null,
    })
    expect(scripts?.unavailableReasonCodes).toContain("STRIPE_FEES_UNAVAILABLE")
    expect(snapshot.inputs.stripeFees.status).toBe("failed")
  })
})
