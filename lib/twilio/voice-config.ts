type VoiceEnvironment = Readonly<Record<string, string | undefined>>

export interface TwilioVoiceReadiness {
  enabled: boolean
  missing: string[]
  ready: boolean
}

export function getTwilioVoiceReadiness(
  environment: VoiceEnvironment = process.env,
): TwilioVoiceReadiness {
  const enabled = environment.TWILIO_AI_VOICE_ENABLED === "true"
  if (!enabled) return { enabled: false, missing: [], ready: false }

  const missing = [
    environment.TWILIO_AUTH_TOKEN?.trim() ? null : "TWILIO_AUTH_TOKEN",
    environment.TWILIO_VOICE_PUBLIC_BASE_URL?.trim() ? null : "TWILIO_VOICE_PUBLIC_BASE_URL",
    (environment.TWILIO_VOICE_SESSION_SECRET?.trim().length ?? 0) >= 32
      ? null
      : "TWILIO_VOICE_SESSION_SECRET",
    environment.OPENAI_API_KEY?.trim() ? null : "OPENAI_API_KEY",
    environment.PHI_ENCRYPTION_ENABLED === "true" ? null : "PHI_ENCRYPTION_ENABLED=true",
    environment.PHI_ENCRYPTION_WRITE_ENABLED === "true" ? null : "PHI_ENCRYPTION_WRITE_ENABLED=true",
    environment.PHI_ENCRYPTION_READ_ENABLED === "true" ? null : "PHI_ENCRYPTION_READ_ENABLED=true",
    environment.PHI_MASTER_KEY?.trim() ? null : "PHI_MASTER_KEY",
    environment.UPSTASH_REDIS_REST_URL?.trim() ? null : "UPSTASH_REDIS_REST_URL",
    environment.UPSTASH_REDIS_REST_TOKEN?.trim() ? null : "UPSTASH_REDIS_REST_TOKEN",
  ].filter((value): value is string => Boolean(value))

  return { enabled, missing, ready: missing.length === 0 }
}
