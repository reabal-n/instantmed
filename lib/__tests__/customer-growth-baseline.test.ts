import { describe, expect, it } from "vitest"

import {
  assertNoSensitiveBaselineText,
  buildCustomerGrowthBaselineSummary,
  buildFreeChannelLandingBreakdown,
} from "@/lib/data/customer-growth-baseline"

describe("customer growth baseline", () => {
  it("builds an operator summary from aggregate-only funnel, recovery, and ads data", () => {
    const summary = buildCustomerGrowthBaselineSummary({
      generatedAt: "2026-06-06T00:00:00.000Z",
      googleAds30d: {
        ok: true,
        source: "protected-endpoint",
        status: 200,
        summary: {
          clicks: 459,
          localCacAud: 72.33,
          localNetRevenueAud: 518.95,
          localOrders: 22,
          localRoas: 0.326,
          spendAud: 1591.23,
        },
      },
      posthog30d: {
        dateFrom: "2026-05-07T00:00:00.000Z",
        dateTo: "2026-06-06T00:00:00.000Z",
        days: 30,
        events: [
          { count: 410, event: "intake_started" },
          { count: 87, event: "checkout_viewed" },
          { count: 75, event: "purchase_completed_server" },
        ],
        ok: true,
      },
      supabase30d: {
        dateFrom: "2026-05-07T00:00:00.000Z",
        dateTo: "2026-06-06T00:00:00.000Z",
        days: 30,
        freeChannelLandingPages: [
          { group: "ai_referral", landingPage: "/medical-certificate-online", orders: 2 },
          { group: "organic_nonbrand", landingPage: "/medical-certificate", orders: 1 },
          { group: "referral", landingPage: "/employers", orders: 1 },
        ],
        intakes: {
          averageOrderValueAud: 29.34,
          byService: [
            {
              grossRevenueAud: 798.7,
              intakes: 36,
              paid: 26,
              service: "medical_certificate",
            },
          ],
          grossRevenueAud: 968.35,
          intakes: 43,
          netRevenueAud: 888.45,
          paid: 33,
          paidRate: 76.7,
          refundedAud: 79.9,
        },
        recovery: {
          abandonedCheckoutSent: 3,
          convertedPartials: 0,
          emailCaptured: 18,
          emailCaptureRate: 14.8,
          partialRecoverySent: 14,
          partialsCaptured: 122,
          recoveredGrossRevenueAud: 0,
          recoveredNetRevenueAud: 0,
          recoveredPaidCount: 0,
          recoveryEmailCoverageRate: 77.8,
        },
      },
    })

    expect(summary).toContain("30-day paid intakes: 33")
    expect(summary).toContain("30-day net AOV: $29.34")
    expect(summary).toContain("30-day Google Ads local CAC: $72.33")
    expect(summary).toContain("order counts are acquisition evidence")
    expect(summary).toContain("total net-retained revenue is the economic result")
    expect(summary).toContain("| ai_referral | /medical-certificate-online | 2 |")
    expect(summary).toContain("| organic_nonbrand | /medical-certificate | 1 |")
    expect(summary).toContain("| referral | /employers | 1 |")
    expect(summary).toContain("Phase 1 gate: blocked")
    expect(summary).toContain("partial-intake converted marker is zero")
  })

  it("groups free-channel paid orders by InstantMed public pathname only", () => {
    const rows = buildFreeChannelLandingBreakdown([
      { referrer: "https://chatgpt.com/", landing_page: "/medical-certificate-online?utm_source=chatgpt.com#top" },
      { referrer: "https://chatgpt.com/", landing_page: "https://instantmed.com.au/medical-certificate-online?source=chatgpt" },
      { referrer: "https://chatgpt.com/", landing_page: "https://www.instantmed.com.au/medical-certificate-online?source=chatgpt" },
      { referrer: "https://www.google.com/", landing_page: "/medical-certificate?query=medical" },
      { utm_campaign: "brand", utm_medium: "organic", landing_page: "/?campaign=brand" },
      { utm_medium: "referral", utm_source: "hrm", landing_page: "/employers?campaign=employer_verification" },
      { utm_medium: "referral", landing_page: "https://partner.example/employers?campaign=partner" },
      { utm_medium: "referral", landing_page: "https://staging.instantmed.com.au/employers?campaign=staging" },
      { utm_medium: "referral", landing_page: "javascript:alert('not-a-path')" },
      { gclid: "diagnostic-click-id", landing_page: "/prescriptions" },
      { utm_medium: "referral", landing_page: "http://[" },
      { utm_medium: "referral" },
    ])

    expect(rows).toEqual([
      { group: "referral", landingPage: "/unknown", orders: 5 },
      { group: "ai_referral", landingPage: "/medical-certificate-online", orders: 3 },
      { group: "organic_brand", landingPage: "/", orders: 1 },
      { group: "organic_nonbrand", landingPage: "/medical-certificate", orders: 1 },
      { group: "referral", landingPage: "/employers", orders: 1 },
    ])
    expect(JSON.stringify(rows)).not.toContain("partner.example")
    expect(JSON.stringify(rows)).not.toContain("staging.instantmed.com.au")
    expect(JSON.stringify(rows)).not.toContain("campaign=")
  })

  it("rejects sensitive identifiers before baseline artifacts are written", () => {
    expect(() =>
      assertNoSensitiveBaselineText(
        JSON.stringify({
          email: "patient@example.com",
          intakeId: "47e24318-3554-4ca2-9db7-11ae85e41f23",
          paymentIntent: "pi_1234567890abcdef",
          phone: "0412 345 678",
        }),
      ),
    ).toThrow(/sensitive/i)

    expect(() =>
      assertNoSensitiveBaselineText(
        JSON.stringify({
          intakes: 43,
          localCacAud: 72.33,
          recoveredPaidCount: 2,
        }),
      ),
    ).not.toThrow()
  })
})
