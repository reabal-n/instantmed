import { describe, expect, it } from "vitest"

import {
  isRecoveryEmailAttributed,
} from "@/lib/analytics/recovery-email-attribution"

describe("recovery email attribution", () => {
  it("counts an allowlisted recovery touch independently of retained acquisition click IDs", () => {
    expect(isRecoveryEmailAttributed({
      gclid: "retained-google-click",
      utm_campaign: "abandoned_checkout",
      utm_medium: "email",
      utm_source: "recovery_email",
    })).toBe(true)

    expect(isRecoveryEmailAttributed({
      gclid: "retained-google-click",
      recovery_email_engaged_at: "2026-09-03T10:00:00.000Z",
      utm_campaign: "paid-brand",
      utm_medium: "cpc",
      utm_source: "google",
    })).toBe(true)

    expect(isRecoveryEmailAttributed({ gclid: "retained-google-click" })).toBe(false)
  })
})
