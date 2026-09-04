import { describe, expect, it } from "vitest"

import {
  authorizeScriptsBudgetScale,
  authorizeScriptsScaleEligibility,
  evaluateAdsPolicy,
  POLICY,
  resolveAdsOperationalHold,
} from "@/lib/ads-agent/policy"
import type {
  AdsAgentSnapshot,
  AdsOperationalHold,
  AdsService,
  CampaignEconomics,
  CampaignPortfolioEconomics,
  ManualGrowthHealthEvidence,
} from "@/lib/ads-agent/types"

function campaign(
  overrides: Partial<CampaignEconomics> = {},
): CampaignEconomics {
  return {
    campaignId: "23870042807",
    campaignName: "IM | Search | Scripts",
    campaignResourceName: "customers/123/campaigns/23870042807",
    campaignStatus: "ENABLED",
    channel: "SEARCH",
    contributionCents: 24000,
    contributionMargin: 0.4,
    grossRevenueCents: 65000,
    netRetainedRevenueCents: 60000,
    orders: 12,
    refundCents: 5000,
    refundedOrders: 1,
    refundRate: 1 / 12,
    serviceOrders: { scripts: 12 },
    spendCents: 34000,
    stripeFeeCents: 2000,
    unavailableReasonCodes: [],
    ...overrides,
  }
}

type SpecialtyService = Extract<
  AdsService,
  "ed" | "hair_loss" | "womens_health"
>

function specialtyCampaign(
  service: SpecialtyService,
  overrides: Partial<CampaignEconomics> = {},
): CampaignEconomics {
  const names: Record<SpecialtyService, string> = {
    ed: "IM | Search | ED | Pilot",
    hair_loss: "IM | Search | Hair Loss | Pilot",
    womens_health: "IM | Search | Women's Health | Pilot",
  }

  return campaign({
    campaignId: `${service}-pilot`,
    campaignName: names[service],
    campaignResourceName: `customers/123/campaigns/${service}-pilot`,
    clicks: 0,
    contributionCents: -1_000,
    contributionMargin: null,
    grossRevenueCents: 0,
    netRetainedRevenueCents: 0,
    orders: 0,
    refundCents: 0,
    refundedOrders: 0,
    refundRate: null,
    serviceOrders: {},
    spendCents: 1_000,
    stripeFeeCents: 0,
    ...overrides,
  })
}

function portfolio(
  overrides: Partial<CampaignPortfolioEconomics> = {},
): CampaignPortfolioEconomics {
  return {
    campaignCount: 1,
    contributionCents: 24000,
    contributionMargin: 0.4,
    grossRevenueCents: 65000,
    netRetainedRevenueCents: 60000,
    orders: 12,
    refundCents: 5000,
    refundedOrders: 1,
    refundRate: 1 / 12,
    spendCents: 34000,
    stripeFeeCents: 2000,
    unavailableReasonCodes: [],
    ...overrides,
  }
}

function snapshot(
  overrides: Partial<AdsAgentSnapshot> = {},
): AdsAgentSnapshot {
  const scripts = campaign()
  const emptyPortfolio = portfolio({
    campaignCount: 0,
    contributionCents: 0,
    contributionMargin: null,
    grossRevenueCents: 0,
    netRetainedRevenueCents: 0,
    orders: 0,
    refundCents: 0,
    refundedOrders: 0,
    refundRate: null,
    spendCents: 0,
    stripeFeeCents: 0,
  })

  return {
    account: {
      accountHash: "a".repeat(64),
      asOf: "2026-07-28T00:00:00.000Z",
      autoTaggingEnabled: true,
      dailyBudgetTotalCents: 8400,
      finalUrlSuffix: "utm_source=google&utm_medium=cpc",
      lastChangeActor: "b".repeat(64),
      lastChangeAt: "2026-07-27T00:00:00.000Z",
    },
    daily: [scripts],
    generatedAt: "2026-07-28T00:00:00.000Z",
    inputs: {
      accountState: {
        asOf: "2026-07-28T00:00:00.000Z",
        status: "fresh",
      },
    },
    reportDate: "2026-07-27",
    rolling30: [scripts],
    totals: {
      daily: {
        enabled: portfolio(),
        other: emptyPortfolio,
        paused: emptyPortfolio,
      },
      rolling30: {
        enabled: portfolio(),
        other: emptyPortfolio,
        paused: emptyPortfolio,
      },
    },
    tracking: {
      evidenceAsOf: "2026-07-28T00:00:00.000Z",
      reasonCodes: [],
      scaleAllowed: true,
      state: "GREEN",
    },
    windows: {
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
    },
    ...overrides,
  }
}

function recommendationFor(
  recommendations: ReturnType<typeof evaluateAdsPolicy>,
  service: AdsService,
) {
  return recommendations.find((recommendation) => recommendation.service === service)
}

// Most gate tests exercise economics/tracking independently of any future
// code-owned attribution hold. The hold lifecycle has its own block below.
const EMPTY_HOLDS: ReadonlySet<Exclude<AdsService, "account">> = new Set()
const SCRIPTS_HOLD: ReadonlySet<Exclude<AdsService, "account">> =
  new Set(["scripts"])

