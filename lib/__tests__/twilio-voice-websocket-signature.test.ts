import { createHmac } from "node:crypto"

import { afterEach, describe, expect, it, vi } from "vitest"

import { validateTwilioVoiceWebSocketSignature } from "@/lib/twilio/voice-webhook"

const AUTH_TOKEN = "test-auth-token"
const URL = "wss://instantmed.com.au/api/webhooks/twilio/voice/stream"

function signature(url: string): string {
  return createHmac("sha1", AUTH_TOKEN).update(url).digest("base64")
}

afterEach(() => vi.unstubAllEnvs())

describe("Twilio voice WebSocket signature validation", () => {
  it("accepts the exact configured WSS URL", () => {
    vi.stubEnv("TWILIO_AUTH_TOKEN", AUTH_TOKEN)
    vi.stubEnv("TWILIO_VOICE_PUBLIC_BASE_URL", "https://instantmed.com.au")

    const request = new Request(URL, {
      headers: { "x-twilio-signature": signature(URL) },
    })

    expect(validateTwilioVoiceWebSocketSignature(
      request,
      "/api/webhooks/twilio/voice/stream",
    ).ok).toBe(true)
  })

  it("rejects an invalid signature before a socket is opened", () => {
    vi.stubEnv("TWILIO_AUTH_TOKEN", AUTH_TOKEN)
    vi.stubEnv("TWILIO_VOICE_PUBLIC_BASE_URL", "https://instantmed.com.au")

    const request = new Request(URL, {
      headers: { "x-twilio-signature": "invalid" },
    })

    const result = validateTwilioVoiceWebSocketSignature(
      request,
      "/api/webhooks/twilio/voice/stream",
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.response.status).toBe(401)
  })
})
