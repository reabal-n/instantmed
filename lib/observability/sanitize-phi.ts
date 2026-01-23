/**
 * PHI Sanitization Utilities
 * 
 * CRITICAL: All error logging must sanitize potential PHI before transmission.
 * This protects patient data in compliance with:
 * - Privacy Act 1988 (Australia)
 * - AHPRA guidelines
 * - APPs (Australian Privacy Principles)
 */

// Patterns that may contain PHI
const PHI_PATTERNS = {
  // Medicare number: 10-11 digits
  medicare: /\b\d{10,11}\b/g,
  // Phone numbers: various AU formats
  phone: /\b(?:\+?61|0)[2-478](?:[ -]?\d){8}\b/g,
  // Email addresses
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  // Date of birth patterns: DD/MM/YYYY, YYYY-MM-DD, etc.
  dob: /\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2})\b/g,
  // Names in common contexts (after "name:", "patient:", etc.)
  namedPatterns: /(?:name|patient|user|doctor)[:\s]+["']?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,
  // Street addresses
  address: /\b\d+\s+[A-Za-z]+\s+(?:St|Street|Rd|Road|Ave|Avenue|Dr|Drive|Ct|Court|Pl|Place|Ln|Lane|Way|Blvd|Boulevard)\b/gi,
  // IHI (Individual Healthcare Identifier): 16 digits
  ihi: /\b800360\d{10}\b/g,
  // DVA numbers
  dva: /\b[NVQSTW][A-Z]?\d{6,8}[A-Z]?\b/gi,
  // Prescription numbers
  scriptNumber: /\b(?:script|rx|prescription)[:\s#]*\d{6,}\b/gi,
}

const REDACTED = "[REDACTED]"

/**
 * Sanitize a string by removing potential PHI
 */
export function sanitizeString(input: string): string {
  if (!input || typeof input !== "string") return input

  let sanitized = input

  // Apply all PHI patterns
  Object.values(PHI_PATTERNS).forEach(pattern => {
    sanitized = sanitized.replace(pattern, REDACTED)
  })

  return sanitized
}

/**
 * Sanitize an object recursively
 * Handles nested objects and arrays
 */
export function sanitizeObject<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj

  if (typeof obj === "string") {
    return sanitizeString(obj) as T
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item)) as T
  }

  if (typeof obj === "object") {
    const sanitized: Record<string, unknown> = {}
    
    for (const [key, value] of Object.entries(obj)) {
      // Completely redact known PHI fields
      const sensitiveFields = [
        "medicare", "medicareNumber", "medicare_number",
        "phone", "phoneNumber", "phone_number", "mobile",
        "email", "emailAddress", "email_address",
        "dob", "dateOfBirth", "date_of_birth", "birthDate",
        "name", "fullName", "full_name", "firstName", "lastName",
        "first_name", "last_name", "patientName", "patient_name",
        "address", "streetAddress", "street_address",
        "ihi", "dva", "dvaNumber", "dva_number",
        "password", "token", "secret", "apiKey", "api_key",
      ]

      if (sensitiveFields.includes(key.toLowerCase())) {
        sanitized[key] = REDACTED
      } else {
        sanitized[key] = sanitizeObject(value)
      }
    }

    return sanitized as T
  }

  return obj
}

/**
 * Sanitize error for logging
 * Removes PHI from error message and stack trace
 */
export function sanitizeError(error: Error & { digest?: string }): {
  name: string
  message: string
  digest?: string
  stack?: string
} {
  return {
    name: error.name,
    message: sanitizeString(error.message),
    digest: error.digest,
    // Stack traces shouldn't contain PHI but sanitize anyway
    stack: error.stack ? sanitizeString(error.stack) : undefined,
  }
}

/**
 * Sanitize URL by removing query params that may contain PHI
 */
export function sanitizeUrl(url: string): string {
  if (!url) return url

  try {
    const parsed = new URL(url)
    
    // Remove sensitive query params
    const sensitiveParams = [
      "email", "phone", "name", "medicare", "dob", "address",
      "token", "code", "secret", "password",
    ]
    
    sensitiveParams.forEach(param => {
      if (parsed.searchParams.has(param)) {
        parsed.searchParams.set(param, REDACTED)
      }
    })

    // Also check for params containing these as substrings
    const paramsToRedact: string[] = []
    parsed.searchParams.forEach((_, key) => {
      const lowerKey = key.toLowerCase()
      if (sensitiveParams.some(s => lowerKey.includes(s))) {
        paramsToRedact.push(key)
      }
    })
    
    paramsToRedact.forEach(key => {
      parsed.searchParams.set(key, REDACTED)
    })

    return parsed.toString()
  } catch {
    // Invalid URL, sanitize as string
    return sanitizeString(url)
  }
}

/**
 * Create a safe logging context
 * Use this before any external logging (Sentry, PostHog, etc.)
 */
export function createSafeLogContext(context: Record<string, unknown>): Record<string, unknown> {
  // Never log these fields at all
  const forbiddenFields = ["password", "token", "secret", "apiKey", "api_key", "authorization"]
  
  const filtered: Record<string, unknown> = {}
  
  for (const [key, value] of Object.entries(context)) {
    if (!forbiddenFields.includes(key.toLowerCase())) {
      filtered[key] = sanitizeObject(value)
    }
  }

  // Sanitize URL if present
  if (typeof filtered.url === "string") {
    filtered.url = sanitizeUrl(filtered.url)
  }

  return filtered
}
