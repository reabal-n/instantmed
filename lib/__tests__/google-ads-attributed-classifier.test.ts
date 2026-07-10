import { describe, expect, it } from "vitest"

import {
  type GoogleAdsAttributionRow,
  isLikelyGoogleAttributed,
} from "@/lib/analytics/google-ads-post-payment"

/**
 * Pins the paid/organic boundary of isLikelyGoogleAttributed.
 *
 * 2026-07-10 incident: the classifier substring-matched "google" across a token
 * list that included `referrer`, so organic google.com referrals were counted
 * as ads-attributed (`google_ads_unmapped`) — 11 of 16 "ads" orders on the
 * dashboard were organic, corrupting the ROAS the pause/scale decision reads.
 * Referrer must NEVER make a row ads-attributed.
 */
describe("isLikelyGoogleAttributed", () => {
  const organicGoogleReferral: GoogleAdsAttributionRow = {
    referrer: "https://www.google.com/",
    landing_page: "/medical-certificate",
  }

  it("does NOT attribute an organic google.com referral to ads", () => {
    expect(isLikelyGoogleAttributed(organicGoogleReferral)).toBe(false)
  })

  it("does NOT attribute a bare google utm_source without a paid medium (e.g. GBP organic tagging)", () => {
    expect(
      isLikelyGoogleAttributed({ utm_source: "google", utm_medium: "organic" }),
    ).toBe(false)
    expect(isLikelyGoogleAttributed({ utm_source: "google" })).toBe(false)
  })

  it("does NOT attribute empty / direct rows", () => {
    expect(isLikelyGoogleAttributed({})).toBe(false)
    expect(isLikelyGoogleAttributed({ referrer: "https://chatgpt.com/" })).toBe(false)
  })

  it("attributes rows with a Google click id", () => {
    expect(isLikelyGoogleAttributed({ gclid: "Cj0KCQ" })).toBe(true)
    expect(isLikelyGoogleAttributed({ wbraid: "wb123" })).toBe(true)
    expect(isLikelyGoogleAttributed({ gbraid: "gb123" })).toBe(true)
  })

  it("attributes rows with final-URL-suffix valuetrack params", () => {
    expect(isLikelyGoogleAttributed({ campaignid: "23870042807" })).toBe(true)
    expect(isLikelyGoogleAttributed({ keyword: "telehealth prescription" })).toBe(true)
    expect(isLikelyGoogleAttributed({ network: "g" })).toBe(true)
  })

  it("attributes utm_source=google with a paid medium", () => {
    expect(
      isLikelyGoogleAttributed({ utm_source: "google", utm_medium: "cpc" }),
    ).toBe(true)
    expect(
      isLikelyGoogleAttributed({ utm_source: "adwords", utm_medium: "paid_search" }),
    ).toBe(true)
  })

  it("still ignores google referrer even when combined with organic utm tagging", () => {
    expect(
      isLikelyGoogleAttributed({
        referrer: "https://www.google.com/search?q=med+cert",
        utm_source: "google",
        utm_medium: "organic",
      }),
    ).toBe(false)
  })
})
