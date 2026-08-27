import { createHmac } from "node:crypto"

import { afterEach, describe, expect, it, vi } from "vitest"

const PUBLIC_URL = "https://instantmed.com.au/api/webhooks/twilio/voice/incoming"
const AUTH_TOKEN = "test-auth-token"

function signTwilioForm(url: string, params: Record<string, string>): string {
  const payload = Object.keys(params)
    .sort()
    .reduce((value, key) => `${value}${key}${params[key]}`, url)

  return createHmac("sha1", AUTH_TOKEN).update(payload).digest("base64")
}

function buildRequest(signature: string): Request {
  const params = {
    AccountSid: "AC00000000000000000000000000000000",
    CallSid: "CA00000000000000000000000000000000",
    From: "+61495049555",
    To: "+61495049555",
  }
  const body = new URLSearchParams(params)

  return new Request(PUBLIC_URL, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "x-twilio-signature": signature || signTwilioForm(PUBLIC_URL, params),
    },
    body,
  })
}

describe("Twilio incoming voice webhook", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it("asks for explicit keypad consent before any audio can reach AI", async () => {
    vi.stubEnv("TWILIO_AUTH_TOKEN", AUTH_TOKEN)
    vi.stubEnv("TWILIO_VOICE_PUBLIC_BASE_URL", "https://instantmed.com.au")

    const { POST } = await import("@/app/api/webhooks/twilio/voice/incoming/route")
    const response = await POST(buildRequest(""))
    const xml = await response.text()

    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toContain("text/xml")
    expect(xml).toContain("automated support assistant")
    expect(xml).toContain("transcribed and processed by artificial intelligence")
    expect(xml).toContain("cannot give medical advice or make clinical decisions")
    expect(xml).toContain('action="https://instantmed.com.au/api/webhooks/twilio/voice/consent"')
    expect(xml).toContain('method="POST"')
    expect(xml).toContain('numDigits="1"')
    expect(xml).not.toContain("<Stream")
  })

  it("rejects calls that do not carry a valid Twilio signature", async () => {
    vi.stubEnv("TWILIO_AUTH_TOKEN", AUTH_TOKEN)
    vi.stubEnv("TWILIO_VOICE_PUBLIC_BASE_URL", "https://instantmed.com.au")

    const { POST } = await import("@/app/api/webhooks/twilio/voice/incoming/route")
    const response = await POST(buildRequest("not-a-valid-signature"))

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: "Invalid signature" })
  })
})
