import { describe, expect, it } from "vitest"

import { parchmentSsoResponseSchema } from "@/lib/parchment/types"

function parseSsoRedirect(redirectUrl: string) {
  return parchmentSsoResponseSchema.safeParse({
    success: true,
    data: {
      sso_token: "synthetic-sso-token",
      redirect_url: redirectUrl,
      expires_in: 300,
    },
  })
}

describe("Parchment SSO redirect boundary", () => {
  it.each([
    "https://portal.parchment.health/sso/session",
    "https://portal.parchment.health:443/sso/session",
    "https://portal.sandbox.parchment.health/sso/session?embed=true",
  ])("accepts the exact approved HTTPS portal host: %s", (redirectUrl) => {
    expect(parseSsoRedirect(redirectUrl).success).toBe(true)
  })

  it.each([
    "not-a-url",
    "https://example.com/sso/session",
    "http://portal.parchment.health/sso/session",
    "https://synthetic-user@portal.parchment.health/sso/session",
    "https://synthetic-user:synthetic-password@portal.parchment.health/sso/session",
    "https://portal.parchment.health:8443/sso/session",
    "https://portal.parchment.health.evil.example/sso/session",
    "https://evil-portal.parchment.health/sso/session",
    "https://parchment.health/sso/session",
  ])("rejects an unapproved redirect URL: %s", (redirectUrl) => {
    expect(parseSsoRedirect(redirectUrl).success).toBe(false)
  })
})
