import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { logger } from "@/lib/logger"

// Rate limiter configurations for different endpoints
const rateLimiters = {
  // General API rate limit: 100 requests per 60 seconds
  api: new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(100, "60 s"),
    analytics: true,
    prefix: "ratelimit:api",
  }),

  // Auth endpoints: 5 requests per 60 seconds (stricter)
  auth: new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(5, "60 s"),
    analytics: true,
    prefix: "ratelimit:auth",
  }),

  // Payment/checkout: 10 requests per 60 seconds
  payment: new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(10, "60 s"),
    analytics: true,
    prefix: "ratelimit:payment",
  }),

  // Form submissions: 20 requests per 60 seconds
  submit: new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(20, "60 s"),
    analytics: true,
    prefix: "ratelimit:submit",
  }),

  // Admin endpoints: 50 requests per 60 seconds
  admin: new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(50, "60 s"),
    analytics: true,
    prefix: "ratelimit:admin",
  }),
}

export type RateLimitType = keyof typeof rateLimiters

/**
 * Get client IP address from request headers
 */
async function getClientIp(): Promise<string> {
  const headersList = await headers()
  const forwardedFor = headersList.get("x-forwarded-for")
  const realIp = headersList.get("x-real-ip")

  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim()
  }

  if (realIp) {
    return realIp
  }

  return "anonymous"
}

/**
 * Check rate limit for a request
 * Returns null if allowed, or a NextResponse if rate limited
 */
export async function checkRateLimit(
  type: RateLimitType = "api",
  identifier?: string
): Promise<NextResponse | null> {
  // Skip rate limiting if Upstash is not configured
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    logger.warn("Rate limiting disabled: Upstash Redis not configured")
    return null
  }

  const limiter = rateLimiters[type]
  const ip = identifier || (await getClientIp())

  try {
    const { success, limit, remaining, reset } = await limiter.limit(ip)

    if (!success) {
      return NextResponse.json(
        {
          error: "Too many requests",
          message: "Please slow down and try again later",
          retryAfter: Math.ceil((reset - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": limit.toString(),
            "X-RateLimit-Remaining": remaining.toString(),
            "X-RateLimit-Reset": reset.toString(),
            "Retry-After": Math.ceil((reset - Date.now()) / 1000).toString(),
          },
        }
      )
    }

    return null
  } catch (error) {
    // If rate limiting fails, allow the request but log the error
    logger.error("Rate limit check failed:", { error })
    return null
  }
}

/**
 * Higher-order function to wrap API route handlers with rate limiting
 */
export function withRateLimit<T extends unknown[]>(
  handler: (...args: T) => Promise<NextResponse>,
  type: RateLimitType = "api"
) {
  return async (...args: T): Promise<NextResponse> => {
    const rateLimitResponse = await checkRateLimit(type)
    if (rateLimitResponse) {
      return rateLimitResponse
    }
    return handler(...args)
  }
}