function evaluatePolicyWithoutHolds(snap: ReturnType<typeof snapshot>) {
  return evaluateAdsPolicy(snap, { openAttributionHolds: EMPTY_HOLDS })
}

describe("Google Ads Agent policy", () => {
  it("pins the campaign constitution and safety limits", () => {
    expect(POLICY.attribution.minimumExpectedServiceOrderShare).toBe(0.90)
    expect(POLICY.scripts.scale.minimumContributionMargin).toBe(0.20)
    expect(POLICY.scripts.scale.maximumRefundRate).toBe(0.10)
    expect(POLICY.scripts.scale.minimumMatureOrders).toBe(10)
    expect(POLICY.scripts.scale.initialTargetRoas).toBe(1.35)
    expect(POLICY.scripts.scale.maximumBudgetStep).toBe(0.50)
    expect(POLICY.scripts.scale.budgetStepTiers).toEqual([
      expect.objectContaining({ name: "positive", maximumBudgetStep: 0.20 }),
      expect.objectContaining({ name: "proven", maximumBudgetStep: 0.35 }),
      expect.objectContaining({ name: "strong", maximumBudgetStep: 0.50 }),
    ])
    expect(POLICY.scripts.scale.observationDaysAfterBidChange).toBe(3)
    expect(POLICY.scripts.scale.minimumOrdersAfterChange).toBe(10)
    expect(POLICY.scripts.scale.targetContributionMargin).toBe(0.30)
    expect(POLICY.ed.pilot.maximumLossCents).toBe(15000)
    expect(POLICY.ed.pilot.investigateClicks).toBe(10)
    expect(POLICY.ed.pilot.pauseProposalClicks).toBe(30)
    expect(POLICY.ed.pilot.maximumDaysStatus).toBe(
      "inactive_requires_campaign_scoped_start",
    )
    expect(POLICY.hairLoss.pilot.maximumLossCents).toBe(15000)
    expect(POLICY.hairLoss.pilot.investigateClicks).toBe(10)
    expect(POLICY.hairLoss.pilot.pauseProposalClicks).toBe(20)
    expect(POLICY.hairLoss.pilot.maximumDaysStatus).toBe(
      "inactive_requires_campaign_scoped_start",
    )
    expect(POLICY.hairLoss.pilot.futureRelaunch).toEqual({
      maximumIncrementalLossCents: 6000,
      maximumIncrementalLossStatus:
        "inactive_requires_campaign_scoped_baseline",
      persistedCheckoutProgressionClicks: 10,
      persistedCheckoutProgressionStatus:
        "inactive_requires_campaign_scoped_progression",
      stopPrecedence: [
        "campaign_scoped_incremental_loss",
        "zero_retained_order_clicks",
        "campaign_scoped_duration",
      ],
    })
    expect(POLICY.womensHealth.dailyBudgetCents).toBe(2000)
    expect(POLICY.womensHealth.pilot.initialCpcCeilingCents).toBe(300)
    expect(POLICY.womensHealth.pilot.investigateClicks).toBe(10)
    expect(POLICY.womensHealth.pilot.maximumLossCents).toBe(15000)
    expect(POLICY.womensHealth.pilot.pauseProposalClicks).toBe(30)
    expect(POLICY.womensHealth.pilot.maximumDaysStatus).toBe(
      "inactive_requires_campaign_scoped_start",
    )
    expect(POLICY.keywords.medicineNamesAllowed).toBe(false)
  })

  it("earns progressively larger budget steps from measured contribution", () => {
    const eligible = (orders: number, contributionMargin: number) =>
      authorizeScriptsScaleEligibility(campaign({
        contributionMargin,
        orders,
        refundRate: 0,
        serviceOrders: { scripts: orders },
      })).name

    expect(eligible(10, 0.20)).toBe("positive")
    expect(eligible(30, 0.30)).toBe("proven")
    expect(eligible(50, 0.40)).toBe("strong")
  })

  it("binds a strong Scripts step to tROAS, economics, and post-change proof", () => {
    const strong = campaign({
      biddingStrategyType: "MAXIMIZE_CONVERSION_VALUE",
      budgetAmountMicros: 40_000_000,
      budgetResourceName: "customers/123/campaignBudgets/789",
      contributionCents: 114_321,
      contributionMargin: 0.5068,
      netRetainedRevenueCents: 225_590,
      orders: 75,
      refundCents: 0,
      refundedOrders: 0,
      refundRate: 0,
      serviceOrders: { scripts: 75 },
      spendCents: 103_956,
      stripeFeeCents: 7_313,
      targetRoas: 1.35,
    })
    const authorized = authorizeScriptsBudgetScale({
      campaign: strong,
      closedDaysAfterPreviousChange: 3,
      expectedMicros: 40_000_000,
      nextMicros: 57_000_000,
      ordersAfterPreviousChange: 10,
    })
    expect(authorized.tier).toBe("strong")
    expect(authorized.maximumNextMicros).toBeGreaterThan(57_000_000)
    expect(authorized.maximumNextMicros).toBeLessThan(60_000_000)

    expect(() => authorizeScriptsBudgetScale({
      campaign: strong,
      closedDaysAfterPreviousChange: 3,
      expectedMicros: 40_000_000,
      nextMicros: 60_000_000,
      ordersAfterPreviousChange: 10,
    })).toThrow("scripts_budget_authorization_exceeded")
    expect(() => authorizeScriptsBudgetScale({
      campaign: strong,
      closedDaysAfterPreviousChange: 2,
      expectedMicros: 40_000_000,
      nextMicros: 48_000_000,
      ordersAfterPreviousChange: 12,
    })).toThrow("scripts_post_change_evidence_immature")
    expect(() => authorizeScriptsBudgetScale({
      campaign: strong,
      closedDaysAfterPreviousChange: 3,
      expectedMicros: 40_000_000,
      nextMicros: 48_000_000,
      ordersAfterPreviousChange: 9,
    })).toThrow("scripts_post_change_evidence_immature")
    expect(() => authorizeScriptsBudgetScale({
      campaign: { ...strong, targetRoas: null },
      expectedMicros: 40_000_000,
      nextMicros: 48_000_000,
    })).toThrow("scripts_troas_floor_missing")
    expect(() => authorizeScriptsBudgetScale({
      campaign: {
        ...strong,
        serviceOrders: { med_certs: 10, scripts: 65 },
      },
      expectedMicros: 40_000_000,
      nextMicros: 48_000_000,
    })).toThrow("scripts_scale_attribution_contaminated")
  })

  it("blocks scale proposals whenever tracking is not GREEN", () => {
    const recommendations = evaluatePolicyWithoutHolds(snapshot({
      tracking: {
        evidenceAsOf: "2026-07-28T00:00:00.000Z",
        reasonCodes: ["GOOGLE_DIAGNOSTICS_LAGGING"],
        scaleAllowed: false,
        state: "AMBER",
      },
    }))

    expect(recommendationFor(recommendations, "scripts")).toEqual({
      kind: "HOLD",
      proposedMutationFamily: null,
      reasonCodes: ["TRACKING_NOT_GREEN"],
      service: "scripts",
    })
    expect(recommendations).not.toContainEqual(
      expect.objectContaining({ kind: "APPROVAL_NEEDED", service: "scripts" }),
    )
  })

  it("moves from the tROAS guard to a budget proposal once the live floor exists", () => {
    const scripts = campaign({
      biddingStrategyType: "MAXIMIZE_CONVERSION_VALUE",
      contributionMargin: 0.51,
      orders: 75,
      targetRoas: 1.35,
    })
    const recommendations = evaluatePolicyWithoutHolds(snapshot({
      daily: [scripts],
      rolling30: [scripts],
    }))

    expect(recommendationFor(recommendations, "scripts")).toEqual({
      kind: "APPROVAL_NEEDED",
      proposedMutationFamily: "campaign_budget",
      reasonCodes: ["SCRIPTS_SCALE_GATES_PASSED"],
      service: "scripts",
    })
  })

  it("holds Scripts when the refund gate is breached", () => {
    const scripts = campaign({
      refundedOrders: 2,
      refundRate: 2 / 12,
    })
    const recommendations = evaluatePolicyWithoutHolds(snapshot({
      daily: [scripts],
      rolling30: [scripts],
    }))

    expect(recommendationFor(recommendations, "scripts")).toEqual({
      kind: "HOLD",
      proposedMutationFamily: null,
      reasonCodes: ["SCRIPTS_REFUND_GATE"],
      service: "scripts",
    })
  })

  it("requires exact approval to pause a specialty at its loss cap", () => {
    const hairLoss = campaign({
      campaignId: "hair-loss-pilot",
      campaignName: "IM | Search | Hair Loss | Pilot",
      campaignResourceName: "customers/123/campaigns/hair-loss-pilot",
      contributionCents: -15000,
      contributionMargin: -3,
      grossRevenueCents: 4995,
      netRetainedRevenueCents: 4995,
      orders: 1,
      refundCents: 0,
      refundedOrders: 0,
      refundRate: 0,
      serviceOrders: { hair_loss: 1 },
      spendCents: 18881,
      stripeFeeCents: 114,
    })
    const recommendations = evaluatePolicyWithoutHolds(snapshot({
      daily: [hairLoss],
      rolling30: [hairLoss],
    }))

    expect(recommendationFor(recommendations, "hair_loss")).toEqual({
      kind: "APPROVAL_NEEDED",
      proposedMutationFamily: "campaign_status",
      reasonCodes: ["SPECIALTY_LOSS_CAP"],
      service: "hair_loss",
    })
  })

  it.each([
    { service: "hair_loss", clicks: 9 },
    { service: "ed", clicks: 9 },
    { service: "womens_health", clicks: 9 },
  ] satisfies Array<{ service: SpecialtyService; clicks: number }>)(
    "keeps $service quiet below the zero-order investigation boundary",
    ({ service, clicks }) => {
      const result = recommendationFor(evaluatePolicyWithoutHolds(snapshot({
        rolling30: [specialtyCampaign(service, { clicks })],
      })), service)

      expect(result).toEqual({
        kind: "HOLD",
        proposedMutationFamily: null,
        reasonCodes: ["PILOT_WITHIN_LOSS_CAP"],
        service,
      })
    },
  )

  it("holds a not-enabled specialty in the investigation band with a truthful reason", () => {
    const result = recommendationFor(evaluatePolicyWithoutHolds(snapshot({
      rolling30: [specialtyCampaign("hair_loss", {
        campaignStatus: null,
        clicks: 10,
      })],
    })), "hair_loss")

    expect(result).toEqual({
      kind: "HOLD",
      proposedMutationFamily: null,
      reasonCodes: ["PILOT_WITHIN_LOSS_CAP", "CAMPAIGN_NOT_ENABLED"],
      service: "hair_loss",
    })
  })

  it.each([
    { service: "hair_loss", clicks: 10 },
    { service: "ed", clicks: 10 },
    { service: "womens_health", clicks: 10 },
  ] satisfies Array<{ service: SpecialtyService; clicks: number }>)(
    "investigates $service at 10 clicks with zero retained orders",
    ({ service, clicks }) => {
      const result = recommendationFor(evaluatePolicyWithoutHolds(snapshot({
        rolling30: [specialtyCampaign(service, { clicks })],
      })), service)

      expect(result).toEqual({
        kind: "INVESTIGATE",
        proposedMutationFamily: null,
        reasonCodes: ["SPECIALTY_ZERO_ORDER_CLICK_INVESTIGATION"],
        service,
      })
    },
  )

  it.each([
    { service: "hair_loss", before: 19, threshold: 20 },
    { service: "ed", before: 29, threshold: 30 },
    { service: "womens_health", before: 29, threshold: 30 },
  ] satisfies Array<{
    service: SpecialtyService
    before: number
    threshold: number
  }>)(
    "keeps $service under investigation at $before clicks and proposes a pause at $threshold",
    ({ service, before, threshold }) => {
      const beforeResult = recommendationFor(
        evaluatePolicyWithoutHolds(snapshot({
          rolling30: [specialtyCampaign(service, { clicks: before })],
        })),
        service,
      )
      const thresholdResult = recommendationFor(
        evaluatePolicyWithoutHolds(snapshot({
          rolling30: [specialtyCampaign(service, { clicks: threshold })],
        })),
        service,
      )

      expect(beforeResult).toEqual({
        kind: "INVESTIGATE",
        proposedMutationFamily: null,
        reasonCodes: ["SPECIALTY_ZERO_ORDER_CLICK_INVESTIGATION"],
        service,
      })
      expect(thresholdResult).toEqual({
        kind: "APPROVAL_NEEDED",
        proposedMutationFamily: "campaign_status",
        reasonCodes: ["SPECIALTY_ZERO_ORDER_CLICK_CAP"],
        service,
      })
    },
  )

  it.each([
    { service: "hair_loss", clicks: 10 },
    { service: "hair_loss", clicks: 19 },
    { service: "ed", clicks: 10 },
    { service: "ed", clicks: 29 },
    { service: "womens_health", clicks: 10 },
    { service: "womens_health", clicks: 29 },
  ] satisfies Array<{ service: SpecialtyService; clicks: number }>)(
    "holds paused $service at $clicks clicks instead of opening an investigation",
    ({ service, clicks }) => {
      const result = recommendationFor(evaluatePolicyWithoutHolds(snapshot({
        rolling30: [specialtyCampaign(service, {
          campaignStatus: "PAUSED",
          clicks,
        })],
      })), service)

      expect(result).toEqual({
        kind: "HOLD",
        proposedMutationFamily: null,
        reasonCodes: [
          "PILOT_WITHIN_LOSS_CAP",
          "CAMPAIGN_ALREADY_PAUSED",
        ],
        service,
      })
    },
  )

  it("turns the observed Hair 40-click zero-order loss into an exact pause recommendation", () => {
    const hairLoss = specialtyCampaign("hair_loss", {
      clicks: 40,
      contributionCents: -12_075,
      spendCents: 12_075,
    })
    const recommendations = evaluatePolicyWithoutHolds(snapshot({
      rolling30: [hairLoss],
    }))

    expect(recommendationFor(recommendations, "hair_loss")).toEqual({
      kind: "APPROVAL_NEEDED",
      proposedMutationFamily: "campaign_status",
      reasonCodes: ["SPECIALTY_ZERO_ORDER_CLICK_CAP"],
      service: "hair_loss",
    })
  })

  it("does not apply zero-order click gates to a specialty with a retained order", () => {
    const hairLoss = specialtyCampaign("hair_loss", {
      clicks: 40,
      contributionCents: -1_000,
      grossRevenueCents: 4_995,
      netRetainedRevenueCents: 4_995,
      orders: 1,
      refundRate: 0,
      serviceOrders: { hair_loss: 1 },
      spendCents: 5_881,
      stripeFeeCents: 114,
    })

    expect(recommendationFor(evaluatePolicyWithoutHolds(snapshot({
      rolling30: [hairLoss],
    })), "hair_loss")).toEqual({
      kind: "HOLD",
      proposedMutationFamily: null,
      reasonCodes: ["PILOT_WITHIN_LOSS_CAP"],
      service: "hair_loss",
    })
  })

  it("lets the generic lifetime loss cap beat a zero-order click gate", () => {
    const hairLoss = specialtyCampaign("hair_loss", {
      clicks: 40,
      contributionCents: -15_000,
      spendCents: 15_000,
    })

    expect(recommendationFor(evaluatePolicyWithoutHolds(snapshot({
      rolling30: [hairLoss],
    })), "hair_loss")).toEqual({
      kind: "APPROVAL_NEEDED",
      proposedMutationFamily: "campaign_status",
      reasonCodes: ["SPECIALTY_LOSS_CAP"],
      service: "hair_loss",
    })
  })

  it.each([
    { campaignStatus: "PAUSED", statusReason: "CAMPAIGN_ALREADY_PAUSED" },
    { campaignStatus: null, statusReason: "CAMPAIGN_NOT_ENABLED" },
  ])(
    "holds a $campaignStatus specialty instead of proposing the click-cap pause again",
    ({ campaignStatus, statusReason }) => {
      const hairLoss = specialtyCampaign("hair_loss", {
        campaignStatus,
        clicks: 40,
        contributionCents: -12_075,
        spendCents: 12_075,
      })

      expect(recommendationFor(evaluatePolicyWithoutHolds(snapshot({
        rolling30: [hairLoss],
      })), "hair_loss")).toEqual({
        kind: "HOLD",
        proposedMutationFamily: null,
        reasonCodes: [
          "SPECIALTY_ZERO_ORDER_CLICK_CAP",
          statusReason,
        ],
        service: "hair_loss",
      })
    },
  )

  it("investigates missing zero-order click evidence instead of fabricating zero", () => {
    const hairLoss = specialtyCampaign("hair_loss", { clicks: null })

    expect(recommendationFor(evaluatePolicyWithoutHolds(snapshot({
      rolling30: [hairLoss],
    })), "hair_loss")).toEqual({
      kind: "INVESTIGATE",
      proposedMutationFamily: null,
      reasonCodes: ["SPECIALTY_CLICK_EVIDENCE_UNAVAILABLE"],
      service: "hair_loss",
    })
  })

  it("keeps economics and outer tracking gates ahead of specialty click gates", () => {
    const unavailable = specialtyCampaign("hair_loss", {
      clicks: 40,
      contributionCents: null,
      spendCents: null,
      unavailableReasonCodes: ["SPEND_UNAVAILABLE"],
    })
    expect(recommendationFor(evaluatePolicyWithoutHolds(snapshot({
      rolling30: [unavailable],
    })), "hair_loss")).toEqual({
      kind: "INVESTIGATE",
      proposedMutationFamily: null,
      reasonCodes: ["ECONOMICS_UNAVAILABLE"],
      service: "hair_loss",
    })

    const trackingBlocked = snapshot({
      rolling30: [unavailable],
      tracking: {
        evidenceAsOf: "2026-07-28T00:00:00.000Z",
        reasonCodes: ["GOOGLE_DIAGNOSTICS_LAGGING"],
        scaleAllowed: false,
        state: "AMBER",
      },
    })
    expect(recommendationFor(evaluatePolicyWithoutHolds(trackingBlocked), "hair_loss")).toEqual({
      kind: "HOLD",
      proposedMutationFamily: null,
      reasonCodes: ["TRACKING_NOT_GREEN"],
      service: "hair_loss",
    })
  })

  it("does not infer a duration or persisted-checkout stop from a rolling window", () => {
    const hairLoss = specialtyCampaign("hair_loss", { clicks: 9 })
    const oldRollingWindow = snapshot({
      generatedAt: "2026-08-28T00:00:00.000Z",
      rolling30: [hairLoss],
      windows: {
        ...snapshot().windows,
        rolling30: {
          endDate: "2026-08-27",
          endUtcExclusive: "2026-08-27T14:00:00.000Z",
          startDate: "2026-07-01",
          startUtc: "2026-06-30T14:00:00.000Z",
        },
      },
    })

    expect(recommendationFor(evaluatePolicyWithoutHolds(oldRollingWindow), "hair_loss")).toEqual({
      kind: "HOLD",
      proposedMutationFamily: null,
      reasonCodes: ["PILOT_WITHIN_LOSS_CAP"],
      service: "hair_loss",
    })
  })

  it("returns at most one material recommendation per campaign service", () => {
    const recommendations = evaluatePolicyWithoutHolds(snapshot())

    for (const service of new Set(recommendations.map(({ service }) => service))) {
      expect(
        recommendations.filter((recommendation) => recommendation.service === service),
      ).toHaveLength(1)
    }
    expect(recommendationFor(recommendations, "scripts")).toMatchObject({
      kind: "APPROVAL_NEEDED",
      proposedMutationFamily: "campaign_bidding",
    })
  })

  it("does not let one immaterial foreign order freeze a strongly pure campaign", () => {
    const scripts = campaign({
      orders: 49,
      refundedOrders: 1,
      refundRate: 1 / 49,
      serviceOrders: { ed: 1, scripts: 48 },
    })
    const recommendations = evaluatePolicyWithoutHolds(snapshot({
      daily: [scripts],
      rolling30: [scripts],
    }))

    expect(recommendationFor(recommendations, "scripts")).toEqual({
      kind: "APPROVAL_NEEDED",
      proposedMutationFamily: "campaign_bidding",
      reasonCodes: ["SCRIPTS_SCALE_GATES_PASSED"],
      service: "scripts",
    })
  })

  it("keeps the exact 90 percent service-purity boundary actionable", () => {
    const scripts = campaign({
      orders: 20,
      refundedOrders: 0,
      refundRate: 0,
      serviceOrders: { ed: 2, scripts: 18 },
    })
    const recommendations = evaluatePolicyWithoutHolds(snapshot({
      daily: [scripts],
      rolling30: [scripts],
    }))

    expect(recommendationFor(recommendations, "scripts")).toEqual({
      kind: "APPROVAL_NEEDED",
      proposedMutationFamily: "campaign_bidding",
      reasonCodes: ["SCRIPTS_SCALE_GATES_PASSED"],
      service: "scripts",
    })
  })

  it("investigates material cross-service attribution before economic action", () => {
    const scripts = campaign({
      orders: 10,
      refundedOrders: 0,
      refundRate: 0,
      serviceOrders: { ed: 2, scripts: 8 },
    })
    const recommendations = evaluatePolicyWithoutHolds(snapshot({
      daily: [scripts],
      rolling30: [scripts],
    }))

    expect(recommendationFor(recommendations, "scripts")).toEqual({
      kind: "INVESTIGATE",
      proposedMutationFamily: null,
      reasonCodes: ["CROSS_SERVICE_ATTRIBUTION"],
      service: "scripts",
    })
  })

  it("does not let positive Scripts totals hide a losing specialty", () => {
    const scripts = campaign({
      contributionCents: 30000,
      contributionMargin: 0.5,
    })
    const ed = campaign({
      campaignId: "ed-pilot",
      campaignName: "IM | Search | ED | Pilot",
      campaignResourceName: "customers/123/campaigns/ed-pilot",
      contributionCents: -15000,
      contributionMargin: null,
      grossRevenueCents: 0,
      netRetainedRevenueCents: 0,
      orders: 0,
      refundCents: 0,
      refundedOrders: 0,
      refundRate: null,
      serviceOrders: {},
      spendCents: 15000,
      stripeFeeCents: 0,
    })
    const recommendations = evaluatePolicyWithoutHolds(snapshot({
      daily: [scripts, ed],
      rolling30: [scripts, ed],
      totals: {
        daily: {
          enabled: portfolio({
            campaignCount: 2,
            contributionCents: 15000,
          }),
          other: portfolio({ campaignCount: 0 }),
          paused: portfolio({ campaignCount: 0 }),
        },
        rolling30: {
          enabled: portfolio({
            campaignCount: 2,
            contributionCents: 15000,
          }),
          other: portfolio({ campaignCount: 0 }),
          paused: portfolio({ campaignCount: 0 }),
        },
      },
    }))

    expect(recommendationFor(recommendations, "ed")).toMatchObject({
      kind: "APPROVAL_NEEDED",
      reasonCodes: ["SPECIALTY_LOSS_CAP"],
    })
  })

  it("does not turn an old portfolio budget number into a hidden growth cap", () => {
    const recommendations = evaluatePolicyWithoutHolds(snapshot({
      account: {
        ...snapshot().account,
        dailyBudgetTotalCents: 10001,
      },
    }))

    expect(recommendationFor(recommendations, "account")).toBeUndefined()
    expect(recommendationFor(recommendations, "scripts")).toBeDefined()
  })

  it("holds negative medical-certificate contribution independently", () => {
    const medCerts = campaign({
      campaignId: "med-certs",
      campaignName: "JDM | Search | Med Certs",
      campaignResourceName: "customers/123/campaigns/med-certs",
      contributionCents: -1050,
      contributionMargin: -0.026,
      serviceOrders: { med_certs: 14 },
    })
    const recommendations = evaluatePolicyWithoutHolds(snapshot({
      daily: [medCerts],
      rolling30: [medCerts],
    }))

    expect(recommendationFor(recommendations, "med_certs")).toEqual({
      kind: "HOLD",
      proposedMutationFamily: null,
      reasonCodes: ["MEDCERT_NEGATIVE_CONTRIBUTION"],
      service: "med_certs",
    })
  })
})

