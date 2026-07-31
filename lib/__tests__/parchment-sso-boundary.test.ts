import { describe, expect, it } from "vitest"

import { parseParchmentSsoResponse } from "@/lib/parchment/types"

const API_URL = {
  production: "https://api.parchmenthealth.io/external",
  sandbox: "https://api.sandbox.parchmenthealth.io/external",
} as const

function parseSsoRedirect(
  redirectUrl: string,
  apiUrl: (typeof API_URL)[keyof typeof API_URL],
) {
  try {
    parseParchmentSsoResponse({
      success: true,
      data: {
        sso_token: "synthetic-sso-token",
        redirect_url: redirectUrl,
        expires_in: 300,
      },
    }, apiUrl)
    return true
  } catch {
    return false
  }
}

describe("Parchment SSO redirect boundary", () => {
  it.each([
    "https://portal.parchment.health/sso/session",
    "https://portal.parchment.health:443/sso/session",
  ])("accepts only the production portal for production API config: %s", (redirectUrl) => {
    expect(parseSsoRedirect(redirectUrl, API_URL.production)).toBe(true)
  })

  it("rejects the sandbox portal for production API config", () => {
    expect(parseSsoRedirect(
      "https://portal.sandbox.parchment.health/sso/session?embed=true",
      API_URL.production,
    )).toBe(false)
  })

  it("accepts only the sandbox portal for sandbox API config", () => {
    expect(parseSsoRedirect(
      "https://portal.sandbox.parchment.health/sso/session?embed=true",
      API_URL.sandbox,
    )).toBe(true)
    expect(parseSsoRedirect(
      "https://portal.parchment.health/sso/session",
      API_URL.sandbox,
    )).toBe(false)
  })

  it.each([
    "not-a-url",
    "https://example.com/sso/session",
    "http://portal.parchment.health/sso/session",
    "http://portal.sandbox.parchment.health/sso/session",
    "https://synthetic-user@portal.parchment.health/sso/session",
    "https://synthetic-user@portal.sandbox.parchment.health/sso/session",
    "https://synthetic-user:synthetic-password@portal.parchment.health/sso/session",
    "https://synthetic-user:synthetic-password@portal.sandbox.parchment.health/sso/session",
    "https://portal.parchment.health:8443/sso/session",
    "https://portal.sandbox.parchment.health:8443/sso/session",
    "https://portal.parchment.health.evil.example/sso/session",
    "https://evil-portal.parchment.health/sso/session",
    "https://parchment.health/sso/session",
  ])("rejects an unapproved redirect URL: %s", (redirectUrl) => {
    expect(parseSsoRedirect(redirectUrl, API_URL.production)).toBe(false)
    expect(parseSsoRedirect(redirectUrl, API_URL.sandbox)).toBe(false)
  })
})
