import { describe, expect, it } from "vitest"

import { normalizeAttributionForStorage } from "@/lib/analytics/attribution-storage"

describe("attribution storage", () => {
  it("keeps paid attribution fields while stripping URL query strings before persistence", () => {
    const stored = normalizeAttributionForStorage({
      captured_at: "2026-05-03T09:00:00.000Z",
      gbraid: " braid ",
      gclid: " click ",
      landing_page: "/request?utm_source=google&symptom=headache",
      referrer: "https://chatgpt.com/c/thread-1?private=value",
      utm_campaign: "brand",
      utm_content: "hero_cta",
      utm_medium: "cpc",
      utm_source: "google",
      utm_term: "medical certificate",
      wbraid: " web ",
    })

    expect(stored).toEqual({
      attribution_captured_at: "2026-05-03T09:00:00.000Z",
      gbraid: "braid",
      gclid: "click",
      landing_page: "/request",
      referrer: "https://chatgpt.com/c/thread-1",
      utm_campaign: "brand",
      utm_content: "hero_cta",
      utm_medium: "cpc",
      utm_source: "google",
      utm_term: "medical certificate",
      wbraid: "web",
    })
  })

  it("normalizes missing and invalid attribution fields to null", () => {
    const stored = normalizeAttributionForStorage({
      captured_at: "not-a-date",
      landing_page: "",
      referrer: "   ",
    })

    expect(stored).toMatchObject({
      attribution_captured_at: null,
      landing_page: null,
      referrer: null,
      utm_source: null,
    })
  })
})
