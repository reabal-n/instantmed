import { describe, expect, it } from "vitest"

import { classifyAttributionSource } from "@/lib/analytics/source-classification"

describe("attribution source classification", () => {
  it("separates Google Ads from organic Google traffic", () => {
    expect(
      classifyAttributionSource({
        campaignid: "123",
        landing_page: "/medical-certificate",
        utm_medium: "cpc",
        utm_source: "google",
      }).group,
    ).toBe("google_ads")

    expect(
      classifyAttributionSource({
        landing_page: "/medical-certificate",
        referrer: "https://www.google.com/",
        utm_medium: "organic",
        utm_source: "google",
      }).group,
    ).toBe("organic_nonbrand")
  })

  it("keeps AI referrals and recovery email out of generic referral buckets", () => {
    expect(
      classifyAttributionSource({
        landing_page: "/prescriptions",
        referrer: "https://chatgpt.com/",
      }).group,
    ).toBe("ai_referral")

    expect(
      classifyAttributionSource({
        landing_page: "/request",
        utm_campaign: "abandoned_checkout",
        utm_medium: "email",
        utm_source: "recovery_email",
      }).group,
    ).toBe("recovery_email")
  })

  it("distinguishes direct traffic from truly unknown attribution", () => {
    expect(
      classifyAttributionSource({
        landing_page: "/",
      }).group,
    ).toBe("direct")

    expect(classifyAttributionSource({}).group).toBe("unknown")
  })
})
