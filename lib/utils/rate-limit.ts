/**
 * Simple in-memory rate limiter for API routes
 * For production, consider using Redis-based rate limiting
 */

interface RateLimitEntry {
  count: number
  resetTime: number
}

const rateLimitMap = new Map<string, RateLimitEntry>()

interface RateLimitOptions {
  windowMs?: number // Time window in milliseconds
  maxRequests?: number // Max requests per window
}

export function rateLimit(
  key: string,
  options: RateLimitOptions = {},
): { success: boolean; remaining: number; resetIn: number } {
  const { windowMs = 60 * 1000, maxRequests = 10 } = options // Default: 10 requests per minute

  const now = Date.now()
  const entry = rateLimitMap.get(key)

  // Clean up expired entries periodically
  if (Math.random() < 0.01) {
    cleanupExpiredEntries()
  }

  if (!entry || now > entry.resetTime) {
    // Create new entry or reset expired one
    rateLimitMap.set(key, {
      count: 1,
      resetTime: now + windowMs,
    })
    return { success: true, remaining: maxRequests - 1, resetIn: windowMs }
  }

  if (entry.count >= maxRequests) {
    return {
      success: false,
      remaining: 0,
      resetIn: entry.resetTime - now,
    }
  }

  entry.count++
  return {
    success: true,
    remaining: maxRequests - entry.count,
    resetIn: entry.resetTime - now,
  }
}

function cleanupExpiredEntries() {
  const now = Date.now()
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now > entry.resetTime) {
      rateLimitMap.delete(key)
    }
  }
}

/**
 * Create a rate limiter for a specific use case
 */
export function createRateLimiter(options: RateLimitOptions = {}) {
  return (key: string) => rateLimit(key, options)
}

// Pre-configured rate limiters for common use cases
export const authRateLimiter = createRateLimiter({ windowMs: 60 * 1000, maxRequests: 5 }) // 5 auth attempts per minute
export const apiRateLimiter = createRateLimiter({ windowMs: 60 * 1000, maxRequests: 30 }) // 30 API calls per minute
export const webhookRateLimiter = createRateLimiter({ windowMs: 60 * 1000, maxRequests: 100 }) // 100 webhooks per minute
