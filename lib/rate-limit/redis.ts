/**
 * Rate Limiting - CANONICAL IMPLEMENTATION
 * 
 * This is the ONLY rate limiting module that should be used.
 * Do NOT import from ./index.ts, ./upstash.ts, or ./limiter.ts
 * 
 * Uses Upstash Redis for distributed rate limiting across serverless instances.
 * Falls back to in-memory store if Redis is not configured (development only).
 * 
 * @example
 * import { applyRateLimit, getClientIdentifier } from "@/lib/rate-limit/redis"
 * 
 * const rateLimitResponse = await applyRateLimit(request, 'standard')
 * if (rateLimitResponse) return rateLimitResponse
 */

import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

// Check if Redis is configured
const isRedisConfigured = !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN

let redis: Redis | null = null

if (isRedisConfigured) {
  redis = Redis.fromEnv()
}

/**
 * Rate limit configurations
 */
export const rateLimitConfigs = {
  /** Standard API rate limit: 100 requests per minute */
  standard: {
    limiter: redis
      ? new Ratelimit({
          redis,
          limiter: Ratelimit.slidingWindow(100, "1 m"),
          analytics: true,
          prefix: "ratelimit:standard",
        })
      : null,
    fallback: { limit: 100, windowMs: 60 * 1000 },
  },

  /** Auth operations: 10 requests per minute */
  auth: {
    limiter: redis
      ? new Ratelimit({
          redis,
          limiter: Ratelimit.slidingWindow(10, "1 m"),
          analytics: true,
          prefix: "ratelimit:auth",
        })
      : null,
    fallback: { limit: 10, windowMs: 60 * 1000 },
  },

  /** Sensitive operations: 20 requests per hour */
  sensitive: {
    limiter: redis
      ? new Ratelimit({
          redis,
          limiter: Ratelimit.slidingWindow(20, "1 h"),
          analytics: true,
          prefix: "ratelimit:sensitive",
        })
      : null,
    fallback: { limit: 20, windowMs: 60 * 60 * 1000 },
  },

  /** File uploads: 30 per hour */
  upload: {
    limiter: redis
      ? new Ratelimit({
          redis,
          limiter: Ratelimit.slidingWindow(30, "1 h"),
          analytics: true,
          prefix: "ratelimit:upload",
        })
      : null,
    fallback: { limit: 30, windowMs: 60 * 60 * 1000 },
  },

  /** Webhooks: 1000 per minute (high volume) */
  webhook: {
    limiter: redis
      ? new Ratelimit({
          redis,
          limiter: Ratelimit.slidingWindow(1000, "1 m"),
          analytics: true,
          prefix: "ratelimit:webhook",
        })
      : null,
    fallback: { limit: 1000, windowMs: 60 * 1000 },
  },
} as const

// In-memory fallback store for development
const memoryStore = new Map<string, { count: number; resetAt: number }>()

// Clean up expired entries periodically
if (!redis) {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of memoryStore.entries()) {
      if (entry.resetAt < now) {
        memoryStore.delete(key)
      }
    }
  }, 60000) // Clean every minute
}

/**
 * Check rate limit for a given identifier
 */
async function checkRateLimitRedis(
  identifier: string,
  config: keyof typeof rateLimitConfigs
): Promise<{ success: boolean; limit: number; remaining: number; resetAt: number }> {
  const rateLimitConfig = rateLimitConfigs[config]

  // Use Redis if configured
  if (rateLimitConfig.limiter) {
    const result = await rateLimitConfig.limiter.limit(identifier)
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      resetAt: result.reset,
    }
  }

  // Fallback to in-memory (development only)
  return checkRateLimitMemory(identifier, rateLimitConfig.fallback)
}

/**
 * In-memory rate limiting (fallback for development)
 */
function checkRateLimitMemory(
  identifier: string,
  config: { limit: number; windowMs: number }
): { success: boolean; limit: number; remaining: number; resetAt: number } {
  const now = Date.now()
  const key = identifier

  let entry = memoryStore.get(key)

  // Create new entry if none exists or window has passed
  if (!entry || entry.resetAt < now) {
    entry = {
      count: 0,
      resetAt: now + config.windowMs,
    }
    memoryStore.set(key, entry)
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
 * Get client identifier from request
 */
export function getClientIdentifier(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")
  const realIp = request.headers.get("x-real-ip")

  if (forwarded) {
    return forwarded.split(",")[0].trim()
  }

  if (realIp) {
    return realIp
  }

  // Fallback - in production, always have proper headers
  return "unknown"
}

/**
 * Apply rate limiting to an API route
 * Returns Response if rate limited, null otherwise
 */
export async function applyRateLimit(
  request: Request,
  config: keyof typeof rateLimitConfigs = "standard",
  customIdentifier?: string
): Promise<Response | null> {
  const identifier = customIdentifier || getClientIdentifier(request)
  const result = await checkRateLimitRedis(identifier, config)

  if (!result.success) {
    const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000)
    return new Response(
      JSON.stringify({
        error: "Too many requests",
        message: "Please wait before making more requests",
        retryAfter,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "X-RateLimit-Limit": result.limit.toString(),
          "X-RateLimit-Remaining": result.remaining.toString(),
          "X-RateLimit-Reset": result.resetAt.toString(),
          "Retry-After": retryAfter.toString(),
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
  config: keyof typeof rateLimitConfigs = "standard"
): T {
  return (async (request: Request, ...args: unknown[]) => {
    const rateLimitResponse = await applyRateLimit(request, config)
    if (rateLimitResponse) {
      return rateLimitResponse
    }
    return handler(request, ...args)
  }) as T
}

/**
 * Check if Redis is properly configured
 */
export function isRedisEnabled(): boolean {
  return isRedisConfigured && redis !== null
}

/**
 * Get rate limit status without incrementing
 */
export async function getRateLimitStatus(
  identifier: string,
  config: keyof typeof rateLimitConfigs
): Promise<{ limit: number; remaining: number; resetAt: number }> {
  const rateLimitConfig = rateLimitConfigs[config]

  if (rateLimitConfig.limiter && redis) {
    // For Redis, we need to do a check (unfortunately Upstash doesn't have a read-only method)
    const result = await rateLimitConfig.limiter.limit(identifier)
    // Reset the counter by adding 1 back
    await redis.hincrby(`${rateLimitConfig.limiter}:${identifier}`, "count", -1)
    
    return {
      limit: result.limit,
      remaining: result.remaining + 1, // Add 1 back since we decremented
      resetAt: result.reset,
    }
  }

  // Fallback to in-memory
  const entry = memoryStore.get(identifier)
  if (!entry) {
    return {
      limit: rateLimitConfig.fallback.limit,
      remaining: rateLimitConfig.fallback.limit,
      resetAt: Date.now() + rateLimitConfig.fallback.windowMs,
    }
  }

  return {
    limit: rateLimitConfig.fallback.limit,
    remaining: Math.max(0, rateLimitConfig.fallback.limit - entry.count),
    resetAt: entry.resetAt,
  }
}
