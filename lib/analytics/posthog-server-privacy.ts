import { createHash } from "node:crypto"

import { isDirectIdentifierDistinctId } from "@/lib/analytics/posthog-privacy"

function analyticsDigest(value: string, length: number): string {
  return createHash("sha256")
    .update(`instantmed:posthog:v1:${value}`, "utf8")
    .digest("hex")
    .slice(0, length)
}

/**
 * A request UUID is high-entropy, but it is still an internal identifier.
 * Hash it before analytics so PostHog cannot be joined back to production
 * records by anyone who only has analytics access.
 */
export function getOpaquePostHogRequestId(requestId: string): string {
  return `ph_req_${analyticsDigest(`request:${requestId}`, 32)}`
}

export function getOpaquePostHogEventId(
  event: string,
  requestId: string,
): string {
  return `ph_evt_${analyticsDigest(`event:${event}:${requestId}`, 40)}`
}

export function resolvePersonlessPostHogDistinctId({
  anonymousId,
  requestId,
}: {
  anonymousId?: string | null
  requestId?: string | null
}): string {
  const normalizedAnonymousId = anonymousId?.trim()
  if (
    normalizedAnonymousId &&
    normalizedAnonymousId.length >= 8 &&
    normalizedAnonymousId.length <= 200 &&
    !isDirectIdentifierDistinctId(normalizedAnonymousId)
  ) {
    return normalizedAnonymousId
  }

  if (requestId) return getOpaquePostHogRequestId(requestId)
  return "ph_system_aggregate"
}
