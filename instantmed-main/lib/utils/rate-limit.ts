/**
 * Distributed rate limiting with Upstash Redis
 * Falls back to in-memory rate limiting if Upstash is not configured
 */

import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

// =====================================================
// Upstash Redis Rate Limiter (Production)
// =====================================================

let redis: Redis | null = null
let ratelimiters: {
  auth: Ratelimit | null
  api: Ratelimit | null
  webhook: Ratelimit | null
  strict: Ratelimit | null
} = {
  auth: null,
  api: null,
  webhook: null,
  strict: null,
}

// Initialize Upstash if credentials are available
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  })

  // Auth rate limiter: 5 requests per minute (login/register)
  ratelimiters.auth = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "60 s"),
    analytics: true,
    prefix: "ratelimit:auth",
  })

  // API rate limiter: 30 requests per minute
  ratelimiters.api = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, "60 s"),
    analytics: true,
    prefix: "ratelimit:api",
  })

  // Webhook rate limiter: 100 requests per minute
  ratelimiters.webhook = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, "60 s"),
    analytics: true,
    prefix: "ratelimit:webhook",
  })

  // Strict rate limiter: 3 requests per minute (sensitive operations)
  ratelimiters.strict = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, "60 s"),
    analytics: true,
    prefix: "ratelimit:strict",
  })
}

// =====================================================
// Fallback In-Memory Rate Limiter (Development)
// =====================================================

interface RateLimitEntry {
  count: number
  resetTime: number
}

const inMemoryMap = new Map<string, RateLimitEntry>()

function inMemoryRateLimit(
  key: string,
  options: { windowMs?: number; maxRequests?: number } = {}
): { success: boolean; remaining: number; resetIn: number } {
  const { windowMs = 60 * 1000, maxRequests = 10 } = options

  const now = Date.now()
  const entry = inMemoryMap.get(key)

  // Periodic cleanup
  if (Math.random() < 0.01) {
    for (const [k, v] of inMemoryMap.entries()) {
      if (now > v.resetTime) {
        inMemoryMap.delete(k)
      }
    }
  }

  if (!entry || now > entry.resetTime) {
    inMemoryMap.set(key, {
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

// =====================================================
// Unified Rate Limit Interface
// =====================================================

export interface RateLimitResult {
  success: boolean
  remaining: number
  resetIn: number
  limit: number
}

export type RateLimitType = "auth" | "api" | "webhook" | "strict"

const limitConfigs: Record<RateLimitType, { windowMs: number; maxRequests: number }> = {
  auth: { windowMs: 60 * 1000, maxRequests: 5 },
  api: { windowMs: 60 * 1000, maxRequests: 30 },
  webhook: { windowMs: 60 * 1000, maxRequests: 100 },
  strict: { windowMs: 60 * 1000, maxRequests: 3 },
}

/**
 * Check rate limit for a given identifier
 * @param identifier - Unique identifier (e.g., IP address, user ID)
 * @param type - Type of rate limit to apply
 */
export async function checkRateLimit(
  identifier: string,
  type: RateLimitType = "api"
): Promise<RateLimitResult> {
  const config = limitConfigs[type]

  // Use Upstash if available
  const limiter = ratelimiters[type]
  if (limiter) {
    const result = await limiter.limit(identifier)
    return {
      success: result.success,
      remaining: result.remaining,
      resetIn: result.reset - Date.now(),
      limit: result.limit,
    }
  }

  // Fallback to in-memory
  const key = `${type}:${identifier}`
  const result = inMemoryRateLimit(key, config)
  return {
    ...result,
    limit: config.maxRequests,
  }
}

/**
 * Create a rate limiter for a specific use case
 */
export function createRateLimiter(type: RateLimitType = "api") {
  return (identifier: string) => checkRateLimit(identifier, type)
}

// Pre-configured rate limiters
export const authRateLimiter = createRateLimiter("auth")
export const apiRateLimiter = createRateLimiter("api")
export const webhookRateLimiter = createRateLimiter("webhook")
export const strictRateLimiter = createRateLimiter("strict")

/**
 * Helper to get identifier from request headers
 */
export function getRequestIdentifier(request: Request): string {
  // Try to get real IP from various headers
  const forwardedFor = request.headers.get("x-forwarded-for")
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim()
  }

  const realIp = request.headers.get("x-real-ip")
  if (realIp) {
    return realIp
  }

  // Fallback to a hash of user-agent + timestamp (not ideal but better than nothing)
  const userAgent = request.headers.get("user-agent") || "unknown"
  return `ua:${userAgent.slice(0, 50)}`
}

/**
 * Rate limit middleware helper for API routes
 */
export async function withRateLimit(
  request: Request,
  type: RateLimitType = "api"
): Promise<{ allowed: boolean; headers: Headers }> {
  const identifier = getRequestIdentifier(request)
  const result = await checkRateLimit(identifier, type)

  const headers = new Headers()
  headers.set("X-RateLimit-Limit", result.limit.toString())
  headers.set("X-RateLimit-Remaining", result.remaining.toString())
  headers.set("X-RateLimit-Reset", Math.ceil(result.resetIn / 1000).toString())

  return {
    allowed: result.success,
    headers,
  }
}
