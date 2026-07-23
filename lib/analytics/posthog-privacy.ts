import { normalizeFlowInstanceId } from "@/lib/analytics/flow-instance"
import { redactExternalAnalyticsPathname } from "@/lib/browser/sensitive-capability-path"
import { scrubPHI } from "@/lib/observability/scrub-phi"

const DIRECT_IDENTIFIER_RE =
  /(?:[\w.+-]+@[\w.-]+\.\w+|\b(?:\+?61|0)[2-9]\d{8}\b)/i

const URL_PROPERTY_KEYS = new Set([
  "$current_url",
  "$initial_current_url",
  "$referrer",
  "$initial_referrer",
  "landing_page",
  "referrer",
  "url",
])

const CONTROLLED_TECHNICAL_ID_KEYS = new Set([
  "adgroupid",
  "campaignid",
  "creative",
  "utmid",
])

const DROPPED_PROPERTY_KEYS = new Set([
  "actorid",
  "address",
  "addressline1",
  "addressline2",
  "authuserid",
  "blockreason",
  "certificateid",
  "dateofbirth",
  "details",
  "dob",
  "doctorid",
  "email",
  "emailaddress",
  "error",
  "firstname",
  "fullname",
  "gbraid",
  "gclid",
  "guestemail",
  "ihi",
  "ihinumber",
  "initialgbraid",
  "initialgclid",
  "initialwbraid",
  "intakeid",
  "keyword",
  "lastname",
  "medicare",
  "medicarenumber",
  "message",
  "mobile",
  "name",
  "notes",
  "patientid",
  "phone",
  "phonenumber",
  "profileid",
  "reason",
  "requestid",
  "searchquery",
  "sessionid",
  "set",
  "setonce",
  "stack",
  "targetdoctorid",
  "useremail",
  "userid",
  "utmterm",
  "wbraid",
])

export type CheckoutFailureCategory =
  | "availability_or_capacity"
  | "identity_or_session"
  | "payment_provider"
  | "persistence"
  | "pricing_or_configuration"
  | "rate_limit"
  | "validation"
  | "unknown"

function normalizePropertyKey(key: string): string {
  return key.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()
}

function shouldDropProperty(key: string): boolean {
  if (key === "distinct_id" || key === "$session_id" || key === "$window_id") {
    return false
  }

  return DROPPED_PROPERTY_KEYS.has(normalizePropertyKey(key))
}

/**
 * Keep route-level analytics while removing every query parameter and fragment.
 * Service/subtype/step dimensions are captured explicitly, so URL query strings
 * add privacy risk without adding useful funnel information.
 */
function sanitizePostHogUrl(value: string): string {
  try {
    const parsed = new URL(value)
    return `${parsed.origin}${redactExternalAnalyticsPathname(parsed.pathname)}`
  } catch {
    return scrubPHI(
      redactExternalAnalyticsPathname(value.split(/[?#]/, 1)[0] ?? ""),
    )
  }
}

function sanitizeValue(value: unknown, propertyKey: string): unknown {
  if (typeof value === "string") {
    if (URL_PROPERTY_KEYS.has(propertyKey)) return sanitizePostHogUrl(value)
    if (
      CONTROLLED_TECHNICAL_ID_KEYS.has(normalizePropertyKey(propertyKey)) &&
      /^[A-Za-z0-9_-]{1,128}$/.test(value)
    ) {
      return value
    }
    if (
      propertyKey === "distinct_id" ||
      propertyKey === "$session_id" ||
      propertyKey === "$window_id" ||
      propertyKey === "$insert_id"
    ) {
      return value
    }
    return scrubPHI(value)
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, propertyKey))
  }

  if (value && typeof value === "object") {
    return sanitizePostHogObject(value as Record<string, unknown>)
  }

  return value
}

function sanitizePostHogObject(
  properties: Record<string, unknown>,
): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(properties)) {
    if (shouldDropProperty(key)) continue
    if (normalizePropertyKey(key) === "flowinstanceid") {
      const flowInstanceId = normalizeFlowInstanceId(value)
      if (flowInstanceId) sanitized[key] = flowInstanceId
      continue
    }
    sanitized[key] = sanitizeValue(value, key)
  }

  return sanitized
}

/**
 * Product analytics is intentionally personless. These flags keep events
 * available for aggregate funnel analysis while preventing profile creation
 * and server-side GeoIP enrichment.
 */
export function sanitizePostHogProperties(
  properties: Record<string, unknown>,
): Record<string, unknown> {
  return {
    ...sanitizePostHogObject(properties),
    $process_person_profile: false,
    $geoip_disable: true,
  }
}

export function isDirectIdentifierDistinctId(value: unknown): boolean {
  return typeof value === "string" && DIRECT_IDENTIFIER_RE.test(value.trim())
}

/**
 * Preserve an actionable checkout-failure dimension without sending raw
 * server/user-facing error text to PostHog.
 */
export function classifyCheckoutFailure(
  error: string | null | undefined,
): CheckoutFailureCategory {
  const normalized = error?.trim().toLowerCase() ?? ""
  if (!normalized) return "unknown"

  if (/too many|high demand|rate limit/.test(normalized)) {
    return "rate_limit"
  }
  if (/temporarily unavailable|service not available|capacity/.test(normalized)) {
    return "availability_or_capacity"
  }
  if (
    /required|please provide|valid email|valid date of birth|under 18|18\+|agree to the terms|confirm your information/.test(
      normalized,
    )
  ) {
    return "validation"
  }
  if (
    /different email|does not match|already exists|sign in|request not found|newer saved request/.test(
      normalized,
    )
  ) {
    return "identity_or_session"
  }
  if (/pricing|price|configuration/.test(normalized)) {
    return "pricing_or_configuration"
  }
  if (/payment system|checkout session|stripe/.test(normalized)) {
    return "payment_provider"
  }
  if (
    /failed to save|failed to create|could not be found|permission denied/.test(
      normalized,
    )
  ) {
    return "persistence"
  }

  return "unknown"
}

type PostHogEventLike = {
  $set?: Record<string, unknown>
  $set_once?: Record<string, unknown>
  properties?: Record<string, unknown>
}

/**
 * Last-line client guard. A future accidental `identify(email)` capture is
 * discarded rather than creating an identifiable PostHog person.
 */
export function sanitizePostHogEvent<T extends PostHogEventLike>(
  event: T | null,
): T | null {
  if (!event) return event

  const distinctId = event.properties?.distinct_id
  if (isDirectIdentifierDistinctId(distinctId)) return null

  const {
    $set: _set,
    $set_once: _setOnce,
    ...eventWithoutPersonMutations
  } = event

  return {
    ...eventWithoutPersonMutations,
    properties: sanitizePostHogProperties(event.properties ?? {}),
  } as T
}
