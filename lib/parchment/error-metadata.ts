export type ParchmentErrorReason =
  | "health_services_directory_validation"
  | "validation"
  | "unknown"

export interface ParchmentErrorMetadata {
  code?: string
  reason: ParchmentErrorReason
  requestId?: string
  safeDetail?: string
}

const SAFE_ERROR_TOKEN_RE = /^[A-Za-z0-9_-]{1,128}$/
const HSD_ERROR_DETAILS = new Set([
  "The record could not be validated against the Health Servies Directory",
  "The record could not be validated against the Health Services Directory",
])

/**
 * Extract only allow-listed, PHI-safe metadata from a Parchment error body.
 * Provider response detail is otherwise discarded because it can contain
 * patient-supplied values.
 */
export function parseParchmentErrorMetadata(body: string): ParchmentErrorMetadata {
  try {
    const parsed = JSON.parse(body) as {
      code?: unknown
      requestId?: unknown
      error?: { detail?: unknown; validation?: unknown }
    }
    const code = typeof parsed.code === "string" && SAFE_ERROR_TOKEN_RE.test(parsed.code)
      ? parsed.code
      : undefined
    const requestId = typeof parsed.requestId === "string" && SAFE_ERROR_TOKEN_RE.test(parsed.requestId)
      ? parsed.requestId
      : undefined
    const detail = typeof parsed.error?.detail === "string" ? parsed.error.detail : undefined

    if (detail && HSD_ERROR_DETAILS.has(detail)) {
      return {
        ...(code ? { code } : {}),
        reason: "health_services_directory_validation",
        ...(requestId ? { requestId } : {}),
        safeDetail: "The record could not be validated against the Health Services Directory.",
      }
    }

    return {
      ...(code ? { code } : {}),
      reason: Array.isArray(parsed.error?.validation) ? "validation" : "unknown",
      ...(requestId ? { requestId } : {}),
    }
  } catch {
    return { reason: "unknown" }
  }
}
