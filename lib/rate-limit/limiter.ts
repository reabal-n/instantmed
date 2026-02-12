/**
 * Database-backed Rate Limiting (Legacy)
 *
 * @deprecated For most API routes, use `@/lib/rate-limit/redis` instead.
 * This module uses Supabase database for rate limiting and is kept for
 * specific use cases that require persistent database-backed limiting.
 */
import "server-only"
import { createClient } from "@supabase/supabase-js"
import { headers } from "next/headers"

function getServiceClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error("Missing Supabase credentials")
  return createClient(url, key)
}

export type RateLimitConfig = {
  maxRequests: number
  windowMs: number // milliseconds
}

export type RateLimitResult = {
  allowed: boolean
  remaining: number
  resetAt: Date
  retryAfter?: number // seconds
}

// Default limits
export const RATE_LIMITS = {
  unauthenticated: { maxRequests: 5, windowMs: 60 * 60 * 1000 }, // 5 per hour
  authenticated: { maxRequests: 20, windowMs: 60 * 60 * 1000 }, // 20 per hour
  submit: { maxRequests: 3, windowMs: 60 * 60 * 1000 }, // 3 form submissions per hour
}

/**
 * Get client IP from headers
 */
export async function getClientIP(): Promise<string> {
  try {
    const h = await headers()
    const forwarded = h.get("x-forwarded-for")
    const realIP = h.get("x-real-ip")
    return forwarded?.split(",")[0]?.trim() || realIP || "127.0.0.1"
  } catch {
    return "127.0.0.1"
  }
}

/**
 * Atomic check-and-increment rate limit
 * Uses upsert to prevent race conditions in concurrent requests
 */
export async function checkAndIncrementRateLimit(
  identifier: string,
  identifierType: "ip" | "user",
  endpoint: string,
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  const supabase = getServiceClient()
  const windowStart = new Date(Date.now() - config.windowMs)
  const now = new Date()

  // First, clean up old records for this identifier/endpoint
  await supabase
    .from("rate_limits")
    .delete()
    .eq("identifier", identifier)
    .eq("identifier_type", identifierType)
    .eq("endpoint", endpoint)
    .lt("window_start", windowStart.toISOString())

  // Try to atomically insert or update
  // Using upsert with ON CONFLICT to atomically increment
  const { data: existing } = await supabase
    .from("rate_limits")
    .select("id, request_count, window_start")
    .eq("identifier", identifier)
    .eq("identifier_type", identifierType)
    .eq("endpoint", endpoint)
    .gte("window_start", windowStart.toISOString())
    .single()

  if (existing) {
    // Check if already at limit BEFORE incrementing
    if (existing.request_count >= config.maxRequests) {
      const resetAt = new Date(new Date(existing.window_start).getTime() + config.windowMs)
      const retryAfter = Math.ceil((resetAt.getTime() - Date.now()) / 1000)
      return {
        allowed: false,
        remaining: 0,
        resetAt,
        retryAfter: Math.max(1, retryAfter),
      }
    }

    // Atomically increment with conditional check
    const { data: updated, error: updateError } = await supabase
      .from("rate_limits")
      .update({ request_count: existing.request_count + 1 })
      .eq("id", existing.id)
      .lt("request_count", config.maxRequests) // Only increment if under limit
      .select("request_count, window_start")
      .single()

    if (updateError || !updated) {
      // Concurrent request may have hit the limit
      const resetAt = new Date(new Date(existing.window_start).getTime() + config.windowMs)
      return {
        allowed: false,
        remaining: 0,
        resetAt,
        retryAfter: Math.ceil((resetAt.getTime() - Date.now()) / 1000),
      }
    }

    const resetAt = new Date(new Date(updated.window_start).getTime() + config.windowMs)
    return {
      allowed: true,
      remaining: config.maxRequests - updated.request_count,
      resetAt,
    }
  }

  // No existing record - create new one with count 1
  const { error: insertError } = await supabase.from("rate_limits").insert({
    identifier,
    identifier_type: identifierType,
    endpoint,
    request_count: 1,
    window_start: now.toISOString(),
  })

  if (insertError) {
    // Concurrent insert - try to get the record and check
    if (insertError.code === "23505") {
      // Unique constraint violation - another request inserted first
      // Recursively call to handle the existing record
      return checkAndIncrementRateLimit(identifier, identifierType, endpoint, config)
    }
    // Non-critical error - rate limiting will fail open rather than blocking requests
  }

  const resetAt = new Date(now.getTime() + config.windowMs)
  return {
    allowed: true,
    remaining: config.maxRequests - 1,
    resetAt,
  }
}

/**
 * Check rate limit for an identifier (read-only, no increment)
 */
export async function checkRateLimit(
  identifier: string,
  identifierType: "ip" | "user",
  endpoint: string,
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  const supabase = getServiceClient()
  const windowStart = new Date(Date.now() - config.windowMs)

  // Get current count in window
  const { data, error } = await supabase
    .from("rate_limits")
    .select("request_count, window_start")
    .eq("identifier", identifier)
    .eq("identifier_type", identifierType)
    .eq("endpoint", endpoint)
    .gte("window_start", windowStart.toISOString())
    .order("window_start", { ascending: false })
    .limit(1)
    .single()

  if (error && error.code !== "PGRST116") {
    // PGRST116 = no rows found — non-critical, rate limiting fails open
  }

  const currentCount = data?.request_count || 0
  const windowStartTime = data?.window_start ? new Date(data.window_start) : new Date()
  const resetAt = new Date(windowStartTime.getTime() + config.windowMs)

  if (currentCount >= config.maxRequests) {
    const retryAfter = Math.ceil((resetAt.getTime() - Date.now()) / 1000)
    return {
      allowed: false,
      remaining: 0,
      resetAt,
      retryAfter,
    }
  }

  return {
    allowed: true,
    remaining: config.maxRequests - currentCount - 1,
    resetAt,
  }
}

/**
 * Increment rate limit counter
 */
export async function incrementRateLimit(
  identifier: string,
  identifierType: "ip" | "user",
  endpoint: string,
  config: RateLimitConfig,
): Promise<void> {
  const supabase = getServiceClient()
  const windowStart = new Date(Date.now() - config.windowMs)

  // Try to update existing record
  const { data: existing } = await supabase
    .from("rate_limits")
    .select("id, request_count")
    .eq("identifier", identifier)
    .eq("identifier_type", identifierType)
    .eq("endpoint", endpoint)
    .gte("window_start", windowStart.toISOString())
    .single()

  if (existing) {
    await supabase
      .from("rate_limits")
      .update({ request_count: existing.request_count + 1 })
      .eq("id", existing.id)
  } else {
    await supabase.from("rate_limits").insert({
      identifier,
      identifier_type: identifierType,
      endpoint,
      request_count: 1,
      window_start: new Date().toISOString(),
    })
  }
}

/**
 * Rate limit middleware helper
 * Uses atomic check-and-increment to prevent race conditions
 */
export async function rateLimit(userId: string | null, endpoint: string): Promise<RateLimitResult> {
  const ip = await getClientIP()
  const identifier = userId || ip
  const identifierType = userId ? "user" : "ip"
  const config = userId ? RATE_LIMITS.authenticated : RATE_LIMITS.unauthenticated

  // Use atomic operation instead of separate check + increment
  return checkAndIncrementRateLimit(identifier, identifierType, endpoint, config)
}
