/**
 * PHI Scrubbing Utilities for Sentry
 *
 * Shared across server and client Sentry initialization.
 * Masks personally identifiable health information before
 * events leave the application boundary.
 */

/** Australian phone numbers: 04xx xxx xxx, 0x xxxx xxxx, +614xxxxxxxx */
const PHONE_RE = /\b(?:\+?61|0)[2-9]\d{8}\b/g

/** Medicare numbers: 10-11 digits (with optional check digit) */
const MEDICARE_RE = /\b\d{10,11}\b/g

/** Email addresses */
const EMAIL_RE = /[\w.+-]+@[\w.-]+\.\w+/g

/** Date of birth patterns: dd/mm/yyyy, yyyy-mm-dd, dd-mm-yyyy */
const DOB_RE = /\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2})\b/g

/** UUIDs and locally named request/profile identifiers */
const UUID_RE = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi
const NAMED_ID_RE = /\b(?:actor|certificate|doctor|intake|patient|profile|request|user)-[A-Za-z0-9_-]+\b/g

/** Route/query locations that often carry patient/request identifiers */
const SENSITIVE_QUERY_ID_RE = /([?&](?:certificate_id|intake_id|patient_id|profile_id|request_id|user_id|id)=)[^&#]+/gi
const SENSITIVE_PATH_ID_RE = /(\/(?:api\/certificates|api\/doctor\/certificates|api\/patient\/documents|certificates|doctor\/intakes|doctor\/patients|patient\/documents|patient\/followups|patient\/intakes|track|verify)\/)[^/?#]+/gi

const REDACTED = "[REDACTED]"
const ID_REDACTED = "[ID_REDACTED]"

const SENSITIVE_HEADER_KEYS = new Set([
  "authorization",
  "cookie",
  "xforwardedfor",
  "xrealip",
  "xclientip",
])

const SENSITIVE_KEY_EXACT = new Set([
  "address",
  "answer",
  "answers",
  "birthdate",
  "body",
  "clinicalnote",
  "clinicalnotes",
  "content",
  "dateofbirth",
  "diagnosis",
  "dob",
  "email",
  "familyname",
  "firstname",
  "fullname",
  "givenname",
  "lastname",
  "medicalhistory",
  "medicare",
  "medicarenumber",
  "message",
  "messages",
  "mobile",
  "notes",
  "patientemail",
  "patientname",
  "phone",
  "phonenumber",
  "recipientemail",
  "recipientname",
  "subject",
  "symptoms",
  "title",
])

const SENSITIVE_IDENTIFIER_KEYS = new Set([
  "certificateid",
  "certificate_id",
  "actorid",
  "actor_id",
  "doctorid",
  "doctor_id",
  "intakeid",
  "intake_id",
  "patientid",
  "patient_id",
  "profileid",
  "profile_id",
  "requestid",
  "request_id",
  "targetdoctorid",
  "userid",
  "user_id",
])

function normalizeKey(key: string): string {
  return key.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()
}

function shouldRedactKey(key: string): boolean {
  const normalized = normalizeKey(key)

  if (SENSITIVE_KEY_EXACT.has(normalized)) return true
  if (SENSITIVE_IDENTIFIER_KEYS.has(key) || SENSITIVE_IDENTIFIER_KEYS.has(normalized)) return true

  if (normalized.includes("medicare")) return true
  if (normalized.includes("birth") && normalized.includes("date")) return true
  if (normalized.includes("recipient") && normalized.includes("name")) return true
  if (normalized.includes("patient") && (
    normalized.includes("email") ||
    normalized.includes("name") ||
    normalized.includes("phone") ||
    normalized.includes("address")
  )) return true
  if (normalized.includes("message")) return true
  if (normalized.includes("note") && !normalized.includes("notification")) return true
  if (normalized.includes("answer")) return true
  if (normalized.includes("symptom")) return true
  if (normalized.includes("diagnosis")) return true
  if (normalized.includes("clinical")) return true
  if (normalized.includes("medical") && !normalized.includes("medicalcertificate")) return true

  return false
}

function scrubHeaders(headers: Record<string, unknown>): Record<string, unknown> {
  const scrubbed: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(headers)) {
    if (SENSITIVE_HEADER_KEYS.has(normalizeKey(key))) continue
    scrubbed[key] = scrubPHIFromObject(value)
  }
  return scrubbed
}

/**
 * Scrub PHI patterns from a string.
 * Returns the string with sensitive patterns replaced by redaction markers.
 */
export function scrubPHI(text: string): string {
  return text
    .replace(SENSITIVE_QUERY_ID_RE, `$1${ID_REDACTED}`)
    .replace(SENSITIVE_PATH_ID_RE, `$1${ID_REDACTED}`)
    .replace(UUID_RE, ID_REDACTED)
    .replace(NAMED_ID_RE, ID_REDACTED)
    .replace(EMAIL_RE, "[EMAIL_REDACTED]")
    .replace(PHONE_RE, "[PHONE_REDACTED]")
    .replace(MEDICARE_RE, "[MEDICARE_REDACTED]")
    .replace(DOB_RE, "[DATE_REDACTED]")
}

/**
 * Recursively scrub PHI from an object's string values.
 * Operates on plain objects and arrays only - ignores class instances.
 * Returns a shallow-ish copy; mutates nothing.
 */
export function scrubPHIFromObject(obj: unknown): unknown {
  if (typeof obj === "string") return scrubPHI(obj)
  if (Array.isArray(obj)) return obj.map(scrubPHIFromObject)
  if (obj && typeof obj === "object" && Object.getPrototypeOf(obj) === Object.prototype) {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(obj)) {
      out[k] = shouldRedactKey(k) ? REDACTED : scrubPHIFromObject(v)
    }
    return out
  }
  return obj
}

