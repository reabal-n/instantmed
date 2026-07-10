import "server-only"

import crypto from "crypto"

const TOKEN_VERSION = "v1"
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000

function getSecret(): string {
  const secret = process.env.INTERNAL_API_SECRET
  if (!secret) {
    throw new Error("INTERNAL_API_SECRET is required for employer certificate links")
  }
  return secret
}

export function getEmployerCertificateStorageVersion(storagePath: string): string {
  return crypto.createHash("sha256").update(storagePath).digest("hex").slice(0, 32)
}

export function signEmployerCertificateToken(
  certificateId: string,
  storagePath: string,
): string {
  const issuedAt = Date.now().toString()
  const storageVersion = getEmployerCertificateStorageVersion(storagePath)
  const payload = `${TOKEN_VERSION}.${certificateId}.${storageVersion}.${issuedAt}`
  const signature = crypto.createHmac("sha256", getSecret()).update(payload).digest("hex")
  return Buffer.from(`${payload}.${signature}`).toString("base64url")
}

export function verifyEmployerCertificateToken(token: string): {
  certificateId: string
  storageVersion: string
} | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8")
    const [version, certificateId, storageVersion, issuedAt, providedSignature, ...rest] = decoded.split(".")
    if (
      rest.length > 0 ||
      version !== TOKEN_VERSION ||
      !certificateId ||
      !/^[0-9a-f]{32}$/.test(storageVersion ?? "") ||
      !issuedAt ||
      !/^[0-9a-f]{64}$/.test(providedSignature ?? "")
    ) {
      return null
    }

    const issuedAtMs = Number(issuedAt)
    const age = Date.now() - issuedAtMs
    if (!Number.isSafeInteger(issuedAtMs) || age < 0 || age > TOKEN_TTL_MS) {
      return null
    }

    const payload = `${version}.${certificateId}.${storageVersion}.${issuedAt}`
    const expectedSignature = crypto
      .createHmac("sha256", getSecret())
      .update(payload)
      .digest("hex")
    if (!crypto.timingSafeEqual(
      Buffer.from(providedSignature, "hex"),
      Buffer.from(expectedSignature, "hex"),
    )) {
      return null
    }

    return { certificateId, storageVersion }
  } catch {
    return null
  }
}

export function getEmployerCertificateDownloadHref(
  certificateId: string,
  storagePath: string,
): string {
  const token = signEmployerCertificateToken(certificateId, storagePath)
  return `/api/employer/certificates/${certificateId}/download?token=${encodeURIComponent(token)}`
}
