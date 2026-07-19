const FLOW_INSTANCE_ID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function normalizeFlowInstanceId(value: unknown): string | null {
  if (typeof value !== "string") return null
  const normalized = value.trim().toLowerCase()
  return FLOW_INSTANCE_ID_REGEX.test(normalized) ? normalized : null
}

function createFlowInstanceId(): string {
  const cryptoApi = globalThis.crypto
  if (typeof cryptoApi?.randomUUID === "function") {
    return cryptoApi.randomUUID()
  }

  if (typeof cryptoApi?.getRandomValues === "function") {
    const bytes = cryptoApi.getRandomValues(new Uint8Array(16))
    bytes[6] = (bytes[6] & 0x0f) | 0x40
    bytes[8] = (bytes[8] & 0x3f) | 0x80
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")
    return [
      hex.slice(0, 8),
      hex.slice(8, 12),
      hex.slice(12, 16),
      hex.slice(16, 20),
      hex.slice(20),
    ].join("-")
  }

  throw new Error("Secure random UUID generation is unavailable")
}

/**
 * Restore a valid existing attempt id or mint a fresh one. A missing Web
 * Crypto implementation is tolerated so analytics can never block intake.
 */
export function ensureFlowInstanceId(value: unknown): string | null {
  const existing = normalizeFlowInstanceId(value)
  if (existing) return existing

  try {
    return createFlowInstanceId()
  } catch {
    return null
  }
}
