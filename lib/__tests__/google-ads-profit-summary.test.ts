import { describe, expect, it } from "vitest"

import { buildGoogleAdsProfitSnapshot } from "@/lib/analytics/google-ads-profit-summary"

describe("google ads profit summary", () => {
  it("turns the spend audit report into operator-visible local CAC and ROAS", () => {
    const snapshot = buildGoogleAdsProfitSnapshot({
      ads: {
        campaigns: [
          {
            campaignId: "123",
            campaignName: "Med cert search",
            channel: "SEARCH",
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

    expect(snapshot.status).toBe("losing")
    expect(snapshot.summary).toMatchObject({
      costPerLocalOrderAud: 15,
      localRoas: 0.665,
      netProfitAud: -10.05,
      spendAud: 30,
    })
    expect(snapshot.campaigns[0]).toMatchObject({
      campaignName: "Med cert search",
      costPerLocalOrderAud: 15,
      localRoas: 0.665,
      netProfitAud: -10.05,
      primaryService: "medical_certificate:work",
    })
  })
})
