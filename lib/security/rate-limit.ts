import "server-only"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { logger } from "@/lib/observability/logger"

/**
 * Rate Limiting for Doctor Actions
 * 
 * P0 SECURITY: Prevents compromised accounts from mass-approving requests.
 * Uses database-backed sliding window for distributed rate limiting.
 */

interface RateLimitConfig {
  windowMs: number      // Time window in milliseconds
  maxRequests: number   // Max requests allowed in window
  action: string        // Action type for logging
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: Date
  error?: string
}

// Default rate limits for doctor actions
export const RATE_LIMITS = {
  approval: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 50,          // 50 approvals per hour
    action: "intake_approval",
  },
  decline: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 100,         // 100 declines per hour (higher as batch declines are common)
    action: "intake_decline",
  },
  certificate: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 30,          // 30 certificates per hour
    action: "certificate_issue",
  },
} as const

// In-memory fallback for when DB is unavailable.
// Uses per-action limits matching RATE_LIMITS to prevent abuse.
const inMemoryLimits = new Map<string, number[]>()

// Periodic cleanup: remove stale entries every 15 minutes
const CLEANUP_INTERVAL_MS = 15 * 60 * 1000
let lastCleanup = Date.now()

function cleanupStaleEntries(maxAge: number = 60 * 60 * 1000) {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return
  lastCleanup = now
  for (const [key, timestamps] of inMemoryLimits) {
    const recent = timestamps.filter(t => t > now - maxAge)
    if (recent.length === 0) {
      inMemoryLimits.delete(key)
    } else {
      inMemoryLimits.set(key, recent)
    }
  }
}

function checkInMemoryFallback(key: string, maxActions: number, windowMs: number): boolean {
  cleanupStaleEntries(windowMs)
  const now = Date.now()
  const timestamps = inMemoryLimits.get(key) || []
  const recent = timestamps.filter(t => t > now - windowMs)
  recent.push(now)
  inMemoryLimits.set(key, recent)
  return recent.length <= maxActions
}

/**
 * Check if an action is rate limited for a user
 * Uses database-backed rate limiting for distributed systems
 */
export async function checkRateLimit(
  userId: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const supabase = createServiceRoleClient()
  const now = new Date()
  const windowStart = new Date(now.getTime() - config.windowMs)

  try {
    // Count recent actions in the sliding window
    const { count, error } = await supabase
      .from("audit_logs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("action", config.action)
      .gte("created_at", windowStart.toISOString())

    if (error) {
      logger.error("Rate limit check failed", { userId, action: config.action }, error)
      // DB query failed — use in-memory fallback to prevent unlimited abuse
      const fallbackKey = `${userId}:${config.action}`
      const fallbackAllowed = checkInMemoryFallback(
        fallbackKey,
        config.maxRequests,
        config.windowMs
      )
      if (!fallbackAllowed) {
        logger.warn("In-memory rate limit fallback triggered", {
          userId,
          action: config.action,
          fallbackMax: config.maxRequests,
        })
      }
      return {
        allowed: fallbackAllowed,
        remaining: fallbackAllowed ? config.maxRequests : 0,
        resetAt: new Date(now.getTime() + config.windowMs),
        error: fallbackAllowed
          ? "Rate limit check failed - allowing action (in-memory fallback)"
          : "Rate limit check failed - blocked by in-memory fallback",
      }
    }

    const currentCount = count || 0
    const remaining = Math.max(0, config.maxRequests - currentCount)
    const allowed = currentCount < config.maxRequests

    if (!allowed) {
      logger.warn("Rate limit exceeded", {
        userId,
        action: config.action,
        count: currentCount,
        limit: config.maxRequests,
      })
    }

    return {
      allowed,
      remaining,
      resetAt: new Date(now.getTime() + config.windowMs),
    }
  } catch (err) {
    logger.error("Rate limit error", { userId, action: config.action }, err instanceof Error ? err : new Error(String(err)))
    // DB unavailable — use in-memory fallback to prevent unlimited abuse
    const fallbackKey = `${userId}:${config.action}`
    const fallbackAllowed = checkInMemoryFallback(
      fallbackKey,
      config.maxRequests,
      config.windowMs
    )
    if (!fallbackAllowed) {
      logger.warn("In-memory rate limit fallback triggered", {
        userId,
        action: config.action,
        fallbackMax: config.maxRequests,
      })
    }
    return {
      allowed: fallbackAllowed,
      remaining: fallbackAllowed ? config.maxRequests : 0,
      resetAt: new Date(now.getTime() + config.windowMs),
      error: fallbackAllowed
        ? "Rate limit check failed - allowing action (in-memory fallback)"
        : "Rate limit check failed - blocked by in-memory fallback",
    }
  }
}

/**
 * Record an action for rate limiting purposes
 */
export async function recordRateLimitedAction(
  userId: string,
  action: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const supabase = createServiceRoleClient()

  try {
    await supabase.from("audit_logs").insert({
      user_id: userId,
      action,
      metadata: metadata || {},
      created_at: new Date().toISOString(),
    })
  } catch (err) {
    logger.error("Failed to record rate limited action", { userId, action }, err instanceof Error ? err : new Error(String(err)))
  }
}

/**
 * Helper to check and record approval rate limit
 */
export async function checkApprovalRateLimit(doctorId: string): Promise<RateLimitResult> {
  return checkRateLimit(doctorId, RATE_LIMITS.approval)
}

/**
 * Helper to check and record certificate rate limit
 */
export async function checkCertificateRateLimit(doctorId: string): Promise<RateLimitResult> {
  return checkRateLimit(doctorId, RATE_LIMITS.certificate)
}
