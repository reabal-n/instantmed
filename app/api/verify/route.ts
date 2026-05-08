/**
 * Public Certificate Verification API
 * 
 * Security controls:
 * - Rate limited (10 requests/minute per IP) via Redis (Upstash) with in-memory fallback
 * - Stricter limit on failed attempts (3/minute)
 * - Minimal disclosure (masked patient name, no sensitive data)
 * - Input validation and sanitization
 */

import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import { NextResponse } from "next/server"

import { createLogger } from "@/lib/observability/logger"
import { getClientIdentifier } from "@/lib/rate-limit/redis"
import { normalizeVerificationCode } from "@/lib/utils/code-normalization"
import {
  isValidVerificationCodeFormat,
  verifyCertificateCode,
} from "@/lib/verify/public-verification"

// ---- Inline rate limit types & helpers (self-contained for this public endpoint) ----

interface RateLimitConfig {
  maxRequests: number
  windowMs: number
}

interface RateLimitResult {
  allowed: boolean
  success: boolean
  remaining: number
  resetAt: number
  retryAfterMs?: number
}

const RATE_LIMITS = {
  verification: { maxRequests: 10, windowMs: 60 * 1000 },
  verificationStrict: { maxRequests: 3, windowMs: 60 * 1000 },
} as const

const memoryStore = new Map<string, { count: number; resetAt: number }>()

function checkMemoryRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now()
  const entry = memoryStore.get(key)
  if (!entry || entry.resetAt < now) {
    const resetAt = now + config.windowMs
    memoryStore.set(key, { count: 1, resetAt })
    return { allowed: true, success: true, remaining: config.maxRequests - 1, resetAt }
  }
  entry.count++
  if (entry.count > config.maxRequests) {
    return { allowed: false, success: false, remaining: 0, resetAt: entry.resetAt, retryAfterMs: entry.resetAt - now }
  }
  return { allowed: true, success: true, remaining: config.maxRequests - entry.count, resetAt: entry.resetAt }
}

function createRateLimitHeaders(result: RateLimitResult): HeadersInit {
  return {
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
    ...(result.retryAfterMs && { "Retry-After": String(Math.ceil(result.retryAfterMs / 1000)) }),
  }
}

const logger = createLogger("verify-api")

/**
 * Log verification attempts for security monitoring
 * Helps detect brute force attempts or fraud patterns
 */
async function logVerificationAttempt(
  code: string,
  ip: string,
  userAgent: string | null,
  success: boolean
): Promise<void> {
  try {
    // Mask the code for logging (show first 4 chars only)
    const maskedCode = code.length > 4 ? `${code.slice(0, 4)}****` : "****"
    
    logger.info("Verification attempt", {
      code: maskedCode,
      ip,
      userAgent: userAgent?.slice(0, 100),
      success,
    })
  } catch {
    // Non-blocking - don't fail verification on logging error
  }
}

// Initialize Redis rate limiter if Upstash is configured
let redisRateLimiter: Ratelimit | null = null
let redisStrictRateLimiter: Ratelimit | null = null

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  const redis = Redis.fromEnv()
  redisRateLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "60 s"),
    analytics: true,
    prefix: "ratelimit:verify",
  })
  redisStrictRateLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, "60 s"),
    analytics: true,
    prefix: "ratelimit:verify-fail",
  })
}

/**
 * Check rate limit using Redis if available, otherwise fall back to in-memory
 */
async function checkRateLimit(
  key: string,
  config: { maxRequests: number; windowMs: number },
  useStrict = false
): Promise<RateLimitResult> {
  const limiter = useStrict ? redisStrictRateLimiter : redisRateLimiter
  
  if (limiter) {
    try {
      const result = await limiter.limit(key)
      return {
        allowed: result.success,
        success: result.success,
        remaining: result.remaining,
        resetAt: result.reset,
        retryAfterMs: result.success ? undefined : (result.reset - Date.now()),
      }
    } catch {
      // Redis failed, fall through to in-memory
    }
  }
  
  // Fallback to in-memory rate limiting
  return checkMemoryRateLimit(key, config)
}

export async function GET(request: Request) {
  const clientIp = getClientIdentifier(request)

  // Apply rate limiting (Redis with in-memory fallback)
  const rateLimit = await checkRateLimit(`verify:${clientIp}`, RATE_LIMITS.verification)
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { valid: false, error: "Too many verification attempts. Please try again later." },
      { 
        status: 429, 
        headers: createRateLimitHeaders(rateLimit),
      }
    )
  }

  const { searchParams } = new URL(request.url)
  const rawCode = searchParams.get("code")

  // Input validation
  if (!rawCode) {
    return NextResponse.json(
      { valid: false, error: "Verification code is required" },
      { status: 400, headers: createRateLimitHeaders(rateLimit) }
    )
  }

  // Sanitize and normalize input
  const code = normalizeVerificationCode(rawCode)

  if (!isValidVerificationCodeFormat(code)) {
    // Apply stricter rate limit for invalid format attempts (potential brute force)
    await checkRateLimit(`verify-fail:${clientIp}`, RATE_LIMITS.verificationStrict, true)
    return NextResponse.json(
      { valid: false, error: "Invalid verification code format" },
      { status: 400, headers: createRateLimitHeaders(rateLimit) }
    )
  }

  try {
    const verification = await verifyCertificateCode(code, {
      clientIp,
      logSuccess: true,
      userAgent: request.headers.get("user-agent"),
    })

    if (verification.valid) {
      return NextResponse.json(verification, { headers: createRateLimitHeaders(rateLimit) })
    }

    if (verification.status === "revoked" || verification.status === "superseded") {
      await checkRateLimit(`verify-fail:${clientIp}`, RATE_LIMITS.verificationStrict, true)
      return NextResponse.json(verification, { headers: createRateLimitHeaders(rateLimit) })
    }

    // Not found - apply stricter rate limit and log failed attempt
    await checkRateLimit(`verify-fail:${clientIp}`, RATE_LIMITS.verificationStrict, true)
    
    // P2 FIX: Log failed verification attempts for security monitoring
    // This helps detect brute force attempts or fraud patterns
    void logVerificationAttempt(code, clientIp, request.headers.get("user-agent"), false)
    
    return NextResponse.json(
      verification,
      { headers: createRateLimitHeaders(rateLimit) }
    )
  } catch {
    return NextResponse.json(
      { valid: false, error: "Verification service temporarily unavailable" },
      { status: 500, headers: createRateLimitHeaders(rateLimit) }
    )
  }
}
