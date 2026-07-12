import { describe, expect, it } from "vitest"

import { buildCaseRowAttribution } from "@/lib/operator/cases/case-attribution"

describe("buildCaseRowAttribution", () => {
  it("labels Google Ads rows from click IDs with the keyword as tooltip detail", () => {
    const result = buildCaseRowAttribution({
      gclid: "abc123",
      utm_source: "google",
      utm_medium: "cpc",
      keyword: "online prescription australia",
    })
    expect(result.group).toBe("google_ads")
    expect(result.label).toBe("Google Ads")
    expect(result.title).toContain("online prescription australia")
    expect(result.selfReported).toBe(false)
  })

  it("labels AI referrals with the short 'AI' row label", () => {
    const result = buildCaseRowAttribution({
      referrer: "https://chatgpt.com/",
      landing_page: "/medical-certificate",
    })
    expect(result.group).toBe("ai_referral")
    expect(result.label).toBe("AI")
  })

  it("collapses organic brand/non-brand to a single short 'Search' label", () => {
    const result = buildCaseRowAttribution({
      utm_medium: "organic",
      utm_source: "google",
      landing_page: "/medical-certificate",
    })
    expect(result.label).toBe("Search")
  })

  it("substitutes the self-reported answer for dark Direct rows", () => {
    const result = buildCaseRowAttribution({
      landing_page: "/",
      heard_about_us: "search",
    })
    expect(result.group).toBe("direct")
    expect(result.label).toBe("Self: Google or web search")
    expect(result.selfReported).toBe(true)
    expect(result.title).toContain("Self-reported")
  })

  it("does NOT let a self-report override real code-side attribution", () => {
    // A Google Ads click that ALSO answered the survey keeps the classifier's
    // verdict — the self-report only fills the dark-traffic gap.
    const result = buildCaseRowAttribution({
      gclid: "abc123",
      heard_about_us: "friend",
    })
    expect(result.group).toBe("google_ads")
    expect(result.label).toBe("Google Ads")
    expect(result.selfReported).toBe(false)
  })

  it("ignores unknown self-report tokens and falls back to the classifier", () => {
    const result = buildCaseRowAttribution({
      landing_page: "/",
      heard_about_us: "not-a-real-token",
    })
    expect(result.group).toBe("direct")
    expect(result.label).toBe("Direct")
    expect(result.selfReported).toBe(false)
  })

  it("labels fully dark rows Unknown", () => {
    const result = buildCaseRowAttribution({})
    expect(result.group).toBe("unknown")
    expect(result.label).toBe("Unknown")
  })
})
