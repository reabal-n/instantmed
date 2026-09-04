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

vi.mock("@/lib/analytics/google-ads-report", async (importOriginal) => ({
  ...(await importOriginal()),
  getGoogleAdsCampaignRowsForRange: mocks.getGoogleAdsCampaignRowsForRange,
  getLocalGoogleAdsPurchasesForRange: mocks.getLocalGoogleAdsPurchasesForRange,
}))

import {
  aggregateAdsOperationalQueueEvidence,
  buildManualGrowthHealthEvidence,
  readAdsOperationalQueueEvidence,
} from "@/lib/ads-agent/operational-health"
import { evaluateAdsPolicy } from "@/lib/ads-agent/policy"
import { buildAdsAgentSnapshot } from "@/lib/ads-agent/snapshot"

const REPORT_NOW = new Date("2026-07-27T23:00:00.000Z")

const scriptsCampaign = {
  resourceName: "customers/1234567890/campaigns/23870042807",
  values: {
    campaign: {
      advertisingChannelType: "SEARCH",
      biddingStrategyType: "MAXIMIZE_CONVERSION_VALUE",
      id: "23870042807",
      maximizeConversionValue: { targetRoas: 1.35 },
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
  metrics: { clicks: "12", costMicros: "10000000" },
}]

const rollingSpendRows = [
  {
    campaign: {
      advertisingChannelType: "SEARCH",
      id: "23870042807",
      name: "JDM | Search | Scripts",
      status: "ENABLED",
    },
    metrics: { clicks: "412", costMicros: "343640000" },
  },
  {
    campaign: {
      advertisingChannelType: "SEARCH",
      id: "999",
      name: "Specialist",
      status: "PAUSED",
    },
    metrics: { clicks: "97", costMicros: "234850000" },
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
  refund_status: "succeeded",
  refunded_at: "2026-07-27T02:00:00.000Z",
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
      manualGrowthHealthEvidence: {
        support: {
          asOf: REPORT_NOW.toISOString(),
          contactsPer100Paid: 2,
          source: "verified_gmail_aggregate",
        },
        clinicalQa: {
          asOf: REPORT_NOW.toISOString(),
          source: "medical_director_completed_review",
          state: "current",
        },
      },
      now: REPORT_NOW,
      operationalQueueReader: async () => ({
        availability: "available",
        services: [{
          affectedService: "scripts",
          availability: "available",
          oldestUnresolvedHours: 1,
          p95ReviewHours: 3,
          review24hBreaches: 0,
        }],
      }),
      serviceOperationalControls: {
        scripts: {
          clinicalIncident: false,
          explicitServiceHold: false,
          fulfilmentHealthy: true,
        },
      },
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
      biddingStrategyType: "MAXIMIZE_CONVERSION_VALUE",
      campaignName: "JDM | Search | Scripts",
      campaignStatus: "ENABLED",
      clicks: 412,
      contributionCents: 18835,
      grossRevenueCents: 60900,
      targetRoas: 1.35,
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
      clicks: 412,
      contributionCents: 18835,
      spendCents: 34364,
    })
    expect(snapshot.totals.rolling30.paused).toMatchObject({
      clicks: 97,
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
    expect(snapshot.operational).toEqual({
      asOf: REPORT_NOW.toISOString(),
      holds: expect.arrayContaining([{
        affectedService: "scripts",
        reasons: ["queue_p95_over_2h_watch"],
        state: "watch",
      }]),
      manualEvidence: {
        support: {
          asOf: REPORT_NOW.toISOString(),
          contactsPer100Paid: 2,
          source: "verified_gmail_aggregate",
        },
        clinicalQa: {
          asOf: REPORT_NOW.toISOString(),
          source: "medical_director_completed_review",
          state: "current",
        },
      },
      queue: expect.objectContaining({ availability: "available" }),
    })
  })

  it.each(["empty", "watch", "unavailable"] as const)(
    "evaluates a production-shaped %s queue without optional evidence rows",
    async (queueState) => {
    const paidRows = Array.from({ length: 12 }, (_, index) => ({
      amount_cents: 2995,
      campaignid: "23870042807",
      category: "prescription",
      id: `intake-profitable-script-${index + 1}`,
      paid_at: "2026-07-15T01:00:00.000Z",
      payment_status: "paid",
      refund_amount_cents: 0,
      stripe_payment_intent_id: `pi_profitable_script_${index + 1}`,
      subtype: "repeat",
    }))
    mocks.getGoogleAdsCampaignRowsForRange.mockResolvedValue([{
      ...dailySpendRows[0],
      metrics: { clicks: "120", costMicros: "100000000" },
    }])
    mocks.getLocalGoogleAdsPurchasesForRange.mockResolvedValue(paidRows)
    mocks.getStripeFeeMap.mockResolvedValue(new Map(paidRows.map((row) => [
      row.id,
      { status: "available", feeCents: 100, source: "stripe" },
    ])))

    function query(table: string) {
      const data = queueState === "watch" && table === "intakes"
        ? [{
            id: "synthetic-queue-script",
            category: "prescription",
            subtype: "repeat",
            status: "approved",
            paid_at: "2026-07-27T01:00:00.000Z",
            payment_status: "paid",
            auto_approval_state: null,
          }]
        : queueState === "watch" && table === "compliance_audit_log"
          ? [{
              intake_id: "synthetic-queue-script",
              created_at: "2026-07-27T05:00:00.000Z",
            }]
          : []
      const result = {
        count: data.length,
        data,
        error: queueState === "unavailable" && table === "intakes"
          ? { message: "temporary database failure" }
          : null,
      }
      const chain: Record<string, ReturnType<typeof vi.fn>>
        & PromiseLike<typeof result> = {
          then: ((resolve: (value: typeof result) => unknown) =>
            Promise.resolve(result).then(resolve)) as never,
        }
      for (const method of [
        "eq",
        "gte",
        "in",
        "limit",
        "lte",
        "not",
        "or",
        "order",
        "select",
      ]) {
        chain[method] = vi.fn(() => chain)
      }
      return chain
    }
    const supabase = { from: vi.fn((table: string) => query(table)) }

    vi.useFakeTimers()
    vi.setSystemTime(REPORT_NOW)
    try {
      const built = await buildAdsAgentSnapshot({ supabase: supabase as never })
      const snapshot = {
        ...built,
        tracking: {
          evidenceAsOf: REPORT_NOW.toISOString(),
          reasonCodes: [],
          scaleAllowed: true,
          state: "GREEN" as const,
        },
      }

      expect(snapshot.operational?.manualEvidence).toEqual({
        support: null,
        clinicalQa: null,
      })
      expect(snapshot.operational?.holds.find(
        ({ affectedService }) => affectedService === "scripts",
      )).toEqual({
        affectedService: "scripts",
        reasons: queueState === "watch" ? ["queue_p95_over_2h_watch"] : [],
        state: queueState === "empty" ? "clear" : queueState,
      })
      expect(evaluateAdsPolicy(snapshot).find(
        ({ service }) => service === "scripts",
      )).toEqual({
        kind: queueState === "unavailable" ? "INVESTIGATE" : "APPROVAL_NEEDED",
        proposedMutationFamily: queueState === "unavailable" ? null : "campaign_budget",
        reasonCodes: queueState === "unavailable"
          ? ["OPERATIONAL_EVIDENCE_UNAVAILABLE"]
          : ["SCRIPTS_SCALE_GATES_PASSED"],
        service: "scripts",
      })
      expect(supabase.from).toHaveBeenCalledWith("operational_metrics")
      expect(supabase.from).toHaveBeenCalledWith("intakes")
    } finally {
      vi.useRealTimers()
    }
  })

  it("counts an old purchase refund by refunded_at without requiring an old purchase fee", async () => {
    const oldPurchaseRefundedToday = {
      amount_cents: 4995,
      campaignid: "23870042807",
      category: "prescription",
      id: "intake-old-refund",
      paid_at: "2026-05-01T01:00:00.000Z",
      payment_status: "partially_refunded",
      refund_amount_cents: 995,
      refund_status: "failed",
      refunded_at: "2026-07-27T02:00:00.000Z",
      stripe_payment_intent_id: "pi_old_refund",
      subtype: "repeat",
    }
    mocks.getLocalGoogleAdsPurchasesForRange.mockResolvedValue([
      oldPurchaseRefundedToday,
    ])
    mocks.getStripeFeeMap.mockResolvedValue(new Map())

    const snapshot = await buildAdsAgentSnapshot({
      now: REPORT_NOW,
      supabase: {} as never,
    })

    expect(snapshot.daily.find(
      (row) => row.campaignId === "23870042807",
    )).toMatchObject({
      grossRevenueCents: 0,
      netRetainedRevenueCents: -995,
      orders: 0,
      refundCents: 995,
      refundedOrders: 1,
      stripeFeeCents: 0,
    })
    expect(mocks.getStripeFeeMap).toHaveBeenCalledWith({
      intakes: [],
      supabase: expect.anything(),
    })
    expect(snapshot.inputs.stripeFees.status).toBe("fresh")
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
      clicks: null,
      contributionCents: null,
      spendCents: null,
    })
    expect(scripts?.unavailableReasonCodes).toContain("SPEND_UNAVAILABLE")
    expect(snapshot.inputs.googleAdsRolling30.status).toBe("failed")
    // The rejection reason must survive into the persisted run. Discarding it
    // is what let the 2026-07-31 account-state break hide for six days.
    expect(snapshot.inputs.googleAdsRolling30.reason).toBe("google_ads_unavailable")
    expect(snapshot.inputs.localRolling30.reason).toBeUndefined()
  })

  it("does not infer a clear queue for a missing service aggregate", async () => {
    const snapshot = await buildAdsAgentSnapshot({
      manualGrowthHealthEvidence: {
        support: {
          asOf: REPORT_NOW.toISOString(),
          contactsPer100Paid: 2,
          source: "verified_gmail_aggregate",
        },
        clinicalQa: {
          asOf: REPORT_NOW.toISOString(),
          source: "medical_director_completed_review",
          state: "current",
        },
      },
      now: REPORT_NOW,
      operationalQueueReader: async () => ({
        availability: "available",
        services: [],
      }),
      supabase: {} as never,
    })

    expect(snapshot.operational?.holds.find(
      ({ affectedService }) => affectedService === "scripts",
    )).toEqual({
      affectedService: "scripts",
      reasons: [],
      state: "unavailable",
    })
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

describe("Google Ads Agent operational queue evidence", () => {
  it("aggregates paid manual-review waits by service without returning row identifiers", () => {
    const now = new Date("2026-09-05T00:00:00.000Z")
    const evidence = aggregateAdsOperationalQueueEvidence({
      clinicianOpens: [
        {
          created_at: "2026-09-04T23:30:00.000Z",
          intake_id: "scripts-opened",
        },
        {
          created_at: "2026-09-04T17:00:00.000Z",
          intake_id: "ed-slow",
        },
        {
          created_at: "2026-09-04T22:00:00.000Z",
          intake_id: "cert-manual",
        },
      ],
      intakes: [
        {
          auto_approval_state: null,
          category: "prescription",
          id: "scripts-opened",
          paid_at: "2026-09-04T23:00:00.000Z",
          payment_status: "paid",
          status: "in_review",
          subtype: "repeat",
        },
        {
          auto_approval_state: null,
          category: "prescription",
          id: "scripts-overdue",
          paid_at: "2026-09-03T23:00:00.000Z",
          payment_status: "paid",
          status: "paid",
          subtype: "repeat",
        },
        {
          auto_approval_state: null,
          category: "consult",
          id: "ed-slow",
          paid_at: "2026-09-04T10:00:00.000Z",
          payment_status: "paid",
          status: "in_review",
          subtype: "ed",
        },
        {
          auto_approval_state: "needs_doctor",
          category: "medical_certificate",
          id: "cert-manual",
          paid_at: "2026-09-04T21:00:00.000Z",
          payment_status: "paid",
          status: "in_review",
          subtype: "work",
        },
        {
          auto_approval_state: "pending",
          category: "medical_certificate",
          id: "cert-clean-protocol-pending",
          paid_at: "2026-09-04T20:00:00.000Z",
          payment_status: "paid",
          status: "paid",
          subtype: "work",
        },
      ],
      now,
    })

    expect(evidence.availability).toBe("available")
    expect(evidence.services).toEqual(expect.arrayContaining([
      {
        affectedService: "scripts",
        availability: "available",
        oldestUnresolvedHours: 25,
        p95ReviewHours: 0.5,
        review24hBreaches: 1,
      },
      {
        affectedService: "ed",
        availability: "available",
        oldestUnresolvedHours: null,
        p95ReviewHours: 7,
        review24hBreaches: 0,
      },
      {
        affectedService: "med_certs",
        availability: "available",
        oldestUnresolvedHours: null,
        p95ReviewHours: 1,
        review24hBreaches: 0,
      },
    ]))
    expect(JSON.stringify(evidence)).not.toContain("scripts-opened")
    expect(JSON.stringify(evidence)).not.toContain("cert-manual")
    expect(JSON.stringify(evidence)).not.toContain("patient")
  })

  it("ignores a pre-payment open and excludes clean certificates awaiting protocol", () => {
    const evidence = aggregateAdsOperationalQueueEvidence({
      clinicianOpens: [{
        created_at: "2026-09-04T19:00:00.000Z",
        intake_id: "scripts-pre-open",
      }, {
        created_at: "2026-09-04T20:00:00.000Z",
        intake_id: "scripts-pre-open",
      }],
      intakes: [
        {
          auto_approval_state: null,
          category: "prescription",
          id: "scripts-pre-open",
          paid_at: "2026-09-04T20:00:00.000Z",
          payment_status: "paid",
          status: "paid",
          subtype: "repeat",
        },
        {
          auto_approval_state: "pending",
          category: "medical_certificate",
          id: "clean-cert",
          paid_at: "2026-09-01T00:00:00.000Z",
          payment_status: "paid",
          status: "paid",
          subtype: "work",
        },
        {
          auto_approval_state: null,
          category: "medical_certificate",
          id: "legacy-manual-cert",
          paid_at: "2026-09-04T18:00:00.000Z",
          payment_status: "paid",
          status: "paid",
          subtype: "work",
        },
      ],
      now: new Date("2026-09-05T00:00:00.000Z"),
    })

    expect(evidence.services.find(({ affectedService }) =>
      affectedService === "scripts")).toMatchObject({
        oldestUnresolvedHours: 4,
        p95ReviewHours: null,
        review24hBreaches: 0,
      })
    expect(evidence.services.find(({ affectedService }) =>
      affectedService === "med_certs")).toMatchObject({
        oldestUnresolvedHours: 6,
        p95ReviewHours: null,
        review24hBreaches: 0,
      })
  })

  it("reads only reportable aggregate inputs and returns no patient or staff identifiers", async () => {
    function query(result: { count: number; data: unknown[]; error: null }) {
      const chain: Record<string, ReturnType<typeof vi.fn>> & PromiseLike<typeof result> = {
        then: ((resolve: (value: typeof result) => unknown) =>
          Promise.resolve(result).then(resolve)) as never,
      }
      for (const method of ["eq", "gte", "in", "limit", "lt", "lte", "not", "or", "order", "select"]) {
        chain[method] = vi.fn(() => chain)
      }
      return chain
    }

    const recent = query({
      count: 1,
      data: [{
        auto_approval_state: null,
        category: "prescription",
        id: "scripts-one",
        paid_at: "2026-09-04T20:00:00.000Z",
        payment_status: "paid",
        status: "paid",
        subtype: "repeat",
      }],
      error: null,
    })
    const unresolved = query({
      count: 1,
      data: [{
        auto_approval_state: null,
        category: "prescription",
        id: "scripts-one",
        paid_at: "2026-09-04T20:00:00.000Z",
        payment_status: "paid",
        status: "paid",
        subtype: "repeat",
      }],
      error: null,
    })
    const audit = query({ count: 0, data: [], error: null })
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "compliance_audit_log") return audit
        return supabase.from.mock.calls.filter(([name]) => name === "intakes").length === 1
          ? recent
          : unresolved
      }),
    }

    const evidence = await readAdsOperationalQueueEvidence(
      supabase as never,
      { now: new Date("2026-09-05T00:00:00.000Z") },
    )

    expect(recent.or).toHaveBeenCalledWith(
      "exclude_from_reporting.is.null,exclude_from_reporting.eq.false",
    )
    expect(recent.not).toHaveBeenCalledWith(
      "patient_id",
      "in",
      expect.any(String),
    )
    expect(recent.in).toHaveBeenCalledWith(
      "payment_status",
      ["paid", "partially_refunded"],
    )
    expect(audit.eq).toHaveBeenCalledWith(
      "event_type",
      "clinician_opened_request",
    )
    expect(audit.eq).toHaveBeenCalledWith("actor_role", "clinician")
    expect(audit.eq).toHaveBeenCalledWith("is_human_action", true)
    expect(audit.select).toHaveBeenCalledWith(
      "intake_id, created_at",
      { count: "exact" },
    )
    expect(audit.in).toHaveBeenCalledWith("intake_id", ["scripts-one"])
    const selectedColumns = [
      ...recent.select.mock.calls,
      ...unresolved.select.mock.calls,
      ...audit.select.mock.calls,
    ].map(([columns]) => String(columns)).join(" ")
    expect(selectedColumns).not.toMatch(/email|name|actor|patient:/i)
    expect(JSON.stringify(evidence)).not.toContain("scripts-one")
  })

  it("fails closed on malformed queue evidence instead of understating waits", () => {
    expect(() => aggregateAdsOperationalQueueEvidence({
      clinicianOpens: [],
      intakes: [{
        auto_approval_state: null,
        category: "prescription",
        id: "",
        paid_at: "not-a-time",
        payment_status: "paid",
        status: "paid",
        subtype: "repeat",
      }],
      now: new Date("2026-09-05T00:00:00.000Z"),
    })).toThrow("ads_operational_queue_malformed")
  })

  it("accepts only the fixed aggregate support and completed-QA sources", () => {
    const evidence = buildManualGrowthHealthEvidence([
      {
        dimensions: {
          reason: "must not escape",
          source: "verified_gmail_aggregate",
        },
        metric_name: "ads_support_contacts_per_100_paid",
        metric_value: 3.2,
        recorded_at: "2026-09-04T00:00:00.000Z",
      },
      {
        dimensions: {
          source: "medical_director_completed_review",
          state: "current",
        },
        metric_name: "ads_completed_clinical_qa_state",
        metric_value: 1,
        recorded_at: "2026-09-04T01:00:00.000Z",
      },
    ])

    expect(evidence).toEqual({
      support: {
        asOf: "2026-09-04T00:00:00.000Z",
        contactsPer100Paid: 3.2,
        source: "verified_gmail_aggregate",
      },
      clinicalQa: {
        asOf: "2026-09-04T01:00:00.000Z",
        source: "medical_director_completed_review",
        state: "current",
      },
    })
    expect(JSON.stringify(evidence)).not.toContain("must not escape")

    expect(buildManualGrowthHealthEvidence([
      {
        dimensions: { source: "self_reported", state: "behind" },
        metric_name: "ads_completed_clinical_qa_state",
        metric_value: 0,
        recorded_at: "2026-09-04T01:00:00.000Z",
      },
    ])).toEqual({ support: null, clinicalQa: null })
  })
})
