import "server-only"

import crypto from "crypto"

const TOKEN_PURPOSE = "patient-request-access-v1"
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000
const TOKEN_RE = /^[A-Za-z0-9_-]{1,512}$/
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export const PATIENT_REQUEST_ACCESS_COOKIE = "instantmed_patient_request_access"
export const PATIENT_REQUEST_ACCESS_MAX_AGE_SECONDS = 7 * 24 * 60 * 60

function getSecret(): string {
  const secret = process.env.INTERNAL_API_SECRET
  if (!secret) throw new Error("INTERNAL_API_SECRET is required for signed tokens")
  return secret
}

/**
 * Short-lived capability delivered only inside a transactional patient email.
 * It authorizes the narrow request-access projection, never a general patient
 * session, document download, checkout mutation, or raw intake read.
 */
function signToken(purpose: string, intakeId: string): string {
  if (!UUID_RE.test(intakeId)) throw new Error("A valid intake id is required")

  const issuedAt = Date.now().toString()
  const payload = `${purpose}.${intakeId}.${issuedAt}`
  const signature = crypto.createHmac("sha256", getSecret()).update(payload).digest("hex")

  return Buffer.from(`${payload}.${signature}`).toString("base64url")
}

function verifyToken(
  token: string,
  purpose: string,
  ttlMs: number,
): { intakeId: string } | null {
  try {
    if (!TOKEN_RE.test(token)) return null

    const decoded = Buffer.from(token, "base64url").toString("utf8")
    const parts = decoded.split(".")
    if (parts.length !== 4) return null

    const [encodedPurpose, intakeId, issuedAt, providedSignature] = parts
    if (
      encodedPurpose !== purpose ||
      !UUID_RE.test(intakeId) ||
      !/^\d{13}$/.test(issuedAt) ||
      !providedSignature
    ) return null

    const issuedAtMs = Number(issuedAt)
    const ageMs = Date.now() - issuedAtMs
    if (!Number.isFinite(ageMs) || ageMs < 0 || ageMs > ttlMs) return null

    const payload = `${encodedPurpose}.${intakeId}.${issuedAt}`
    const expectedSignature = crypto.createHmac("sha256", getSecret()).update(payload).digest("hex")
    if (providedSignature.length !== expectedSignature.length) return null

    const isValid = crypto.timingSafeEqual(
      Buffer.from(providedSignature),
      Buffer.from(expectedSignature),
    )

    return isValid ? { intakeId } : null
  } catch {
    return null
  }
}

export function signPatientRequestAccessToken(intakeId: string): string {
  return signToken(TOKEN_PURPOSE, intakeId)
}

export function verifyPatientRequestAccessToken(token: string): { intakeId: string } | null {
  return verifyToken(token, TOKEN_PURPOSE, TOKEN_TTL_MS)
}
