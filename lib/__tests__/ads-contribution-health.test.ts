import { beforeEach, describe, expect, it, vi } from "vitest"

const getLatestDeliveredAdsAgentRun = vi.hoisted(() => vi.fn())

vi.mock("@/lib/ads-agent/runs", () => ({ getLatestDeliveredAdsAgentRun }))

import {
  buildAdsContributionAlert,
  getAdsContributionHealth,
} from "@/lib/monitoring/ads-contribution-health"

const NOW = new Date("2026-08-11T00:00:00.000Z")

function portfolio(overrides: Record<string, unknown> = {}) {
  return {
    campaignCount: 1,
    contributionCents: 4_000,
    contributionMargin: 0.2,
    grossRevenueCents: 30_000,
    netRetainedRevenueCents: 25_000,
    orders: 5,
    refundCents: 0,
    refundedOrders: 0,
    refundRate: 0,
    spendCents: 20_000,
    stripeFeeCents: 1_000,
    unavailableReasonCodes: [],
    ...overrides,
  }
}

function deliveredRun(overrides: {
  deliveredAt?: string
  trackingState?: "GREEN" | "AMBER" | "RED"
  enabled?: Record<string, unknown>
  paused?: Record<string, unknown>
  other?: Record<string, unknown>
} = {}) {
  return {
    availability: "available" as const,
    reason: null,
    run: {
      deliveredAt: overrides.deliveredAt ?? "2026-08-10T12:00:00.000Z",
      id: "run-1",
      recommendations: [],
      reportDate: "2026-08-10",
      snapshot: {
        generatedAt: "2026-08-10T11:55:00.000Z",
        reportDate: "2026-08-10",
        rolling30: [],
        tracking: {
          evidenceAsOf: "2026-08-10T11:50:00.000Z",
          reasonCodes: [],
          scaleAllowed: true,
          state: overrides.trackingState ?? "GREEN",
        },
        totals: {
          rolling30: {
            enabled: portfolio(overrides.enabled),
            paused: portfolio({
              campaignCount: 0,
              contributionCents: 0,
              grossRevenueCents: 0,
              netRetainedRevenueCents: 0,
              orders: 0,
              spendCents: 0,
              stripeFeeCents: 0,
              ...overrides.paused,
            }),
            other: portfolio({
              campaignCount: 0,
              contributionCents: 0,
              grossRevenueCents: 0,
              netRetainedRevenueCents: 0,
              orders: 0,
              spendCents: 0,
              stripeFeeCents: 0,
              ...overrides.other,
            }),
          },
        },
      },
    },
  }
}

describe("Ads contribution health", () => {
  beforeEach(() => getLatestDeliveredAdsAgentRun.mockReset())

  it("includes losses from paused and other campaigns in the rolling account total", async () => {
    getLatestDeliveredAdsAgentRun.mockResolvedValue(deliveredRun({
      enabled: { contributionCents: 18_835, spendCents: 100_000, orders: 40 },
      paused: { contributionCents: -23_485, spendCents: 39_108, orders: 14 },
    }))

    const health = await getAdsContributionHealth({} as never, NOW)

    expect(health).toMatchObject({
      availability: "available",
      contributionCents: -4_650,
      spendCents: 139_108,
      orders: 54,
    })
    expect(buildAdsContributionAlert(health)?.metric).toBe("ads_contribution_negative")
  })

  it("rejects stale or non-GREEN evidence instead of making a contribution claim", async () => {
    getLatestDeliveredAdsAgentRun.mockResolvedValueOnce(deliveredRun({
      deliveredAt: "2026-08-09T00:00:00.000Z",
    }))
    expect(await getAdsContributionHealth({} as never, NOW)).toEqual({
      availability: "unavailable",
      reason: "stale",
    })

    getLatestDeliveredAdsAgentRun.mockResolvedValueOnce(deliveredRun({ trackingState: "AMBER" }))
    expect(await getAdsContributionHealth({} as never, NOW)).toEqual({
      availability: "unavailable",
      reason: "tracking_not_green",
    })
  })

  it("rejects partial portfolio economics rather than treating missing values as zero", async () => {
    getLatestDeliveredAdsAgentRun.mockResolvedValue(deliveredRun({
      paused: { contributionCents: null },
    }))

    expect(await getAdsContributionHealth({} as never, NOW)).toEqual({
      availability: "unavailable",
      reason: "economics_incomplete",
    })
  })

  it("treats a legacy delivered snapshot without totals as incomplete, not a runtime outage", async () => {
    const legacy = deliveredRun()
    delete (legacy.run.snapshot as { totals?: unknown }).totals
    getLatestDeliveredAdsAgentRun.mockResolvedValue(legacy)

    expect(await getAdsContributionHealth({} as never, NOW)).toEqual({
      availability: "unavailable",
      reason: "economics_incomplete",
    })
  })

  it("throws query and malformed-record failures so the section wrapper pages its own outage", async () => {
    getLatestDeliveredAdsAgentRun.mockResolvedValueOnce({
      availability: "unavailable",
      reason: "query_failed",
      run: null,
    })
    await expect(getAdsContributionHealth({} as never, NOW)).rejects.toThrow(/query failed/i)

    getLatestDeliveredAdsAgentRun.mockResolvedValueOnce({
      availability: "unavailable",
      reason: "invalid_record",
      run: null,
    })
    await expect(getAdsContributionHealth({} as never, NOW)).rejects.toThrow(/invalid/i)
  })

  it("keeps a genuinely absent snapshot distinct and silent", async () => {
    getLatestDeliveredAdsAgentRun.mockResolvedValue({
      availability: "unavailable",
      reason: "not_found",
      run: null,
    })

    const health = await getAdsContributionHealth({} as never, NOW)
    expect(health).toEqual({ availability: "unavailable", reason: "not_found" })
    expect(buildAdsContributionAlert(health)).toBeNull()
  })

  it("alerts only for a material actual loss, not an invented positive-margin threshold", () => {
    const smallLoss = {
      availability: "available" as const,
      contributionCents: -500,
      deliveredAt: "2026-08-10T12:00:00.000Z",
      orders: 1,
      reportDate: "2026-08-10",
      spendCents: 3_000,
    }
    const thinPositive = { ...smallLoss, contributionCents: 1, spendCents: 30_000 }
    const materialLoss = { ...smallLoss, contributionCents: -4_200, spendCents: 139_108, orders: 54 }

    expect(buildAdsContributionAlert(smallLoss)).toBeNull()
    expect(buildAdsContributionAlert(thinPositive)).toBeNull()
    expect(buildAdsContributionAlert(materialLoss)).toMatchObject({
      metric: "ads_contribution_negative",
      severity: "critical",
    })
  })

  it("carries aggregate economics only", () => {
    const alert = buildAdsContributionAlert({
      availability: "available",
      contributionCents: -9_900,
      deliveredAt: "2026-08-10T12:00:00.000Z",
      orders: 54,
      reportDate: "2026-08-10",
      spendCents: 139_108,
    })
    const serialized = JSON.stringify(alert).toLowerCase()

    for (const forbidden of ["campaign", "keyword", "intake", "patient", "gclid", "email"]) {
      expect(serialized).not.toContain(forbidden)
    }
  })
})
