/* eslint-disable no-console -- Rate limiting needs console as fallback */
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
  const headersList = await headers()
  return headersList.get("x-forwarded-for")?.split(",")[0]?.trim() || headersList.get("x-real-ip") || "unknown"
}

/**
 * Check rate limit for an identifier
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
    // PGRST116 = no rows found
    if (process.env.NODE_ENV === 'development') {
      console.error("Rate limit check error:", error)
    }
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
 */
export async function rateLimit(userId: string | null, endpoint: string): Promise<RateLimitResult> {
  const ip = await getClientIP()
  const identifier = userId || ip
  const identifierType = userId ? "user" : "ip"
  const config = userId ? RATE_LIMITS.authenticated : RATE_LIMITS.unauthenticated

  const result = await checkRateLimit(identifier, identifierType, endpoint, config)

  if (result.allowed) {
    await incrementRateLimit(identifier, identifierType, endpoint, config)
  }

  return result
}
