import { describe, expect, it } from "vitest"

import { buildBusinessReadModel } from "@/lib/admin/business-read-model"
import type { DeliveredAdsAgentRunEvidence } from "@/lib/ads-agent/runs"
import type { AdsAgentSnapshot, AdsRecommendation, CampaignEconomics } from "@/lib/ads-agent/types"

const NOW = new Date("2026-07-29T00:00:00.000Z")

function campaign(overrides: Partial<CampaignEconomics> = {}): CampaignEconomics {
  return {
    campaignId: "1",
    campaignName: "Med certs",
    campaignResourceName: "customers/1/campaigns/1",
    campaignStatus: "ENABLED",
    channel: "SEARCH",
    contributionCents: 6_000,
    contributionMargin: 0.3,
    grossRevenueCents: 25_000,
    netRetainedRevenueCents: 20_000,
    orders: 10,
    refundCents: 5_000,
    refundedOrders: 2,
    refundRate: 0.2,
    serviceOrders: { med_certs: 10 },
    spendCents: 12_000,
    stripeFeeCents: 2_000,
    unavailableReasonCodes: [],
    ...overrides,
  }
}

function evidence(args: {
  deliveredAt?: string
  recommendations?: AdsRecommendation[]
  rolling30?: CampaignEconomics[]
  trackingState?: "AMBER" | "GREEN" | "RED"
} = {}): DeliveredAdsAgentRunEvidence {
  const trackingState = args.trackingState ?? "GREEN"
  const snapshot = {
    generatedAt: "2026-07-28T23:30:00.000Z",
    reportDate: "2026-07-29",
    rolling30: args.rolling30 ?? [campaign()],
    tracking: {
      evidenceAsOf: "2026-07-28T23:00:00.000Z",
      reasonCodes: [],
      scaleAllowed: trackingState === "GREEN",
      state: trackingState,
    },
  } as unknown as AdsAgentSnapshot

  return {
    deliveredAt: args.deliveredAt ?? "2026-07-28T23:30:00.000Z",
    id: "run-1",
    recommendations: args.recommendations ?? [],
    reportDate: "2026-07-29",
    snapshot,
  }
}

const revenue = {
  availability: "available" as const,
  generatedAt: NOW.toISOString(),
  netRetainedCents: 260_535,
  paidOrders: 94,
}

describe("buildBusinessReadModel", () => {
  it("computes fee-aware contribution from delivered evidence and preserves approval semantics", () => {
    const model = buildBusinessReadModel({
      adsRun: {
        availability: "available",
        reason: null,
        run: evidence({
          recommendations: [{
            kind: "APPROVAL_NEEDED",
            proposedMutationFamily: "campaign_budget",
            reasonCodes: ["MEDCERT_SCALE_READY"],
            service: "med_certs",
          }],
        }),
      },
      now: NOW,
      revenue,
    })

    expect(model.scaleDecision).toBe("ACTION")
    expect(model.economics).toEqual({
      adsNetRetainedCents: 20_000,
      clicksTotal: null,
      cpaCents: 1_200,
      cpcCents: null,
      firstOrderContributionCents: 6_000,
      netRetainedRoas: 1.67,
      spendCents: 12_000,
      stripeFeeCents: 2_000,
    })
    expect(model.milestone?.activeMilestone.key).toBe("five_thousand")
  })

  it("derives CPC softly: click-carrying runs get spend ÷ clicks, older runs stay null without breaking the aggregate", () => {
    const withClicks = buildBusinessReadModel({
      adsRun: {
        availability: "available",
        reason: null,
        run: evidence({
          rolling30: [
            campaign({ clicks: 400 }),
            campaign({ campaignId: "2", campaignName: "Scripts", clicks: 200 }),
          ],
        }),
      },
      now: NOW,
      revenue,
    })

    expect(withClicks.economics.clicksTotal).toBe(600)
    expect(withClicks.economics.cpcCents).toBe(40)
    expect(withClicks.economics.spendCents).toBe(24_000)

    const mixed = buildBusinessReadModel({
      adsRun: {
        availability: "available",
        reason: null,
        run: evidence({
          rolling30: [
            campaign({ clicks: 400 }),
            campaign({ campaignId: "2", campaignName: "Scripts" }),
          ],
        }),
      },
      now: NOW,
      revenue,
    })

    expect(mixed.economics.clicksTotal).toBeNull()
    expect(mixed.economics.cpcCents).toBeNull()
    expect(mixed.economics.spendCents).toBe(24_000)
  })

  it("maps an evidence-complete investigation to CHECK", () => {
    const model = buildBusinessReadModel({
      adsRun: {
        availability: "available",
        reason: null,
        run: evidence({
          recommendations: [{
            kind: "INVESTIGATE",
            proposedMutationFamily: null,
            reasonCodes: ["CROSS_SERVICE_ATTRIBUTION"],
            service: "account",
          }],
        }),
      },
      now: NOW,
      revenue,
    })

    expect(model.scaleDecision).toBe("CHECK")
    expect(model.reasonCodes).toContain("CROSS_SERVICE_ATTRIBUTION")
  })

  it.each([
    ["missing spend", campaign({ spendCents: null })],
    ["missing fees", campaign({ stripeFeeCents: null })],
    ["missing attributed revenue", campaign({ netRetainedRevenueCents: null })],
  ])("fails %s closed as HOLD", (_label, incompleteCampaign) => {
    const model = buildBusinessReadModel({
      adsRun: {
        availability: "available",
        reason: null,
        run: evidence({ rolling30: [incompleteCampaign] }),
      },
      now: NOW,
      revenue,
    })

    expect(model.scaleDecision).toBe("HOLD")
    expect(model.economics.firstOrderContributionCents).toBeNull()
    expect(model.reasonCodes).toContain("ECONOMICS_UNAVAILABLE")
  })

  it("fails stale evidence closed even if an approval recommendation exists", () => {
    const model = buildBusinessReadModel({
      adsRun: {
        availability: "available",
        reason: null,
        run: evidence({
          deliveredAt: "2026-07-26T00:00:00.000Z",
          recommendations: [{
            kind: "APPROVAL_NEEDED",
            proposedMutationFamily: "campaign_budget",
            reasonCodes: [],
            service: "med_certs",
          }],
        }),
      },
      now: NOW,
      revenue,
    })

    expect(model.scaleDecision).toBe("HOLD")
    expect(model.reasonCodes).toContain("ADS_EVIDENCE_STALE")
    expect(model.economics.firstOrderContributionCents).toBeNull()
  })

  it("fails unavailable revenue and non-green tracking closed", () => {
    const model = buildBusinessReadModel({
      adsRun: {
        availability: "available",
        reason: null,
        run: evidence({ trackingState: "AMBER" }),
      },
      now: NOW,
      revenue: {
        availability: "unavailable",
        generatedAt: null,
        netRetainedCents: null,
        paidOrders: null,
      },
    })

    expect(model.scaleDecision).toBe("HOLD")
    expect(model.milestone).toBeNull()
    expect(model.reasonCodes).toEqual(expect.arrayContaining([
      "REVENUE_UNAVAILABLE",
      "TRACKING_NOT_GREEN",
    ]))
  })
})
