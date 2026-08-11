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

  it("separates lifecycle emails from recovery email", () => {
    expect(
      classifyAttributionSource({
        landing_page: "/medical-certificate",
        utm_campaign: "reactivation",
        utm_medium: "email",
        utm_source: "cert_reactivation",
      }).group,
    ).toBe("lifecycle_email")

    expect(
      classifyAttributionSource({
        landing_page: "/prescriptions",
        utm_campaign: "reactivation",
        utm_medium: "email",
        utm_source: "refill_reminder",
      }).group,
    ).toBe("lifecycle_email")

    expect(
      classifyAttributionSource({
        landing_page: "/request",
        utm_campaign: "partial_intake_recovery",
        utm_medium: "email",
        utm_source: "recovery_email",
      }).group,
    ).toBe("recovery_email")
  })

  it("does not attribute internal, auth, or payment return hosts as acquisition referrals", () => {
    for (const referrer of [
      "https://instantmed.com.au/request",
      "https://checkout.stripe.com/c/pay/cs_test",
      "https://accounts.google.com/signin",
      "https://witzcrovsoumktyndqgz.supabase.co/auth/v1/callback",
    ]) {
      expect(
        classifyAttributionSource({
          landing_page: "/request",
          referrer,
        }).group,
      ).toBe("direct")
    }
  })

  it("distinguishes direct traffic from truly unknown attribution", () => {
    expect(
      classifyAttributionSource({
        landing_page: "/",
      }).group,
    ).toBe("direct")

    expect(classifyAttributionSource({}).group).toBe("unknown")
  })

  it("classifies AI arrivals exactly — substring lookalikes stay non-AI (2026-08-11)", () => {
    // Real AI arrivals.
    expect(
      classifyAttributionSource({ landing_page: "/", referrer: "https://chatgpt.com/" }).group,
    ).toBe("ai_referral")
    expect(
      classifyAttributionSource({ landing_page: "/", utm_source: "chatgpt.com" }).group,
    ).toBe("ai_referral")

    // The substring-era false positives: youtube matched "you", bing matched
    // Copilot, meta matched Meta AI, our own campaign names matched engines,
    // and any URL merely containing "chatgpt" counted as an AI arrival.
    for (const input of [
      { landing_page: "/", utm_source: "youtube" },
      { landing_page: "/", utm_source: "bing" },
      { landing_page: "/", utm_source: "meta" },
      { landing_page: "/", utm_source: "gemini_test" },
      { landing_page: "/", utm_campaign: "gemini-cert-2026" },
      { landing_page: "/", referrer: "https://www.reddit.com/r/chatgpt/top" },
      { landing_page: "/", referrer: "https://chatgpt.com.evil.example/" },
    ]) {
      expect(classifyAttributionSource(input).group).not.toBe("ai_referral")
    }
  })
})
