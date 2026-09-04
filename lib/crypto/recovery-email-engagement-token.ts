import crypto from "crypto"

const TOKEN_PURPOSE = "recovery-email"
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000

function getSecret(): string {
  const secret = process.env.INTERNAL_API_SECRET
  if (!secret) throw new Error("INTERNAL_API_SECRET is required for signed tokens")
  return secret
}

export function signRecoveryEmailEngagementToken(intakeId: string): string {
  const timestamp = Date.now().toString()
  const payload = `${TOKEN_PURPOSE}.${intakeId}.${timestamp}`
  const hmac = crypto.createHmac("sha256", getSecret()).update(payload).digest("hex")
  return Buffer.from(`${payload}.${hmac}`).toString("base64url")
}

export function verifyRecoveryEmailEngagementToken(
  token: string,
): { intakeId: string } | null {
  try {
    const [purpose, intakeId, timestamp, providedHmac, ...extra] = Buffer
      .from(token, "base64url")
      .toString("utf-8")
      .split(".")
    if (
      purpose !== TOKEN_PURPOSE ||
      !intakeId ||
      !timestamp ||
      !providedHmac ||
      extra.length > 0
    ) {
      return null
    }

    const tokenAge = Date.now() - Number.parseInt(timestamp, 10)
    if (!Number.isFinite(tokenAge) || tokenAge < 0 || tokenAge > TOKEN_TTL_MS) {
      return null
    }

    const payload = `${TOKEN_PURPOSE}.${intakeId}.${timestamp}`
    const expectedHmac = crypto.createHmac("sha256", getSecret()).update(payload).digest("hex")
    if (providedHmac.length !== expectedHmac.length) return null
    if (!crypto.timingSafeEqual(Buffer.from(providedHmac), Buffer.from(expectedHmac))) {
      return null
    }

    return { intakeId }
  } catch {
    return null
  }
}
