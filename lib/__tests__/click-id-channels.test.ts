import { describe, expect, it } from "vitest"

import { deriveChannelFromClickIds } from "@/lib/analytics/click-id-channels"
import { classifyAttributionSource } from "@/lib/analytics/source-classification"

function params(obj: Record<string, string>): { get(key: string): string | null } {
  return { get: (key: string) => (key in obj ? obj[key] : null) }
}

describe("deriveChannelFromClickIds", () => {
  it("maps a Meta fbclid to facebook / paid", () => {
    expect(deriveChannelFromClickIds(params({ fbclid: "abc123" }))).toEqual({
      utm_source: "facebook",
      utm_medium: "paid",
    })
  })

  it("maps a Microsoft msclkid to bing / cpc", () => {
    expect(deriveChannelFromClickIds(params({ msclkid: "m-1" }))).toEqual({
      utm_source: "bing",
      utm_medium: "cpc",
    })
  })

  it("maps a TikTok ttclid to tiktok / paid", () => {
    expect(deriveChannelFromClickIds(params({ ttclid: "t-1" }))).toEqual({
      utm_source: "tiktok",
      utm_medium: "paid",
    })
  })

  it("maps a LinkedIn li_fat_id to linkedin / paid", () => {
    expect(deriveChannelFromClickIds(params({ li_fat_id: "l-1" }))).toEqual({
      utm_source: "linkedin",
      utm_medium: "paid",
    })
  })

  it("returns null for a Google click (gclid) so the existing Google pipeline owns it", () => {
    expect(deriveChannelFromClickIds(params({ gclid: "g-1", fbclid: "f-1" }))).toBeNull()
    expect(deriveChannelFromClickIds(params({ gbraid: "g-1" }))).toBeNull()
    expect(deriveChannelFromClickIds(params({ wbraid: "w-1" }))).toBeNull()
  })

  it("returns null when no recognised click id is present", () => {
    expect(deriveChannelFromClickIds(params({ utm_source: "newsletter" }))).toBeNull()
    expect(deriveChannelFromClickIds(params({}))).toBeNull()
  })

  it("prefers the earliest-declared channel when several click ids are present", () => {
    expect(deriveChannelFromClickIds(params({ fbclid: "f", ttclid: "t" }))).toEqual({
      utm_source: "facebook",
      utm_medium: "paid",
    })
  })

  it("derived source classifies as other_paid (not direct) end-to-end", () => {
    const derived = deriveChannelFromClickIds(params({ fbclid: "abc123" }))!
    const classification = classifyAttributionSource({ ...derived, landing_page: "/medical-certificate" })
    expect(classification.group).toBe("other_paid")
  })
})
