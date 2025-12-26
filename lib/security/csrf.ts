import "server-only"
import { headers } from "next/headers"
import { logger } from "../logger"

/**
 * CSRF Protection for API routes
 *
 * For Server Actions, Next.js provides built-in CSRF protection.
 * For API routes, we use origin verification.
 */

/**
 * Verify the request origin matches the host
 * This provides CSRF protection for state-changing operations
 */
export async function verifyCsrfToken(request: Request): Promise<boolean> {
  // Only check for state-changing methods
  const method = request.method
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return true // Safe methods don't need CSRF protection
  }

  const headersList = await headers()
  const origin = headersList.get("origin")
  const referer = headersList.get("referer")
  const host = headersList.get("host")

  // Allow requests with valid origin or referer
  if (origin) {
    const originUrl = new URL(origin)
    if (originUrl.host === host) {
      return true
    }
  }

  if (referer) {
    const refererUrl = new URL(referer)
    if (refererUrl.host === host) {
      return true
    }
  }

  // Check for custom CSRF header (for API clients)
  const csrfHeader = headersList.get("x-csrf-token")
  if (csrfHeader) {
    // In a production app, you'd verify this against a session token
    // For now, just checking its presence
    return true
  }

  logger.warn("CSRF verification failed", {
    method,
    origin,
    referer,
    host,
    hasCsrfHeader: !!csrfHeader
  })

  return false
}

/**
 * Middleware helper to verify CSRF and return error if invalid
 */
export async function requireValidCsrf(request: Request): Promise<Response | null> {
  const isValid = await verifyCsrfToken(request)

  if (!isValid) {
    logger.error("CSRF validation failed - rejecting request", {
      method: request.method,
      url: request.url
    })

    return new Response(
      JSON.stringify({
        error: "Invalid request origin",
        code: "CSRF_VALIDATION_FAILED"
      }),
      {
        status: 403,
        headers: {
          "Content-Type": "application/json"
        }
      }
    )
  }

  return null // No error
}

/**
 * Generate a CSRF token for forms
 * In production, this should be cryptographically secure and session-bound
 */
export function generateCsrfToken(): string {
  // Simple implementation - in production use crypto.randomBytes
  return Buffer.from(`${Date.now()}-${Math.random()}`).toString("base64")
}
