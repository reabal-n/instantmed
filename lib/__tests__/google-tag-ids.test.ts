import { describe, expect, it } from "vitest"

import { GOOGLE_ADS_ID, GOOGLE_ANALYTICS_ID } from "../analytics/google-tag-ids"

describe("Google tag IDs", () => {
  it("keeps the production Google Ads and GA4 destinations wired", () => {
    expect(GOOGLE_ADS_ID).toBe("AW-17795889471")
    expect(GOOGLE_ANALYTICS_ID).toBe("G-KGM4Q3M5TY")
  })
})
