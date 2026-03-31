import crypto from "crypto"

const TOKEN_TTL_DAYS = 90
const TOKEN_TTL_MS = TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000

function getSecret(): string {
  const secret = process.env.INTERNAL_API_SECRET
  if (!secret) throw new Error("INTERNAL_API_SECRET is required for signed tokens")
  return secret
}

/**
 * Sign a token containing a capture ID and action.
 * Used for exit-intent unsubscribe links and open tracking pixels.
 * Format: base64url(captureId.action.timestamp.hmac)
 */
export function signExitIntentToken(captureId: string, action: "unsubscribe" | "open"): string {
  const timestamp = Date.now().toString()
  const payload = `${captureId}.${action}.${timestamp}`
  const hmac = crypto.createHmac("sha256", getSecret()).update(payload).digest("hex")
  const token = `${payload}.${hmac}`
  return Buffer.from(token).toString("base64url")
}

/**
 * Verify and decode an exit-intent token.
 * Returns captureId and action if valid, null if tampered or expired.
 */
export function verifyExitIntentToken(
  token: string
): { captureId: string; action: "unsubscribe" | "open" } | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf-8")
    const parts = decoded.split(".")
    if (parts.length !== 4) return null

    const [captureId, action, timestamp, providedHmac] = parts
    if (!captureId || !action || !timestamp || !providedHmac) return null
    if (action !== "unsubscribe" && action !== "open") return null

    // Check expiry
    const tokenAge = Date.now() - parseInt(timestamp, 10)
    if (isNaN(tokenAge) || tokenAge > TOKEN_TTL_MS || tokenAge < 0) return null

    // Verify HMAC
    const payload = `${captureId}.${action}.${timestamp}`
    const expectedHmac = crypto.createHmac("sha256", getSecret()).update(payload).digest("hex")

    if (providedHmac.length !== expectedHmac.length) return null
    const isValid = crypto.timingSafeEqual(
      Buffer.from(providedHmac),
      Buffer.from(expectedHmac),
    )
    if (!isValid) return null

    return { captureId, action: action as "unsubscribe" | "open" }
  } catch {
    return null
  }
}
