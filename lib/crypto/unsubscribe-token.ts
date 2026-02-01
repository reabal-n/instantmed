import crypto from "crypto"

const TOKEN_TTL_DAYS = 30
const TOKEN_TTL_MS = TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000

function getSecret(): string {
  const secret = process.env.INTERNAL_API_SECRET
  if (!secret) throw new Error("INTERNAL_API_SECRET is required for signed tokens")
  return secret
}

/**
 * Sign an unsubscribe token: base64url(profileId.timestamp.hmac)
 */
export function signUnsubscribeToken(profileId: string): string {
  const timestamp = Date.now().toString()
  const payload = `${profileId}.${timestamp}`
  const hmac = crypto.createHmac("sha256", getSecret()).update(payload).digest("hex")
  const token = `${payload}.${hmac}`
  return Buffer.from(token).toString("base64url")
}

/**
 * Verify and decode an unsubscribe token.
 * Returns the profileId if valid, null if tampered or expired.
 */
export function verifyUnsubscribeToken(token: string): { profileId: string } | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf-8")
    const parts = decoded.split(".")
    if (parts.length !== 3) return null

    const [profileId, timestamp, providedHmac] = parts
    if (!profileId || !timestamp || !providedHmac) return null

    // Check expiry
    const tokenAge = Date.now() - parseInt(timestamp, 10)
    if (isNaN(tokenAge) || tokenAge > TOKEN_TTL_MS || tokenAge < 0) return null

    // Verify HMAC
    const payload = `${profileId}.${timestamp}`
    const expectedHmac = crypto.createHmac("sha256", getSecret()).update(payload).digest("hex")

    if (providedHmac.length !== expectedHmac.length) return null
    const isValid = crypto.timingSafeEqual(
      Buffer.from(providedHmac),
      Buffer.from(expectedHmac),
    )
    if (!isValid) return null

    return { profileId }
  } catch {
    return null
  }
}
