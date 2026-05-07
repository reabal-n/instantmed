import { describe, expect, it } from "vitest"

import { normalizeAttributionForStorage } from "@/lib/analytics/attribution-storage"

describe("attribution storage", () => {
  it("keeps paid attribution fields while stripping URL query strings before persistence", () => {
    const stored = normalizeAttributionForStorage({
      captured_at: "2026-05-03T09:00:00.000Z",
      adgroupid: " 222 ",
      campaignid: " 111 ",
      creative: " 333 ",
      device: " m ",
      gbraid: " braid ",
      gclid: " click ",
      keyword: " medical certificate ",
      landing_page: "/request?utm_source=google&symptom=headache",
      matchtype: " e ",
      network: " g ",
      referrer: "https://chatgpt.com/c/thread-1?private=value",
      utm_campaign: "brand",
      utm_content: "hero_cta",
      utm_id: " 123456 ",
      utm_medium: "cpc",
      utm_source: "google",
      utm_term: "medical certificate",
      wbraid: " web ",
    })

    expect(stored).toEqual({
      adgroupid: "222",
      attribution_captured_at: "2026-05-03T09:00:00.000Z",
      campaignid: "111",
      creative: "333",
      device: "m",
      gbraid: "braid",
      gclid: "click",
      keyword: "medical certificate",
      landing_page: "/request",
      matchtype: "e",
      network: "g",
      referrer: "https://chatgpt.com/c/thread-1",
      utm_campaign: "brand",
      utm_content: "hero_cta",
      utm_id: "123456",
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
      campaignid: null,
      utm_source: null,
    })
  })
})
