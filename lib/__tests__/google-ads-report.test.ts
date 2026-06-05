import { describe, expect, it } from "vitest"

import {
  buildGoogleAdsCampaignPerformanceQuery,
  buildGoogleAdsPurchaseConversionQuery,
  summarizeGoogleAdsCampaignRows,
  summarizeLocalGoogleAdsPurchases,
} from "@/lib/analytics/google-ads-report"

describe("google ads spend report", () => {
  it("builds a campaign performance query with spend, click, conversion, and device fields", () => {
    expect(buildGoogleAdsCampaignPerformanceQuery({
      endDate: "2026-06-02",
      startDate: "2026-05-03",
    })).toBe([
      "SELECT",
      "segments.date,",
      "segments.device,",
      "segments.ad_network_type,",
      "campaign.id,",
      "campaign.name,",
      "campaign.status,",
      "campaign.advertising_channel_type,",
      "metrics.impressions,",
      "metrics.clicks,",
      "metrics.cost_micros,",
      "metrics.conversions,",
      "metrics.conversions_value,",
      "metrics.all_conversions,",
      "metrics.all_conversions_value",
      "FROM campaign",
      "WHERE segments.date BETWEEN '2026-05-03' AND '2026-06-02'",
      "ORDER BY metrics.cost_micros DESC",
    ].join(" "))
  })

  it("builds a purchase conversion query scoped to the configured conversion action", () => {
    expect(buildGoogleAdsPurchaseConversionQuery({
      endDate: "2026-06-02",
      startDate: "2026-05-03",
    }, "customers/1234567890/conversionActions/9876543210")).toBe([
      "SELECT",
      "segments.date,",
      "segments.conversion_action,",
      "segments.conversion_action_name,",
      "campaign.id,",
      "campaign.name,",
      "campaign.status,",
      "campaign.advertising_channel_type,",
      "metrics.conversions,",
      "metrics.conversions_value,",
      "metrics.all_conversions,",
      "metrics.all_conversions_value",
      "FROM campaign",
      "WHERE segments.date BETWEEN '2026-05-03' AND '2026-06-02'",
      "AND segments.conversion_action = 'customers/1234567890/conversionActions/9876543210'",
      "ORDER BY metrics.conversions_value DESC",
    ].join(" "))
  })

  it("summarizes campaign spend and joins local paid order truth by campaign id", () => {
    const local = summarizeLocalGoogleAdsPurchases([
      {
        amount_cents: 1995,
        campaignid: "23651537255",
        category: "medical_certificate",
        payment_status: "paid",
        refund_amount_cents: 0,
        subtype: "work",
      },
      {
        amount_cents: 2995,
        campaignid: "23651537255",
        category: "medical_certificate",
        payment_status: "refunded",
        refund_amount_cents: 2995,
        subtype: "work",
      },
    ])

    const report = summarizeGoogleAdsCampaignRows([
      {
        campaign: {
          advertisingChannelType: "SEARCH",
          id: "23651537255",
          name: "Med cert - Search",
          status: "ENABLED",
        },
        metrics: {
          allConversions: 4,
          allConversionsValue: 99.8,
          clicks: "20",
          conversions: 4,
          conversionsValue: 99.8,
          costMicros: "30000000",
          impressions: "400",
        },
        segments: {
          adNetworkType: "SEARCH",
          date: "2026-06-01",
          device: "MOBILE",
        },
      },
    ], local.byCampaign, [
      {
        campaign: {
          advertisingChannelType: "SEARCH",
          id: "23651537255",
          name: "Med cert - Search",
          status: "ENABLED",
        },
        metrics: {
          allConversions: 2,
          allConversionsValue: 49.9,
          conversions: 2,
          conversionsValue: 49.9,
        },
        segments: {
          conversionAction: "customers/1234567890/conversionActions/9876543210",
          conversionActionName: "InstantMed purchase upload",
          date: "2026-06-01",
        },
      },
    ])

    expect(report.summary).toMatchObject({
      totalClicks: 20,
      totalConversions: 4,
      totalImpressions: 400,
      totalLocalGrossRevenueAud: 49.9,
      totalLocalNetRevenueAud: 19.95,
      totalLocalOrders: 2,
      totalPurchaseConversions: 2,
      totalPurchaseConversionValueAud: 49.9,
      purchaseCpaAud: 15,
      purchaseRoas: 1.663,
      totalSpendAud: 30,
    })
    expect(report.campaigns[0]).toMatchObject({
      campaignId: "23651537255",
      costPerLocalOrderAud: 15,
      localOrders: 2,
      localRefundedAud: 29.95,
      purchaseConversionActionName: "InstantMed purchase upload",
      purchaseConversions: 2,
      purchaseConversionValueAud: 49.9,
      spendAud: 30,
    })
  })
})
