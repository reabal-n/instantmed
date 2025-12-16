/**
 * Rate Limiting Utilities
 * 
 * Simple in-memory rate limiter for API routes.
 * For production, use Redis or a dedicated service.
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

// In-memory store (use Redis in production)
const store = new Map<string, RateLimitEntry>()

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now) {
      store.delete(key)
    }
  }
}, 60000) // Clean every minute

interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  limit: number
  /** Time window in milliseconds */
  windowMs: number
}

interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  resetAt: number
}

/**
 * Check rate limit for a given identifier
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now()
  const key = identifier
  
  let entry = store.get(key)
  
  // Create new entry if none exists or window has passed
  if (!entry || entry.resetAt < now) {
    entry = {
      count: 0,
      resetAt: now + config.windowMs,
    }
    store.set(key, entry)
  }
  
  // Increment count
  entry.count++
  
  const remaining = Math.max(0, config.limit - entry.count)
  const success = entry.count <= config.limit
  
  return {
    success,
    limit: config.limit,
    remaining,
    resetAt: entry.resetAt,
  }
}

/**
 * Rate limit headers for HTTP response
 */
export function rateLimitHeaders(result: RateLimitResult): HeadersInit {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.resetAt.toString(),
  }
}

// ============================================
// Preset Configurations
// ============================================

/** Standard API rate limit: 100 requests per minute */
export const RATE_LIMIT_STANDARD: RateLimitConfig = {
  limit: 100,
  windowMs: 60 * 1000,
}

/** Strict rate limit for auth: 5 requests per minute */
export const RATE_LIMIT_AUTH: RateLimitConfig = {
  limit: 5,
  windowMs: 60 * 1000,
}

/** Sensitive operations: 10 requests per hour */
export const RATE_LIMIT_SENSITIVE: RateLimitConfig = {
  limit: 10,
  windowMs: 60 * 60 * 1000,
}

/** File uploads: 20 per hour */
export const RATE_LIMIT_UPLOAD: RateLimitConfig = {
  limit: 20,
  windowMs: 60 * 60 * 1000,
}

// ============================================
// Helper Functions
// ============================================

/**
 * Get client identifier from request
 * Prioritizes forwarded IP for proxied requests
 */
export function getClientIdentifier(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  if (realIp) {
    return realIp
  }
  
  // Fallback - in production, always have proper headers
  return 'unknown'
}

/**
 * Apply rate limiting to an API route
 * Returns Response if rate limited, null otherwise
 */
export function applyRateLimit(
  request: Request,
  config: RateLimitConfig = RATE_LIMIT_STANDARD
): Response | null {
  const identifier = getClientIdentifier(request)
  const result = checkRateLimit(identifier, config)
  
  if (!result.success) {
    return new Response(
      JSON.stringify({
        error: 'Too many requests',
        message: 'Please wait before making more requests',
        retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000),
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          ...rateLimitHeaders(result),
          'Retry-After': Math.ceil((result.resetAt - Date.now()) / 1000).toString(),
        },
      }
    )
  }
  
  return null
}

/**
 * Decorator for rate-limited API handlers
 */
export function withRateLimit<T extends (...args: [Request, ...unknown[]]) => Promise<Response>>(
  handler: T,
  config: RateLimitConfig = RATE_LIMIT_STANDARD
): T {
  return (async (request: Request, ...args: unknown[]) => {
    const rateLimitResponse = applyRateLimit(request, config)
    if (rateLimitResponse) {
      return rateLimitResponse
    }
    return handler(request, ...args)
  }) as T
}
