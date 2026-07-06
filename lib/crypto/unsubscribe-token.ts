import crypto from "crypto"

// 90, not 30: the Spam Act s.18 minimum is 30 days, but an email opened on
// day 31 (incl. its List-Unsubscribe header) must still have a working link,
// so the functional window has to comfortably exceed the legal minimum.
const TOKEN_TTL_DAYS = 90
const TOKEN_TTL_MS = TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000

function getSecret(): string {
  const secret = process.env.INTERNAL_API_SECRET
  if (!secret) throw new Error("INTERNAL_API_SECRET is required for signed tokens")
  return secret
}

/**
 * Prefix that marks an email-keyed token (recipient has no profile, e.g.
 * partial-intake draft recovery). Profile ids are UUIDs (hex + dashes), so
 * the underscore makes collision with a real profileId impossible.
 */
const EMAIL_SUBJECT_PREFIX = "e_"

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
 * Sign an unsubscribe token keyed on a bare email address, for marketing
 * sends to recipients with no profile (Spam Act s18 requires a functional
 * unsubscribe for them too). The email is base64url-wrapped inside the
 * payload because emails contain dots, which are the payload separator.
 */
export function signEmailUnsubscribeToken(email: string): string {
  const normalized = email.trim().toLowerCase()
  const encoded = Buffer.from(normalized).toString("base64url")
  const timestamp = Date.now().toString()
  const payload = `${EMAIL_SUBJECT_PREFIX}${encoded}.${timestamp}`
  const hmac = crypto.createHmac("sha256", getSecret()).update(payload).digest("hex")
  return Buffer.from(`${payload}.${hmac}`).toString("base64url")
}

/**
 * Verify and decode an email-keyed unsubscribe token (see
 * signEmailUnsubscribeToken). Returns the normalized email, or null for
 * profile tokens / tampered / expired input.
 */
export function verifyEmailUnsubscribeToken(token: string): { email: string } | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf-8")
    const parts = decoded.split(".")
    if (parts.length !== 3) return null

    const [subject, timestamp, providedHmac] = parts
    if (!subject?.startsWith(EMAIL_SUBJECT_PREFIX) || !timestamp || !providedHmac) return null

    const tokenAge = Date.now() - parseInt(timestamp, 10)
    if (isNaN(tokenAge) || tokenAge > TOKEN_TTL_MS || tokenAge < 0) return null

    const payload = `${subject}.${timestamp}`
    const expectedHmac = crypto.createHmac("sha256", getSecret()).update(payload).digest("hex")
    if (providedHmac.length !== expectedHmac.length) return null
    if (!crypto.timingSafeEqual(Buffer.from(providedHmac), Buffer.from(expectedHmac))) return null

    const email = Buffer.from(subject.slice(EMAIL_SUBJECT_PREFIX.length), "base64url").toString("utf-8")
    if (!email.includes("@")) return null
    return { email }
  } catch {
    return null
  }
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
    // Email-keyed tokens are verified by verifyEmailUnsubscribeToken, never here.
    if (profileId.startsWith(EMAIL_SUBJECT_PREFIX)) return null

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
