import { describe, expect, it } from "vitest"

import { buildGoogleAdsReturnSnapshot } from "@/lib/analytics/google-ads-return-summary"

describe("google ads return summary", () => {
  it("withholds spend-derived conclusions when campaign performance is unavailable", () => {
    const snapshot = buildGoogleAdsReturnSnapshot({
      ads: {
        campaigns: [],
        summary: {
          avgCpcAud: null,
          purchaseCpaAud: null,
          purchaseRoas: null,
          totalClicks: 0,
          totalLocalGrossRevenueAud: 49.9,
          totalLocalNetRevenueAud: 49.9,
          totalLocalOrders: 2,
          totalSpendAud: 0,
        },
      },
      generatedAt: "2026-06-05T00:00:00.000Z",
      local: {
        byCampaign: [],
        summary: {
          grossRevenueAud: 49.9,
          netRevenueAud: 49.9,
          orders: 2,
          refundedAud: 0,
        },
      },
      queryErrors: [{ name: "campaign_performance", error: "temporarily unavailable" }],
      range: {
        days: 30,
        endDate: "2026-06-05",
        startDate: "2026-05-07",
      },
    })

    expect(snapshot).toMatchObject({
      campaignState: "unknown",
      queryErrorNames: ["campaign_performance"],
      returnMetricsAvailability: "unavailable",
      status: "unknown",
      summary: {
        spendAud: null,
        costPerLocalOrderAud: null,
        localRoas: null,
        revenueAfterAdSpendAud: null,
      },
    })
  })

  it("turns the spend audit report into operator-visible local CAC and ROAS", () => {
    const snapshot = buildGoogleAdsReturnSnapshot({
      ads: {
        campaigns: [
          {
            campaignId: "123",
            campaignName: "Med cert search",
            channel: "SEARCH",
            status: "ENABLED",
            clicks: 20,
            costPerLocalOrderAud: 15,
            devices: ["MOBILE"],
            localGrossRevenueAud: 49.9,
            localNetRevenueAud: 19.95,
            localOrders: 2,
            localRefundedAud: 29.95,
            networks: ["SEARCH"],
            purchaseCpaAud: 15,
            purchaseRoas: 1.663,
            spendAud: 30,
          },
        ],
        summary: {
          avgCpcAud: 1.5,
          purchaseCpaAud: 15,
          purchaseRoas: 1.663,
          totalClicks: 20,
          totalLocalGrossRevenueAud: 49.9,
          totalLocalNetRevenueAud: 19.95,
          totalLocalOrders: 2,
          totalSpendAud: 30,
        },
      },
      generatedAt: "2026-06-05T00:00:00.000Z",
      local: {
        byCampaign: [
          {
            campaignId: "123",
            grossRevenueAud: 49.9,
            netRevenueAud: 19.95,
            orders: 2,
            refundedAud: 29.95,
            services: {
              "medical_certificate:work": 2,
            },
          },
        ],
        summary: {
          grossRevenueAud: 49.9,
          netRevenueAud: 19.95,
          orders: 2,
          refundedAud: 29.95,
        },
      },
      queryErrors: [],
      range: {
        days: 30,
        endDate: "2026-06-05",
        startDate: "2026-05-07",
      },
    })

    expect(snapshot.status).toBe("revenue_below_spend")
    expect(snapshot.campaignState).toBe("enabled")
    expect(snapshot.summary).toMatchObject({
      costPerLocalOrderAud: 15,
      localRoas: 0.665,
      revenueAfterAdSpendAud: -10.05,
      spendAud: 30,
    })
    expect(snapshot.campaigns[0]).toMatchObject({
      campaignName: "Med cert search",
      status: "ENABLED",
      costPerLocalOrderAud: 15,
      localRoas: 0.665,
      revenueAfterAdSpendAud: -10.05,
      primaryService: "medical_certificate:work",
    })
  })
})
