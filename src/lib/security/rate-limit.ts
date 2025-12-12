// ============================================
// RATE LIMITING: Protect against abuse
// ============================================

import { headers } from 'next/headers'

interface RateLimitConfig {
  windowMs: number // Time window in ms
  maxRequests: number // Max requests per window
}

// In-memory store (use Redis/Upstash in production)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

// Configuration for different endpoints
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  auth: { windowMs: 15 * 60 * 1000, maxRequests: 10 }, // 10 requests per 15 min
  message: { windowMs: 60 * 1000, maxRequests: 30 }, // 30 messages per minute
  upload: { windowMs: 60 * 1000, maxRequests: 10 }, // 10 uploads per minute
  general: { windowMs: 60 * 1000, maxRequests: 100 }, // 100 requests per minute
  publicForm: { windowMs: 60 * 1000, maxRequests: 5 }, // 5 submissions per minute
}

/**
 * Get client IP address from headers
 */
export async function getClientIp(): Promise<string> {
  const headersList = await headers()
  return (
    headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headersList.get('x-real-ip') ||
    'unknown'
  )
}

/**
 * Check rate limit for a given key
 */
export async function checkRateLimit(
  identifier: string,
  limitType: keyof typeof RATE_LIMITS = 'general'
): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
  const config = RATE_LIMITS[limitType]
  const now = Date.now()
  const key = `${limitType}:${identifier}`

  // Get or create rate limit entry
  let entry = rateLimitStore.get(key)

  if (!entry || now > entry.resetAt) {
    // Create new window
    entry = { count: 0, resetAt: now + config.windowMs }
  }

  entry.count++
  rateLimitStore.set(key, entry)

  const remaining = Math.max(0, config.maxRequests - entry.count)
  const resetIn = Math.ceil((entry.resetAt - now) / 1000)

  return {
    allowed: entry.count <= config.maxRequests,
    remaining,
    resetIn,
  }
}

/**
 * Rate limit middleware for API routes
 */
export async function rateLimit(
  limitType: keyof typeof RATE_LIMITS = 'general'
): Promise<{ success: boolean; headers: Record<string, string>; error?: string }> {
  const ip = await getClientIp()
  const result = await checkRateLimit(ip, limitType)

  const rateLimitHeaders = {
    'X-RateLimit-Limit': String(RATE_LIMITS[limitType].maxRequests),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(result.resetIn),
  }

  if (!result.allowed) {
    return {
      success: false,
      headers: rateLimitHeaders,
      error: `Rate limit exceeded. Please try again in ${result.resetIn} seconds.`,
    }
  }

  return { success: true, headers: rateLimitHeaders }
}

/**
 * Clean up expired entries (call periodically)
 */
export function cleanupRateLimitStore(): void {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetAt) {
      rateLimitStore.delete(key)
    }
  }
}

// Run cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupRateLimitStore, 5 * 60 * 1000)
}
