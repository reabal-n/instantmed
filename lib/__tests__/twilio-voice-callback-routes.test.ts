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
  it.each([
    ["ended", '{"outcome":"saved"}', false],
    ["ended", '{"outcome":"unavailable"}', true],
    ["failed", '{"outcome":"saved"}', true],
    ["ended", "invalid", true],
  ])("handles relay handoff %s / %s without falsely reporting a saved message failed", async (status, handoff, fallback) => {
    vi.stubEnv("TWILIO_AUTH_TOKEN", AUTH_TOKEN)
    vi.stubEnv("TWILIO_VOICE_PUBLIC_BASE_URL", BASE_URL)
    const { POST } = await import("@/app/api/webhooks/twilio/voice/fallback/route")
    const response = await POST(request("/api/webhooks/twilio/voice/fallback", {
      CallSid: "CA00000000000000000000000000000000", SessionStatus: status, HandoffData: handoff,
    }))
    const xml = await response.text()
    expect(xml.includes("unable to take your message")).toBe(fallback)
    expect(xml).toContain("<Hangup/>")
  })

  it.each([
    ["saved", "sent your message securely", true],
    ["unconfirmed", "couldn't confirm your message", false],
    ["emergency", "hang up and call triple zero now", true],
  ])("plays the fixed %s closeout before hanging up", async (outcome, words, hope) => {
    vi.stubEnv("TWILIO_AUTH_TOKEN", AUTH_TOKEN)
    vi.stubEnv("TWILIO_VOICE_PUBLIC_BASE_URL", BASE_URL)
    const { POST } = await import("@/app/api/webhooks/twilio/voice/fallback/route")
    const xml = await (await POST(request("/api/webhooks/twilio/voice/fallback", {
      CallSid: "CA00000000000000000000000000000000", SessionStatus: "ended", HandoffData: JSON.stringify({ outcome }),
    }))).text()
    expect(xml).toContain(words)
    expect(xml).toMatch(/<Say[^>]*>.*<\/Say><Hangup\/>/)
    expect(xml.includes('voice="ElevenLabs.uYXf8XasLslADfZ2MB4u"')).toBe(hope)
    expect(xml).not.toContain("unable to take your message")
  })

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
    expect(xml).toContain("unable to take your message right now")
    expect(xml).toContain("instant med dot com dot au slash contact")
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
