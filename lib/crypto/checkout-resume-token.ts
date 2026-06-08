import crypto from "crypto"

const TOKEN_TTL_DAYS = 7
const TOKEN_TTL_MS = TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000

function getSecret(): string {
  const secret = process.env.INTERNAL_API_SECRET
  if (!secret) throw new Error("INTERNAL_API_SECRET is required for signed tokens")
  return secret
}

/**
 * Sign a checkout resume token: base64url(intakeId.timestamp.hmac)
 * Grants unauthenticated access to resume/retry a specific guest checkout.
 * TTL: 7 days (aligned with abandoned checkout recovery window).
 */
export function signCheckoutResumeToken(intakeId: string): string {
  const timestamp = Date.now().toString()
  const payload = `${intakeId}.${timestamp}`
  const hmac = crypto.createHmac("sha256", getSecret()).update(payload).digest("hex")
  const token = `${payload}.${hmac}`
  return Buffer.from(token).toString("base64url")
}

/**
 * Verify and decode a checkout resume token.
 * Returns the intakeId if valid, null if tampered or expired.
 */
export function verifyCheckoutResumeToken(token: string): { intakeId: string } | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf-8")
    const parts = decoded.split(".")
    if (parts.length !== 3) return null

    const [intakeId, timestamp, providedHmac] = parts
    if (!intakeId || !timestamp || !providedHmac) return null

    const tokenAge = Date.now() - parseInt(timestamp, 10)
    if (isNaN(tokenAge) || tokenAge > TOKEN_TTL_MS || tokenAge < 0) return null

    const payload = `${intakeId}.${timestamp}`
    const expectedHmac = crypto.createHmac("sha256", getSecret()).update(payload).digest("hex")

    if (providedHmac.length !== expectedHmac.length) return null
    const isValid = crypto.timingSafeEqual(
      Buffer.from(providedHmac),
      Buffer.from(expectedHmac),
    )
    if (!isValid) return null

    return { intakeId }
  } catch {
    return null
  }
}
