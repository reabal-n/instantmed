import { z } from "zod"

/**
 * Common sanitization patterns
 */
const PATTERNS = {
  // Remove HTML tags
  html: /<[^>]*>/g,
  // Remove script tags and content
  script: /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  // Remove SQL injection attempts
  sql: /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|TRUNCATE)\b)/gi,
  // Remove null bytes
  nullBytes: /\0/g,
  // Remove excessive whitespace
  excessiveWhitespace: /\s{3,}/g,
}

/**
 * Sanitize a string by removing potentially dangerous content
 */
export function sanitizeString(input: string): string {
  if (!input || typeof input !== "string") {
    return ""
  }

  return input
    .replace(PATTERNS.script, "")
    .replace(PATTERNS.html, "")
    .replace(PATTERNS.nullBytes, "")
    .replace(PATTERNS.excessiveWhitespace, " ")
    .trim()
}

/**
 * Sanitize HTML but allow safe tags
 */
export function sanitizeHtml(input: string, allowedTags: string[] = []): string {
  if (!input || typeof input !== "string") {
    return ""
  }

  // Remove script tags first
  const sanitized = input.replace(PATTERNS.script, "")

  // If no tags allowed, strip all HTML
  if (allowedTags.length === 0) {
    return sanitized.replace(PATTERNS.html, "")
  }

  // Build regex to match only non-allowed tags
  const allowedTagsPattern = allowedTags.join("|")
  const disallowedTags = new RegExp(
    `<(?!\\/?(${allowedTagsPattern})\\b)[^>]*>`,
    "gi"
  )

  return sanitized.replace(disallowedTags, "")
}

/**
 * Sanitize an email address
 */
export function sanitizeEmail(input: string): string {
  if (!input || typeof input !== "string") {
    return ""
  }

  return input.toLowerCase().trim().replace(/[<>]/g, "")
}

/**
 * Sanitize a phone number (Australian format)
 */
export function sanitizePhone(input: string): string {
  if (!input || typeof input !== "string") {
    return ""
  }

  // Keep only digits, spaces, and common phone characters
  return input.replace(/[^\d\s+()-]/g, "").trim()
}

/**
 * Sanitize all string values in an object recursively
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const result: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      result[key] = sanitizeString(value)
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) =>
        typeof item === "string" ? sanitizeString(item) : item
      )
    } else if (value && typeof value === "object") {
      result[key] = sanitizeObject(value as Record<string, unknown>)
    } else {
      result[key] = value
    }
  }

  return result as T
}

/**
 * Zod schemas with built-in sanitization
 */
export const sanitizedSchemas = {
  // Sanitized string
  string: z.string().transform(sanitizeString),

  // Email with validation and sanitization
  email: z
    .string()
    .email("Invalid email address")
    .transform(sanitizeEmail),

  // Phone number (Australian)
  phone: z
    .string()
    .regex(/^(\+61|0)[2-9]\d{8}$/, "Invalid Australian phone number")
    .transform(sanitizePhone),

  // Medicare number
  medicare: z
    .string()
    .regex(/^\d{10,11}$/, "Invalid Medicare number")
    .transform((val) => val.replace(/\D/g, "")),

  // Name (letters, spaces, hyphens, apostrophes only)
  name: z
    .string()
    .min(2, "Name too short")
    .max(100, "Name too long")
    .regex(/^[a-zA-Z\s'-]+$/, "Name contains invalid characters")
    .transform(sanitizeString),

  // Date of birth
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
    .refine((date) => {
      const parsed = new Date(date)
      const now = new Date()
      const age = (now.getTime() - parsed.getTime()) / (1000 * 60 * 60 * 24 * 365)
      return age >= 0 && age <= 120
    }, "Invalid date of birth"),

  // Free text with length limits
  freeText: (maxLength = 1000) =>
    z
      .string()
      .max(maxLength, `Text too long (max ${maxLength} characters)`)
      .transform(sanitizeString),

  // URL validation
  url: z
    .string()
    .url("Invalid URL")
    .refine(
      (url) => url.startsWith("https://"),
      "Only HTTPS URLs are allowed"
    ),
}

/**
 * Validate and sanitize request body against a schema
 */
export async function validateAndSanitize<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const body = await request.json()
    const sanitized = sanitizeObject(body)
    const result = schema.safeParse(sanitized)

    if (!result.success) {
      const errorMessages = result.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join(", ")
      return { success: false, error: errorMessages }
    }

    return { success: true, data: result.data }
  } catch {
    return { success: false, error: "Invalid JSON body" }
  }
}
