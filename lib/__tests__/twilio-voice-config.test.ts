import { describe, expect, it } from "vitest"

import { getTwilioVoiceReadiness } from "@/lib/twilio/voice-config"

const configured = {
  OPENAI_API_KEY: "openai-key",
  PHI_ENCRYPTION_ENABLED: "true",
  PHI_ENCRYPTION_READ_ENABLED: "true",
  PHI_ENCRYPTION_WRITE_ENABLED: "true",
  PHI_MASTER_KEY: "base64-master-key",
  TWILIO_AI_VOICE_ENABLED: "true",
  TWILIO_AUTH_TOKEN: "auth-token",
  TWILIO_VOICE_PUBLIC_BASE_URL: "https://instantmed.com.au",
  TWILIO_VOICE_SESSION_SECRET: "session-secret-with-at-least-32-characters",
}

describe("Twilio AI voice readiness", () => {
  it("ships disabled by default", () => {
    expect(getTwilioVoiceReadiness({})).toEqual({
      enabled: false,
      missing: [],
      ready: false,
    })
  })

  it("requires AI, webhook, session, and PHI encryption controls when enabled", () => {
    expect(getTwilioVoiceReadiness({ TWILIO_AI_VOICE_ENABLED: "true" })).toEqual({
      enabled: true,
      missing: [
        "TWILIO_AUTH_TOKEN",
        "TWILIO_VOICE_PUBLIC_BASE_URL",
        "TWILIO_VOICE_SESSION_SECRET",
        "OPENAI_API_KEY",
        "PHI_ENCRYPTION_ENABLED=true",
        "PHI_ENCRYPTION_WRITE_ENABLED=true",
        "PHI_ENCRYPTION_READ_ENABLED=true",
        "PHI_MASTER_KEY",
      ],
      ready: false,
    })
  })

  it("is ready only with the full configuration", () => {
    expect(getTwilioVoiceReadiness(configured)).toEqual({
      enabled: true,
      missing: [],
      ready: true,
    })
  })
})
