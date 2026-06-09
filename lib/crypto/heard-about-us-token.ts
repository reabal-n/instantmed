import crypto from "crypto"

/**
 * Signed token for the "How did you hear about us?" write path.
 *
 * Grants unauthenticated, write-once permission to set `heard_about_us` on ONE
 * specific intake. Needed because the answer comes from surfaces with no auth
 * cookie: the guest /auth/complete-account page and the one-click links in the
 * review-request email. Mirrors lib/crypto/checkout-resume-token.ts.
 *
 * TTL 30 days: the review-request email is sent 48-72h post-approval, so links
 * must stay valid well beyond that.
 */
const TOKEN_TTL_DAYS = 30
const TOKEN_TTL_MS = TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000

function getSecret(): string {
  const secret = process.env.INTERNAL_API_SECRET
  if (!secret) throw new Error("INTERNAL_API_SECRET is required for signed tokens")
  return secret
}

/** Sign a token: base64url(intakeId.timestamp.hmac). */
export function signHeardAboutUsToken(intakeId: string): string {
  const timestamp = Date.now().toString()
  const payload = `${intakeId}.${timestamp}`
  const hmac = crypto.createHmac("sha256", getSecret()).update(payload).digest("hex")
  return Buffer.from(`${payload}.${hmac}`).toString("base64url")
}

/** Verify and decode. Returns the intakeId if valid, null if tampered/expired. */
export function verifyHeardAboutUsToken(token: string): { intakeId: string } | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf-8")
    const parts = decoded.split(".")
    if (parts.length !== 3) return null

    const [intakeId, timestamp, providedHmac] = parts
    if (!intakeId || !timestamp || !providedHmac) return null

    const tokenAge = Date.now() - parseInt(timestamp, 10)
    if (isNaN(tokenAge) || tokenAge > TOKEN_TTL_MS || tokenAge < 0) return null

    const expectedHmac = crypto
      .createHmac("sha256", getSecret())
      .update(`${intakeId}.${timestamp}`)
      .digest("hex")

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