describe("Attribution Investigation Holds (code-owned, durable)", () => {
  it("an injected hold wins over a fully green Scripts scale path", () => {
    const recommendations = evaluateAdsPolicy(snapshot(), {
      openAttributionHolds: SCRIPTS_HOLD,
    })
    expect(recommendationFor(recommendations, "scripts")).toEqual({
      kind: "INVESTIGATE",
      proposedMutationFamily: null,
      reasonCodes: ["ATTRIBUTION_INVESTIGATION_HOLD"],
      service: "scripts",
    })
  })

  it("an injected hold stays visible even when no campaign maps", () => {
    const recommendations = evaluateAdsPolicy(snapshot({ rolling30: [] }), {
      openAttributionHolds: SCRIPTS_HOLD,
    })
    expect(recommendationFor(recommendations, "scripts")).toEqual({
      kind: "INVESTIGATE",
      proposedMutationFamily: null,
      reasonCodes: ["ATTRIBUTION_INVESTIGATION_HOLD"],
      service: "scripts",
    })
  })

  it("the recorded Scripts resolution restores ordinary gate evaluation", () => {
    const cleared = evaluateAdsPolicy(snapshot())
    expect(recommendationFor(cleared, "scripts")?.reasonCodes).toEqual([
      "SCRIPTS_SCALE_GATES_PASSED",
    ])
  })
})

