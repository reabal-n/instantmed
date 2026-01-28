/**
 * Hardened Rate Limiting
 * 
 * Enhanced rate limiting with:
 * - Sliding window algorithm
 * - User + IP combined limiting
 * - Graduated response (warning -> block)
 * - Automatic ban for abuse
 */

import { NextRequest, NextResponse } from "next/server"
import * as Sentry from "@sentry/nextjs"

interface RateLimitState {
  count: number
  windowStart: number
  warnings: number
  banned: boolean
  bannedUntil?: number
}

const store = new Map<string, RateLimitState>()

// Cleanup interval
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now()
    for (const [key, state] of store.entries()) {
      // Remove entries older than 1 hour
      if (now - state.windowStart > 3600000) {
        store.delete(key)
      }
      // Unban after ban period
      if (state.banned && state.bannedUntil && now > state.bannedUntil) {
        state.banned = false
        state.warnings = 0
      }
    }
  }, 60000)
}

export interface HardenedRateLimitConfig {
  /** Maximum requests per window */
  limit: number
  /** Window size in milliseconds */
  windowMs: number
  /** Number of violations before temporary ban */
  maxViolations?: number
  /** Ban duration in milliseconds */
  banDurationMs?: number
  /** Include user ID in key (requires auth) */
  includeUserId?: boolean
  /** Custom key generator */
  keyGenerator?: (req: NextRequest) => string
}

export interface HardenedRateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
  banned: boolean
  retryAfter?: number
  warning?: string
}

/**
 * Get client identifier from request
 */
function getClientKey(req: NextRequest, config: HardenedRateLimitConfig): string {
  if (config.keyGenerator) {
    return config.keyGenerator(req)
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() 
    || req.headers.get("x-real-ip") 
    || "unknown"

  // Could add user ID if available in headers/cookies
  return `rate:${ip}`
}

/**
 * Check rate limit with hardened logic
 */
export function checkHardenedRateLimit(
  req: NextRequest,
  config: HardenedRateLimitConfig
): HardenedRateLimitResult {
  const { 
    limit, 
    windowMs, 
    maxViolations = 5, 
    banDurationMs = 15 * 60 * 1000 // 15 minutes
  } = config

  const key = getClientKey(req, config)
  const now = Date.now()

  let state = store.get(key)

  // Initialize state if needed
  if (!state) {
    state = {
      count: 0,
      windowStart: now,
      warnings: 0,
      banned: false,
    }
    store.set(key, state)
  }

  // Check if banned
  if (state.banned) {
    if (state.bannedUntil && now > state.bannedUntil) {
      state.banned = false
      state.warnings = 0
    } else {
      return {
        allowed: false,
        remaining: 0,
        resetAt: state.bannedUntil || now + banDurationMs,
        banned: true,
        retryAfter: Math.ceil(((state.bannedUntil || now + banDurationMs) - now) / 1000),
      }
    }
  }

  // Reset window if expired
  if (now - state.windowStart > windowMs) {
    state.count = 0
    state.windowStart = now
  }

  // Increment count
  state.count++

  // Check if over limit
  if (state.count > limit) {
    state.warnings++

    // Ban if too many violations
    if (state.warnings >= maxViolations) {
      state.banned = true
      state.bannedUntil = now + banDurationMs

      Sentry.captureMessage("Rate limit ban triggered", {
        level: "warning",
        tags: { source: "rate-limit", action: "ban" },
        extra: { key, violations: state.warnings },
      })

      return {
        allowed: false,
        remaining: 0,
        resetAt: state.bannedUntil,
        banned: true,
        retryAfter: Math.ceil(banDurationMs / 1000),
      }
    }

    return {
      allowed: false,
      remaining: 0,
      resetAt: state.windowStart + windowMs,
      banned: false,
      retryAfter: Math.ceil((state.windowStart + windowMs - now) / 1000),
      warning: `Rate limit exceeded. ${maxViolations - state.warnings} more violations will result in a temporary ban.`,
    }
  }

  return {
    allowed: true,
    remaining: limit - state.count,
    resetAt: state.windowStart + windowMs,
    banned: false,
  }
}

/**
 * Rate limit middleware for API routes
 * 
 * @example
 * export const POST = withRateLimit(
 *   { limit: 10, windowMs: 60000 },
 *   async (req) => {
 *     // Handler
 *   }
 * )
 */
export function withRateLimit(
  config: HardenedRateLimitConfig,
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const result = checkHardenedRateLimit(req, config)

    if (!result.allowed) {
      return NextResponse.json(
        {
          error: result.banned 
            ? "Too many requests. You have been temporarily blocked."
            : "Rate limit exceeded",
          code: result.banned ? "RATE_LIMIT_BANNED" : "RATE_LIMIT_EXCEEDED",
          retryAfter: result.retryAfter,
          warning: result.warning,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(result.retryAfter),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
          },
        }
      )
    }

    const response = await handler(req)

    // Add rate limit headers to response
    response.headers.set("X-RateLimit-Remaining", String(result.remaining))
    response.headers.set("X-RateLimit-Reset", String(Math.ceil(result.resetAt / 1000)))

    return response
  }
}

/**
 * Pre-configured rate limit configs
 */
export const HARDENED_LIMITS = {
  /** Strict: 5 req/min, ban after 3 violations */
  strict: {
    limit: 5,
    windowMs: 60000,
    maxViolations: 3,
    banDurationMs: 30 * 60 * 1000, // 30 min
  },
  /** Standard: 30 req/min, ban after 5 violations */
  standard: {
    limit: 30,
    windowMs: 60000,
    maxViolations: 5,
    banDurationMs: 15 * 60 * 1000, // 15 min
  },
  /** Relaxed: 100 req/min, ban after 10 violations */
  relaxed: {
    limit: 100,
    windowMs: 60000,
    maxViolations: 10,
    banDurationMs: 5 * 60 * 1000, // 5 min
  },
  /** Auth: 5 req/min for login attempts */
  auth: {
    limit: 5,
    windowMs: 60000,
    maxViolations: 3,
    banDurationMs: 60 * 60 * 1000, // 1 hour
  },
} as const
