import { describe, expect, it } from "vitest"

import {
  authorizeScriptsBudgetScale,
  authorizeScriptsScaleEligibility,
  evaluateAdsPolicy,
  POLICY,
} from "@/lib/ads-agent/policy"
import type {
  AdsAgentSnapshot,
  AdsService,
  CampaignEconomics,
  CampaignPortfolioEconomics,
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

  it.each(["PAUSED", null])(
    "holds a %s specialty instead of proposing the click-cap pause again",
    (campaignStatus) => {
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
          "CAMPAIGN_ALREADY_PAUSED",
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
