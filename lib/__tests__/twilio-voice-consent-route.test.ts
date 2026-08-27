import { createHmac } from "node:crypto"

import { afterEach, describe, expect, it, vi } from "vitest"

const CONSENT_URL = "https://instantmed.com.au/api/webhooks/twilio/voice/consent"
const AUTH_TOKEN = "test-auth-token"

function signTwilioForm(url: string, params: Record<string, string>): string {
  const payload = Object.keys(params)
    .sort()
    .reduce((value, key) => `${value}${key}${params[key]}`, url)

  return createHmac("sha1", AUTH_TOKEN).update(payload).digest("base64")
}

function buildConsentRequest(digits: string): Request {
  const params = {
    AccountSid: "AC00000000000000000000000000000000",
    CallSid: "CA00000000000000000000000000000000",
    Digits: digits,
    From: "+61495049555",
    To: "+61495049555",
  }

  return new Request(CONSENT_URL, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "x-twilio-signature": signTwilioForm(CONSENT_URL, params),
    },
    body: new URLSearchParams(params),
  })
}

describe("Twilio voice consent webhook", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it("opens the AI media stream only after the caller presses 1", async () => {
    vi.stubEnv("TWILIO_AUTH_TOKEN", AUTH_TOKEN)
    vi.stubEnv("TWILIO_VOICE_PUBLIC_BASE_URL", "https://instantmed.com.au")
    vi.stubEnv("TWILIO_AI_VOICE_ENABLED", "true")
    vi.stubEnv("TWILIO_VOICE_SESSION_SECRET", "test-session-secret-with-at-least-32-characters")
    vi.stubEnv("OPENAI_API_KEY", "test-openai-key")
    vi.stubEnv("PHI_ENCRYPTION_ENABLED", "true")
    vi.stubEnv("PHI_ENCRYPTION_WRITE_ENABLED", "true")
    vi.stubEnv("PHI_ENCRYPTION_READ_ENABLED", "true")
    vi.stubEnv("PHI_MASTER_KEY", "test-phi-master-key")

    const { POST } = await import("@/app/api/webhooks/twilio/voice/consent/route")
    const response = await POST(buildConsentRequest("1"))
    const xml = await response.text()

    expect(response.status).toBe(200)
    expect(xml).toContain("<Connect>")
    expect(xml).toContain('url="wss://instantmed.com.au/api/webhooks/twilio/voice/stream"')
    expect(xml).toContain('statusCallback="https://instantmed.com.au/api/webhooks/twilio/voice/stream-status"')
    expect(xml).toContain('statusCallbackMethod="POST"')
    expect(xml).toMatch(/<Parameter name="sessionToken" value="[^"]+"\/>/)
    expect(xml).not.toContain("+61495049555")
  })

  it("ends the call without streaming when the caller does not consent", async () => {
    vi.stubEnv("TWILIO_AUTH_TOKEN", AUTH_TOKEN)
    vi.stubEnv("TWILIO_VOICE_PUBLIC_BASE_URL", "https://instantmed.com.au")
    vi.stubEnv("TWILIO_AI_VOICE_ENABLED", "true")
    vi.stubEnv("TWILIO_VOICE_SESSION_SECRET", "test-session-secret-with-at-least-32-characters")
    vi.stubEnv("OPENAI_API_KEY", "test-openai-key")
    vi.stubEnv("PHI_ENCRYPTION_ENABLED", "true")
    vi.stubEnv("PHI_ENCRYPTION_WRITE_ENABLED", "true")
    vi.stubEnv("PHI_ENCRYPTION_READ_ENABLED", "true")
    vi.stubEnv("PHI_MASTER_KEY", "test-phi-master-key")

    const { POST } = await import("@/app/api/webhooks/twilio/voice/consent/route")
    const response = await POST(buildConsentRequest("2"))
    const xml = await response.text()

    expect(xml).toContain("not connected the automated assistant")
    expect(xml).toContain("<Hangup/>")
    expect(xml).not.toContain("<Stream")
  })
})