describe("operational growth holds", () => {
  const now = new Date("2026-09-05T00:00:00.000Z")
  const freshManualEvidence: ManualGrowthHealthEvidence = {
    support: {
      asOf: "2026-09-04T00:00:00.000Z",
      contactsPer100Paid: 2,
      source: "verified_gmail_aggregate",
    },
    clinicalQa: {
      asOf: "2026-09-04T00:00:00.000Z",
      source: "medical_director_completed_review",
      state: "current",
    },
  }

  function operational(
    overrides: Partial<Parameters<typeof resolveAdsOperationalHold>[0]> = {},
  ): AdsOperationalHold {
    return resolveAdsOperationalHold({
      affectedService: "scripts",
      clinicalIncident: false,
      explicitServiceHold: false,
      fulfilmentHealthy: true,
      manualEvidence: freshManualEvidence,
      now,
      operationalControlEvidenceAvailable: true,
      queue: {
        availability: "available",
        oldestUnresolvedHours: 1,
        p95ReviewHours: 1.5,
        review24hBreaches: 0,
      },
      ...overrides,
    })
  }

  it("keeps the two-hour target as watch without cancelling a bounded test", () => {
    const watch = operational({
      queue: {
        availability: "available",
        oldestUnresolvedHours: 4,
        p95ReviewHours: 3.5,
        review24hBreaches: 0,
      },
    })

    expect(watch).toEqual({
      affectedService: "scripts",
      reasons: ["queue_p95_over_2h_watch"],
      state: "watch",
    })

    const recommendations = evaluatePolicyWithoutHolds(snapshot({
      operational: {
        asOf: now.toISOString(),
        holds: [watch],
        manualEvidence: freshManualEvidence,
        queue: { availability: "available", services: [] },
      },
    }))
    expect(recommendationFor(recommendations, "scripts")).toEqual({
      kind: "INVESTIGATE",
      proposedMutationFamily: null,
      reasonCodes: ["QUEUE_P95_OVER_2H_WATCH"],
      service: "scripts",
    })
  })

  it("uses hold over unavailable and watch at the genuine stop boundaries", () => {
    const result = operational({
      manualEvidence: { support: null, clinicalQa: null },
      queue: {
        availability: "available",
        oldestUnresolvedHours: 20,
        p95ReviewHours: 6,
        review24hBreaches: 1,
      },
    })

    expect(result.state).toBe("hold")
    expect(result.reasons).toEqual(expect.arrayContaining([
      "queue_p95_at_or_over_6h",
      "queue_oldest_at_or_over_20h",
      "queue_24h_breach",
      "support_evidence_unavailable",
      "clinical_qa_evidence_unavailable",
    ]))

    const recommendations = evaluatePolicyWithoutHolds(snapshot({
      operational: {
        asOf: now.toISOString(),
        holds: [result],
        manualEvidence: freshManualEvidence,
        queue: { availability: "available", services: [] },
      },
    }))
    expect(recommendationFor(recommendations, "scripts")).toEqual({
      kind: "APPROVAL_NEEDED",
      proposedMutationFamily: "campaign_status",
      reasonCodes: expect.arrayContaining([
        "QUEUE_P95_AT_OR_OVER_6H",
        "QUEUE_OLDEST_AT_OR_OVER_20H",
        "QUEUE_24H_BREACH",
      ]),
      service: "scripts",
    })
  })

  it("treats stale manual evidence as unavailable, not a pause", () => {
    const unavailable = operational({
      manualEvidence: {
        support: {
          asOf: "2026-08-28T23:59:59.999Z",
          contactsPer100Paid: 1,
          source: "verified_gmail_aggregate",
        },
        clinicalQa: freshManualEvidence.clinicalQa,
      },
      queue: {
        availability: "available",
        oldestUnresolvedHours: 2,
        p95ReviewHours: 3,
        review24hBreaches: 0,
      },
    })

    expect(unavailable).toEqual({
      affectedService: "scripts",
      reasons: [
        "support_evidence_unavailable",
        "queue_p95_over_2h_watch",
      ],
      state: "unavailable",
    })
    const recommendation = recommendationFor(
      evaluatePolicyWithoutHolds(snapshot({
        operational: {
          asOf: now.toISOString(),
          holds: [unavailable],
          manualEvidence: freshManualEvidence,
          queue: { availability: "available", services: [] },
        },
      })),
      "scripts",
    )
    expect(recommendation).toMatchObject({
      kind: "INVESTIGATE",
      proposedMutationFamily: null,
    })
  })

  it("names unavailable queue evidence instead of emitting an empty reason", () => {
    const unavailable = operational({
      queue: {
        availability: "unavailable",
        oldestUnresolvedHours: null,
        p95ReviewHours: null,
        review24hBreaches: null,
      },
    })

    expect(unavailable).toEqual({
      affectedService: "scripts",
      reasons: [],
      state: "unavailable",
    })
    expect(recommendationFor(
      evaluatePolicyWithoutHolds(snapshot({
        operational: {
          asOf: now.toISOString(),
          holds: [unavailable],
          manualEvidence: freshManualEvidence,
          queue: { availability: "unavailable", services: [] },
        },
      })),
      "scripts",
    )).toEqual({
      kind: "INVESTIGATE",
      proposedMutationFamily: null,
      reasonCodes: ["OPERATIONAL_EVIDENCE_UNAVAILABLE"],
      service: "scripts",
    })
  })

  it("treats missing incident, service-hold, or fulfilment evidence as unavailable", () => {
    expect(operational({
      operationalControlEvidenceAvailable: false,
    })).toEqual({
      affectedService: "scripts",
      reasons: [],
      state: "unavailable",
    })
  })

  it("holds only on fresh support or completed-QA evidence, never qa_sampled", () => {
    expect(operational({
      manualEvidence: {
        ...freshManualEvidence,
        support: {
          ...freshManualEvidence.support!,
          contactsPer100Paid: 5.01,
        },
      },
    })).toMatchObject({
      reasons: expect.arrayContaining(["support_over_5_per_100"]),
      state: "hold",
    })
    expect(operational({
      manualEvidence: {
        ...freshManualEvidence,
        clinicalQa: {
          ...freshManualEvidence.clinicalQa!,
          state: "behind",
        },
      },
    })).toMatchObject({
      reasons: expect.arrayContaining(["clinical_qa_lag"]),
      state: "hold",
    })
  })

  it.each([
    ["clinicalIncident", "clinical_incident"],
    ["explicitServiceHold", "explicit_service_hold"],
    ["fulfilmentHealthy", "fulfilment_unhealthy"],
  ] as const)("turns %s into a hard hold", (field, reason) => {
    const result = operational({
      [field]: field === "fulfilmentHealthy" ? false : true,
    })
    expect(result).toMatchObject({
      reasons: expect.arrayContaining([reason]),
      state: "hold",
    })
  })

  it("rejects future-dated manual evidence as unavailable", () => {
    expect(operational({
      manualEvidence: {
        support: {
          ...freshManualEvidence.support!,
          asOf: "2026-09-05T00:00:00.001Z",
        },
        clinicalQa: freshManualEvidence.clinicalQa,
      },
    })).toMatchObject({
      reasons: expect.arrayContaining(["support_evidence_unavailable"]),
      state: "unavailable",
    })
  })

  it("does not let missing operations evidence hide a reached loss-cap pause", () => {
    const ed = specialtyCampaign("ed", {
      clicks: 31,
      contributionCents: -15_000,
      spendCents: 15_000,
    })
    const recommendations = evaluatePolicyWithoutHolds(snapshot({
      daily: [ed],
      operational: {
        asOf: now.toISOString(),
        holds: [{
          affectedService: "ed",
          reasons: ["support_evidence_unavailable"],
          state: "unavailable",
        }],
        manualEvidence: freshManualEvidence,
        queue: { availability: "available", services: [] },
      },
      rolling30: [ed],
    }))

    expect(recommendationFor(recommendations, "ed")).toEqual({
      kind: "APPROVAL_NEEDED",
      proposedMutationFamily: "campaign_status",
      reasonCodes: ["SPECIALTY_LOSS_CAP"],
      service: "ed",
    })
  })

  it("lets a hard operational hold outrank an attribution investigation", () => {
    const hardHold = operational({ clinicalIncident: true })
    const recommendations = evaluateAdsPolicy(snapshot({
      operational: {
        asOf: now.toISOString(),
        holds: [hardHold],
        manualEvidence: freshManualEvidence,
        queue: { availability: "available", services: [] },
      },
    }), {
      openAttributionHolds: new Set(["scripts"]),
    })

    expect(recommendationFor(recommendations, "scripts")).toEqual({
      kind: "APPROVAL_NEEDED",
      proposedMutationFamily: "campaign_status",
      reasonCodes: ["CLINICAL_INCIDENT"],
      service: "scripts",
    })
  })
})
