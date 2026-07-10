import "server-only"

import { decryptField, encryptField } from "@/lib/security/encryption"

export const FROZEN_PROVIDER_PAYLOAD_KEY = "_provider_payload_enc"

export type ResendProviderPayload = Record<string, unknown>

function isProviderPayload(value: unknown): value is ResendProviderPayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false

  const payload = value as Record<string, unknown>
  return (
    typeof payload.from === "string" &&
    Array.isArray(payload.to) &&
    payload.to.every((recipient) => typeof recipient === "string") &&
    typeof payload.subject === "string" &&
    typeof payload.html === "string" &&
    typeof payload.text === "string"
  )
}

/**
 * Freeze the exact Resend request body before the outbox row is created.
 * The ciphertext may live in outbox metadata; plaintext email HTML, links,
 * and patient details must never be stored there.
 */
export function freezeResendProviderPayload(payload: ResendProviderPayload): string {
  return encryptField(payload)
}

export function hasFrozenResendProviderPayload(
  metadata: Record<string, unknown> | null | undefined,
): boolean {
  return typeof metadata?.[FROZEN_PROVIDER_PAYLOAD_KEY] === "string"
}

/**
 * Read a frozen provider body. Returns null for missing, corrupt, or malformed
 * ciphertext so callers can fail closed rather than regenerate a different
 * body under the same provider idempotency key.
 */
export function readFrozenResendProviderPayload(
  metadata: Record<string, unknown> | null | undefined,
): ResendProviderPayload | null {
  const encrypted = metadata?.[FROZEN_PROVIDER_PAYLOAD_KEY]
  if (typeof encrypted !== "string" || !encrypted) return null

  try {
    const payload = decryptField<ResendProviderPayload>(encrypted, true)
    return isProviderPayload(payload) ? payload : null
  } catch {
    return null
  }
}
