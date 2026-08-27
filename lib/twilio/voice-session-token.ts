import "server-only"

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto"

import { z } from "zod"

const TOKEN_VERSION = "v1"
const IV_BYTES = 12
const MAX_TOKEN_AGE_MS = 5 * 60 * 1000

const sessionPayloadSchema = z.object({
  callSid: z.string().regex(/^CA[a-fA-F0-9]{32}$/),
  startedAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
})

export type TwilioVoiceSession = z.infer<typeof sessionPayloadSchema>

function getSessionKey(): Buffer {
  const secret = process.env.TWILIO_VOICE_SESSION_SECRET?.trim()
  if (!secret || secret.length < 32) {
    throw new Error("TWILIO_VOICE_SESSION_SECRET must contain at least 32 characters")
  }

  return createHash("sha256").update(secret, "utf8").digest()
}

export function createTwilioVoiceSessionToken(input: {
  callSid: string
  now?: Date
}): string {
  const now = input.now ?? new Date()
  const payload = sessionPayloadSchema.parse({
    callSid: input.callSid,
    startedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + MAX_TOKEN_AGE_MS).toISOString(),
  })

  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv("aes-256-gcm", getSessionKey(), iv)
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ])
  const tag = cipher.getAuthTag()

  return [TOKEN_VERSION, iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(".")
}

export function parseTwilioVoiceSessionToken(token: string, now: Date = new Date()): TwilioVoiceSession {
  const [version, ivValue, tagValue, ciphertextValue, ...extra] = token.split(".")
  if (
    version !== TOKEN_VERSION ||
    !ivValue ||
    !tagValue ||
    !ciphertextValue ||
    extra.length > 0
  ) {
    throw new Error("Invalid Twilio voice session token")
  }

  try {
    const decipher = createDecipheriv("aes-256-gcm", getSessionKey(), Buffer.from(ivValue, "base64url"))
    decipher.setAuthTag(Buffer.from(tagValue, "base64url"))
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(ciphertextValue, "base64url")),
      decipher.final(),
    ]).toString("utf8")
    const parsed = sessionPayloadSchema.parse(JSON.parse(plaintext))
    const expiresAt = Date.parse(parsed.expiresAt)
    const startedAt = Date.parse(parsed.startedAt)

    if (expiresAt <= now.getTime() || startedAt > now.getTime() + 30_000) {
      throw new Error("Expired Twilio voice session token")
    }

    return parsed
  } catch {
    throw new Error("Invalid or expired Twilio voice session token")
  }
}
