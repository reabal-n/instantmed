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

/**
 * Scrub PHI patterns from a string.
 * Returns the string with sensitive patterns replaced by redaction markers.
 */
export function scrubPHI(text: string): string {
  return text
    .replace(EMAIL_RE, "[EMAIL_REDACTED]")
    .replace(PHONE_RE, "[PHONE_REDACTED]")
    .replace(MEDICARE_RE, "[MEDICARE_REDACTED]")
    .replace(DOB_RE, "[DATE_REDACTED]")
}

/**
 * Recursively scrub PHI from an object's string values.
 * Operates on plain objects and arrays only — ignores class instances.
 * Returns a shallow-ish copy; mutates nothing.
 */
export function scrubPHIFromObject(obj: unknown): unknown {
  if (typeof obj === "string") return scrubPHI(obj)
  if (Array.isArray(obj)) return obj.map(scrubPHIFromObject)
  if (obj && typeof obj === "object" && Object.getPrototypeOf(obj) === Object.prototype) {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(obj)) {
      out[k] = scrubPHIFromObject(v)
    }
    return out
  }
  return obj
}
