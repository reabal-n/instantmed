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
    From: "+61412345678",
    To: "+61495049555",
  }
  return new Request(PUBLIC_URL, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "x-twilio-signature": signature || signTwilioForm(PUBLIC_URL, params),
    },
    body: new URLSearchParams(params),
  })
}

function enableVoice() {
  vi.stubEnv("TWILIO_AI_VOICE_ENABLED", "true")
  vi.stubEnv("TWILIO_AUTH_TOKEN", AUTH_TOKEN)
  vi.stubEnv("TWILIO_VOICE_PUBLIC_BASE_URL", "https://instantmed.com.au")
  vi.stubEnv("TWILIO_VOICE_SESSION_SECRET", "voice-session-secret-with-at-least-32-characters")
  vi.stubEnv("OPENAI_API_KEY", "test-openai-key")
  vi.stubEnv("PHI_ENCRYPTION_ENABLED", "true")
  vi.stubEnv("PHI_ENCRYPTION_WRITE_ENABLED", "true")
  vi.stubEnv("PHI_ENCRYPTION_READ_ENABLED", "true")
  vi.stubEnv("PHI_MASTER_KEY", "test-phi-master-key")
  vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.example.com")
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-redis-token")
  vi.doMock("@/lib/rate-limit/redis", () => ({
    applyRateLimit: vi.fn(async () => null),
  }))
  vi.doMock("@/lib/twilio/voice-abuse", () => ({
    claimVoiceCallSlot: vi.fn(async () => true),
    fingerprintVoiceCaller: vi.fn(() => "caller-fingerprint"),
    isVoiceCallerBlocked: vi.fn(() => false),
    releaseVoiceCallSlot: vi.fn(async () => undefined),
  }))
}

describe("Twilio incoming voice webhook", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.doUnmock("@/lib/rate-limit/redis")
    vi.doUnmock("@/lib/twilio/voice-abuse")
    vi.resetModules()
  })

  it("connects a signed call directly to Lena without a keypad gate or disclosure preamble", async () => {
    enableVoice()

    const { POST } = await import("@/app/api/webhooks/twilio/voice/incoming/route")
    const response = await POST(buildRequest(""))
    const xml = await response.text()

    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toContain("text/xml")
    expect(xml).toContain("<Connect>")
    expect(xml).toContain("<Stream")
    expect(xml).toContain("wss://instantmed.com.au/api/webhooks/twilio/voice/stream")
    expect(xml).toContain('name="sessionToken"')
    expect(xml).not.toContain("<Gather")
    expect(xml).not.toContain("artificial intelligence")
    expect(xml).not.toContain("automated support assistant")
  })

  it("returns immediate fallback TwiML when the concurrency cap is full", async () => {
    enableVoice()
    vi.doMock("@/lib/twilio/voice-abuse", () => ({
      claimVoiceCallSlot: vi.fn(async () => false),
      fingerprintVoiceCaller: vi.fn(() => "caller-fingerprint"),
      isVoiceCallerBlocked: vi.fn(() => false),
      releaseVoiceCallSlot: vi.fn(async () => undefined),
    }))

    const { POST } = await import("@/app/api/webhooks/twilio/voice/incoming/route")
    const response = await POST(buildRequest(""))
    const xml = await response.text()

    expect(response.status).toBe(200)
    expect(xml).toContain("unable to take your message right now")
    expect(xml).toContain("instant med dot com dot au slash contact")
    expect(xml).toContain("<Hangup/>")
    expect(xml).not.toContain("<Stream")
  })

  it("rejects calls that do not carry a valid Twilio signature", async () => {
    enableVoice()

    const { POST } = await import("@/app/api/webhooks/twilio/voice/incoming/route")
    const response = await POST(buildRequest("not-a-valid-signature"))

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: "Invalid signature" })
  })
})
