/**
 * Rate Limiting - CANONICAL IMPLEMENTATION
 *
 * This is the ONLY rate limiting module that should be used.
 * Do NOT import from ./index.ts, ./upstash.ts, or ./limiter.ts
 *
 * Uses Upstash Redis for distributed rate limiting across serverless instances.
 * Falls back to fail-open (allow request) if Redis is unavailable — this is
 * intentional for serverless: in-memory Maps don't persist across invocations,
 * so the only safe fallback is to allow the request and log the failure.
 *
 * @example
 * import { applyRateLimit, getClientIdentifier } from "@/lib/rate-limit/redis"
 *
 * const rateLimitResponse = await applyRateLimit(request, 'standard')
 * if (rateLimitResponse) return rateLimitResponse
 */

import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import { createLogger } from "@/lib/observability/logger"

const logger = createLogger("rate-limit")

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
    label: "standard",
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
    label: "auth",
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
    label: "sensitive",
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
    label: "upload",
  },

  /** AI endpoints: 30 requests per minute per user (protects LLM spend) */
  ai: {
    limiter: redis
      ? new Ratelimit({
          redis,
          limiter: Ratelimit.slidingWindow(30, "1 m"),
          analytics: true,
          prefix: "ratelimit:ai",
        })
      : null,
    label: "ai",
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
    label: "webhook",
  },
} as const

/**
 * Check rate limit for a given identifier.
 *
 * FAIL-OPEN: If Redis is down or throws, the request is ALLOWED.
 * This prevents a Redis outage from taking down the entire application.
 * Rate limiting is a best-effort protection, not a hard security boundary.
 */
async function checkRateLimit(
  identifier: string,
  config: keyof typeof rateLimitConfigs
): Promise<{ success: boolean; limit: number; remaining: number; resetAt: number }> {
  const rateLimitConfig = rateLimitConfigs[config]

  // No Redis configured — skip rate limiting (dev/test only)
  if (!rateLimitConfig.limiter) {
    if (process.env.NODE_ENV === "production") {
      logger.warn("[RateLimit] Redis not configured in production — rate limiting disabled", {
        config,
      })
    }
    return { success: true, limit: 0, remaining: 0, resetAt: 0 }
  }

  try {
    const result = await rateLimitConfig.limiter.limit(identifier)
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      resetAt: result.reset,
    }
  } catch (error) {
    // FAIL-OPEN: Redis error → allow the request, log the failure
    logger.error(
      "[RateLimit] Redis error — failing open (request allowed)",
      { config, identifier: identifier.substring(0, 20) },
      error instanceof Error ? error : undefined
    )
    return { success: true, limit: 0, remaining: 0, resetAt: 0 }
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
  const result = await checkRateLimit(identifier, config)

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
 * Rate limit for server actions (no Request object)
 * Uses user ID as identifier
 */
export async function checkServerActionRateLimit(
  userId: string,
  config: keyof typeof rateLimitConfigs = "sensitive"
): Promise<{ success: boolean; error?: string; retryAfter?: number }> {
  const identifier = `action:${userId}`
  const result = await checkRateLimit(identifier, config)

  if (!result.success) {
    const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000)
    return {
      success: false,
      error: "Too many requests. Please wait a moment before trying again.",
      retryAfter,
    }
  }

  return { success: true }
}
