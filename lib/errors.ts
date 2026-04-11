/**
 * Error Coercion Utility
 *
 * Safely converts unknown caught values into proper Error instances.
 *
 * Supabase `PostgrestError` is NOT an Error subclass - it's a plain object
 * with { message, code, details, hint }. Calling `String()` on it produces
 * "[object Object]", which makes Sentry errors undiagnosable.
 *
 * This helper extracts `.message` (and `.code`/`.details` when present) so
 * every catch block produces a meaningful Error for logging and Sentry.
 */

/**
 * Convert an unknown caught value into an Error with a meaningful message.
 *
 * Handles:
 * - Error instances (returned as-is)
 * - Objects with `.message` (e.g. Supabase PostgrestError) - extracts message + code/details
 * - Strings - wrapped in Error
 * - Everything else - JSON.stringify fallback
 */
export function toError(error: unknown): Error {
  if (error instanceof Error) return error

  if (typeof error === "string") return new Error(error)

  if (error !== null && typeof error === "object") {
    const obj = error as Record<string, unknown>

    // Supabase PostgrestError shape: { message, code, details, hint }
    if (typeof obj.message === "string") {
      const parts = [obj.message]
      if (typeof obj.code === "string") parts.push(`[${obj.code}]`)
      if (typeof obj.details === "string") parts.push(obj.details)
      return new Error(parts.join(" "))
    }

    // Fallback for arbitrary objects
    try {
      return new Error(JSON.stringify(error))
    } catch {
      return new Error("[non-serializable error]")
    }
  }

  return new Error(String(error))
}
