/**
 * Rate Limiting Utility (In-Memory Fallback)
 *
 * @deprecated Use `@/lib/rate-limit/redis` instead for production rate limiting.
 * This module is kept as a fallback when Redis is not available.
 *
 * Simple in-memory rate limiter for API endpoints.
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key)
    }
  }
}, 60000) // Clean every minute

export interface RateLimitConfig {
  maxRequests: number
  windowMs: number
}

export interface RateLimitResult {
  allowed: boolean
  /** @deprecated Use `allowed` instead */
  success: boolean
  remaining: number
  resetAt: number
  retryAfterMs?: number
}

/**
 * Check if a request is within rate limits
 * 
 * @param key - Unique identifier (e.g., IP address)
 * @param config - Rate limit configuration
 * @returns Rate limit result
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now()
  const entry = rateLimitStore.get(key)

  // If no entry or window expired, create new entry
  if (!entry || entry.resetAt < now) {
    const resetAt = now + config.windowMs
    rateLimitStore.set(key, { count: 1, resetAt })
    return {
      allowed: true,
      success: true,
      remaining: config.maxRequests - 1,
      resetAt,
    }
  }

  // Increment count
  entry.count++

  // Check if over limit
  if (entry.count > config.maxRequests) {
    return {
      allowed: false,
      success: false,
      remaining: 0,
      resetAt: entry.resetAt,
      retryAfterMs: entry.resetAt - now,
    }
  }

  return {
    allowed: true,
    success: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt,
  }
}

/**
 * Rate limit configurations for different endpoints
 */
export const RATE_LIMITS = {
  // Verification: 10 requests per minute per IP
  verification: {
    maxRequests: 10,
    windowMs: 60 * 1000, // 1 minute
  },
  // Strict verification: 3 requests per minute (for failed attempts)
  verificationStrict: {
    maxRequests: 3,
    windowMs: 60 * 1000,
  },
  // General API: 100 requests per minute
  api: {
    maxRequests: 100,
    windowMs: 60 * 1000,
  },
  // Sensitive operations: 5 requests per minute
  sensitive: {
    maxRequests: 5,
    windowMs: 60 * 1000,
  },
  // Checkout: 10 requests per 5 minutes per user (prevents abuse)
  checkout: {
    maxRequests: 10,
    windowMs: 5 * 60 * 1000, // 5 minutes
  },
  // AI endpoints: 20 requests per minute
  ai: {
    maxRequests: 20,
    windowMs: 60 * 1000,
  },
  // Auth attempts: 5 per minute (brute force protection)
  auth: {
    maxRequests: 5,
    windowMs: 60 * 1000,
  },
} as const

// Legacy export for backward compatibility
export const RATE_LIMIT_SENSITIVE = RATE_LIMITS.sensitive

/**
 * Get client IP from request headers
 */
export function getClientIp(request: Request): string {
  // Check common proxy headers
  const forwardedFor = request.headers.get("x-forwarded-for")
  if (forwardedFor) {
    // Take first IP if multiple (client IP is usually first)
    return forwardedFor.split(",")[0].trim()
  }

  const realIp = request.headers.get("x-real-ip")
  if (realIp) {
    return realIp
  }

  // Fallback - in development this might be empty
  return "127.0.0.1"
}

/**
 * Create rate limit headers for response
 */
export function createRateLimitHeaders(result: RateLimitResult): HeadersInit {
  return {
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
    ...(result.retryAfterMs && {
      "Retry-After": String(Math.ceil(result.retryAfterMs / 1000)),
    }),
  }
}
