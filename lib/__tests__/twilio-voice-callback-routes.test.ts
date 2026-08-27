import { createHmac } from "node:crypto"

import { afterEach, describe, expect, it, vi } from "vitest"

const AUTH_TOKEN = "test-auth-token"
const BASE_URL = "https://instantmed.com.au"

function signTwilioForm(url: string, params: Record<string, string>): string {
  const payload = Object.keys(params)
    .sort()
    .reduce((value, key) => `${value}${key}${params[key]}`, url)
  return createHmac("sha1", AUTH_TOKEN).update(payload).digest("base64")
}

function request(pathname: string, params: Record<string, string>): Request {
  const url = `${BASE_URL}${pathname}`
  return new Request(url, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "x-twilio-signature": signTwilioForm(url, params),
    },
    body: new URLSearchParams(params),
  })
}

describe("Twilio voice fallback and status callbacks", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it("returns safe TwiML when the primary incoming handler fails", async () => {
    vi.stubEnv("TWILIO_AUTH_TOKEN", AUTH_TOKEN)
    vi.stubEnv("TWILIO_VOICE_PUBLIC_BASE_URL", BASE_URL)
    const pathname = "/api/webhooks/twilio/voice/fallback"
    const params = { CallSid: "CA00000000000000000000000000000000" }

    const { POST } = await import("@/app/api/webhooks/twilio/voice/fallback/route")
    const response = await POST(request(pathname, params))
    const xml = await response.text()

    expect(response.status).toBe(200)
    expect(xml).toContain("automated support assistant is temporarily unavailable")
    expect(xml).toContain("support at instantmed dot com dot au")
    expect(xml).toContain("<Hangup/>")
    expect(xml).not.toContain("<Record")
  })

  it.each([
    ["status", "/api/webhooks/twilio/voice/status", { CallStatus: "completed" }],
    ["stream-status", "/api/webhooks/twilio/voice/stream-status", { StreamEvent: "stream-stopped" }],
  ])("accepts a signed %s callback with no response body", async (route, pathname, extra) => {
    vi.stubEnv("TWILIO_AUTH_TOKEN", AUTH_TOKEN)
    vi.stubEnv("TWILIO_VOICE_PUBLIC_BASE_URL", BASE_URL)
    const params = {
      CallSid: "CA00000000000000000000000000000000",
      ...extra,
    }
    const routeModule = route === "status"
      ? await import("@/app/api/webhooks/twilio/voice/status/route")
      : await import("@/app/api/webhooks/twilio/voice/stream-status/route")

    const response = await routeModule.POST(request(pathname, params))

    expect(response.status).toBe(204)
    expect(await response.text()).toBe("")
  })
})
