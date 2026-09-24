import { describe, expect, it } from "vitest"

import { GOOGLE_ANALYTICS_ID, GOOGLE_BROWSER_TAGS_ENABLED } from "../analytics/google-tag-ids"

describe("Google tag IDs", () => {
  it("keeps legacy GA4 identification while browser tags remain contained", () => {
    expect(GOOGLE_BROWSER_TAGS_ENABLED).toBe(false)
    expect(GOOGLE_ANALYTICS_ID).toBe("G-X0QJQRLL2Y")
  })
})
