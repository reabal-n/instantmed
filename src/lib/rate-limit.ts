/**
 * Simple in-memory rate limiter for API routes
 * For production, consider using Redis or a dedicated rate limiting service
 */

interface RateLimitEntry {
  count: number
  timestamp: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

// Clean up old entries periodically to prevent memory leaks
const CLEANUP_INTERVAL = 5 * 60 * 1000 // 5 minutes
let lastCleanup = Date.now()

function cleanupOldEntries(windowMs: number) {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  
  lastCleanup = now
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now - entry.timestamp > windowMs) {
      rateLimitStore.delete(key)
    }
  }
}

export interface RateLimitConfig {
  /** Time window in milliseconds */
  windowMs: number
  /** Maximum number of requests allowed in the window */
  maxRequests: number
}

export interface RateLimitResult {
  /** Whether the request is rate limited */
  limited: boolean
  /** Number of requests remaining in the window */
  remaining: number
  /** Time until the rate limit resets (in milliseconds) */
  resetIn: number
}

/**
 * Check if a request should be rate limited
 * @param identifier - Unique identifier for the rate limit (e.g., IP address, user ID)
 * @param config - Rate limiting configuration
 * @returns RateLimitResult
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const { windowMs, maxRequests } = config
  const now = Date.now()
  
  // Cleanup old entries
  cleanupOldEntries(windowMs)
  
  const entry = rateLimitStore.get(identifier)
  
  // First request or window expired
  if (!entry || now - entry.timestamp > windowMs) {
    rateLimitStore.set(identifier, { count: 1, timestamp: now })
    return {
      limited: false,
      remaining: maxRequests - 1,
      resetIn: windowMs,
    }
  }
  
  // Within window
  if (entry.count >= maxRequests) {
    return {
      limited: true,
      remaining: 0,
      resetIn: windowMs - (now - entry.timestamp),
    }
  }
  
  entry.count++
  return {
    limited: false,
    remaining: maxRequests - entry.count,
    resetIn: windowMs - (now - entry.timestamp),
  }
}

/**
 * Default rate limit configurations for different use cases
 */
export const rateLimitConfigs = {
  /** Standard API rate limit: 100 requests per minute */
  standard: { windowMs: 60 * 1000, maxRequests: 100 },
  /** Strict rate limit for sensitive operations: 10 requests per minute */
  strict: { windowMs: 60 * 1000, maxRequests: 10 },
  /** Auth rate limit: 5 requests per minute to prevent brute force */
  auth: { windowMs: 60 * 1000, maxRequests: 5 },
  /** Very strict: 3 requests per minute for expensive operations */
  expensive: { windowMs: 60 * 1000, maxRequests: 3 },
} as const

/**
 * Get the client IP address from request headers
 */
export function getClientIP(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for')
  const realIp = headers.get('x-real-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  if (realIp) {
    return realIp
  }
  
  return 'unknown'
}
