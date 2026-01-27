/**
 * Redis-based Rate Limiting
 * 
 * Production-ready rate limiter using Upstash Redis.
 * Falls back to in-memory rate limiting if Redis is not configured.
 */

import { Redis } from "@upstash/redis"
import { Ratelimit } from "@upstash/ratelimit"
import { checkRateLimit as checkMemoryRateLimit, type RateLimitConfig, type RateLimitResult } from "./rate-limit"
import { logger } from "./observability/logger"

// Singleton Redis client
let redis: Redis | null = null
let rateLimiters: Map<string, Ratelimit> | null = null

/**
 * Initialize Redis client if configured
 */
function getRedis(): Redis | null {
  if (redis) return redis
  
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  
  if (!url || !token) {
    return null
  }
  
  try {
    redis = new Redis({ url, token })
    return redis
  } catch (error) {
    logger.error("Failed to initialize Redis", { error: error instanceof Error ? error.message : String(error) })
    return null
  }
}

/**
 * Get or create a rate limiter for the given configuration
 */
function getRateLimiter(config: RateLimitConfig, prefix: string): Ratelimit | null {
  const redisClient = getRedis()
  if (!redisClient) return null
  
  if (!rateLimiters) {
    rateLimiters = new Map()
  }
  
  const key = `${prefix}:${config.maxRequests}:${config.windowMs}`
  
  if (!rateLimiters.has(key)) {
    const limiter = new Ratelimit({
      redis: redisClient,
      limiter: Ratelimit.slidingWindow(config.maxRequests, `${config.windowMs}ms`),
      prefix: `ratelimit:${prefix}`,
      analytics: true,
    })
    rateLimiters.set(key, limiter)
  }
  
  return rateLimiters.get(key) || null
}

/**
 * Check rate limit using Redis (with in-memory fallback)
 * 
 * @param key - Unique identifier (e.g., IP address, user ID)
 * @param config - Rate limit configuration
 * @param prefix - Prefix for the rate limit key (e.g., "api", "auth")
 * @returns Rate limit result
 */
export async function checkRateLimitRedis(
  key: string,
  config: RateLimitConfig,
  prefix: string = "default"
): Promise<RateLimitResult> {
  const limiter = getRateLimiter(config, prefix)
  
  // Fallback to in-memory if Redis not available
  if (!limiter) {
    return checkMemoryRateLimit(`${prefix}:${key}`, config)
  }
  
  try {
    const result = await limiter.limit(key)
    
    return {
      allowed: result.success,
      success: result.success, // deprecated but kept for compatibility
      remaining: result.remaining,
      resetAt: result.reset,
      retryAfterMs: result.success ? undefined : result.reset - Date.now(),
    }
  } catch (error) {
    logger.warn("Redis rate limit error, falling back to in-memory", { error: error instanceof Error ? error.message : String(error) })
    // Fallback to in-memory on Redis errors
    return checkMemoryRateLimit(`${prefix}:${key}`, config)
  }
}

/**
 * Rate limit configurations (re-exported for convenience)
 */
export { RATE_LIMITS, getClientIp, createRateLimitHeaders } from "./rate-limit"
export type { RateLimitConfig, RateLimitResult } from "./rate-limit"

/**
 * Check if Redis rate limiting is available
 */
export function isRedisRateLimitingAvailable(): boolean {
  return getRedis() !== null
}
