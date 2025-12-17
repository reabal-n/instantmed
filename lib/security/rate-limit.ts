import { NextRequest, NextResponse } from "next/server"

interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Max requests per window
}

// In-memory store for rate limiting (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetTime < now) {
      rateLimitStore.delete(key)
    }
  }
}, 60000) // Clean every minute

export function rateLimit(config: RateLimitConfig) {
  return async function rateLimitMiddleware(
    request: NextRequest,
    identifier?: string
  ): Promise<{ success: boolean; remaining: number; resetIn: number } | NextResponse> {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || 
               request.headers.get("x-real-ip") || 
               "unknown"
    
    const key = identifier ? `${identifier}:${ip}` : ip
    const now = Date.now()
    
    const record = rateLimitStore.get(key)
    
    if (!record || record.resetTime < now) {
      // New window
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + config.windowMs,
      })
      return { 
        success: true, 
        remaining: config.maxRequests - 1,
        resetIn: config.windowMs 
      }
    }
    
    if (record.count >= config.maxRequests) {
      // Rate limited
      const resetIn = record.resetTime - now
      return NextResponse.json(
        { 
          error: "Too many requests", 
          retryAfter: Math.ceil(resetIn / 1000) 
        },
        { 
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil(resetIn / 1000)),
            "X-RateLimit-Limit": String(config.maxRequests),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(record.resetTime),
          }
        }
      )
    }
    
    // Increment count
    record.count++
    rateLimitStore.set(key, record)
    
    return { 
      success: true, 
      remaining: config.maxRequests - record.count,
      resetIn: record.resetTime - now 
    }
  }
}

// Pre-configured rate limiters
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 10, // 10 login attempts per 15 minutes
})

export const apiRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 60, // 60 requests per minute
})

export const strictRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 5, // 5 requests per minute (for sensitive operations)
})