export interface SentryBreadcrumbLike {
  message?: string
  data?: unknown
}

export interface SentryEventLike {
  message?: string
  exception?: {
    values?: Array<{
      value?: string
    }>
  }
  request?: {
    headers?: Record<string, unknown>
    url?: string
    data?: unknown
    query_string?: unknown
  }
  tags?: Record<string, unknown>
  user?: Record<string, unknown>
  extra?: Record<string, unknown>
  contexts?: Record<string, unknown>
  breadcrumbs?: SentryBreadcrumbLike[]
}

export function scrubSentryBreadcrumb<T>(breadcrumb: T): T {
  const mutable = breadcrumb as SentryBreadcrumbLike
  if (mutable.message) mutable.message = scrubPHI(mutable.message)
  if (mutable.data) mutable.data = scrubPHIFromObject(mutable.data)
  return breadcrumb
}

export function scrubSentryEvent<T>(event: T): T {
  const mutable = event as SentryEventLike
  if (mutable.message) {
    mutable.message = scrubPHI(mutable.message)
  }
  if (mutable.exception?.values) {
    mutable.exception.values = mutable.exception.values.map(value => ({
      ...value,
      value: value.value ? scrubPHI(value.value) : value.value,
    }))
  }
  if (mutable.request?.headers) {
    mutable.request.headers = scrubHeaders(mutable.request.headers)
  }
  if (mutable.request?.url) {
    mutable.request.url = scrubPHI(mutable.request.url)
  }
  if (mutable.request?.data) {
    mutable.request.data = scrubPHIFromObject(mutable.request.data)
  }
  if (mutable.request?.query_string) {
    mutable.request.query_string = typeof mutable.request.query_string === "string"
      ? scrubPHI(mutable.request.query_string)
      : scrubPHIFromObject(mutable.request.query_string)
  }
  if (mutable.tags) {
    mutable.tags = scrubPHIFromObject(mutable.tags) as Record<string, unknown>
  }
  if (mutable.user) {
    mutable.user = scrubPHIFromObject(mutable.user) as Record<string, unknown>
    if ("id" in mutable.user) mutable.user.id = REDACTED
    if ("username" in mutable.user) mutable.user.username = REDACTED
  }
  if (mutable.extra) {
    mutable.extra = scrubPHIFromObject(mutable.extra) as Record<string, unknown>
  }
  if (mutable.contexts) {
    mutable.contexts = scrubPHIFromObject(mutable.contexts) as Record<string, unknown>
  }
  if (mutable.breadcrumbs) {
    mutable.breadcrumbs = mutable.breadcrumbs.map(scrubSentryBreadcrumb)
  }
  return event
}
