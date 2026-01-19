import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import * as Sentry from "@sentry/nextjs"

// Simple in-memory token bucket for fallback rate limiting
// Note: Only works per-instance, not distributed
const memoryBuckets = new Map<string, { tokens: number; lastRefill: number }>()
const MEMORY_LIMITS = { auth: 15, ai: 10, checkout: 5, global: 100 }

function memoryFallbackCheck(identifier: string, type: 'auth' | 'ai' | 'checkout' | 'global'): { success: boolean } {
  const key = `${type}:${identifier}`
  const maxTokens = MEMORY_LIMITS[type]
  const now = Date.now()
  
  let bucket = memoryBuckets.get(key)
  if (!bucket) {
    bucket = { tokens: maxTokens, lastRefill: now }
    memoryBuckets.set(key, bucket)
  }
  
  // Refill tokens (1 token per second for auth/checkout, more for others)
  const refillRate = type === 'global' ? 1.67 : type === 'ai' ? 0.167 : 0.083
  const elapsed = (now - bucket.lastRefill) / 1000
  bucket.tokens = Math.min(maxTokens, bucket.tokens + elapsed * refillRate)
  bucket.lastRefill = now
  
  if (bucket.tokens >= 1) {
    bucket.tokens -= 1
    return { success: true }
  }
  
  return { success: false }
}

// Throttle rate limiter failure alerts (max 1 per 5 minutes)
let lastRateLimitAlertTime = 0
const RATE_LIMIT_ALERT_THROTTLE_MS = 5 * 60 * 1000

// Initialize rate limiter (only if Upstash is configured)
let rateLimiter: Ratelimit | null = null
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  rateLimiter = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(100, "60 s"),
    analytics: true,
    prefix: "ratelimit:global",
  })
}

// Rate limiter for auth endpoints (15 req/min allows normal login flows)
let authRateLimiter: Ratelimit | null = null
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  authRateLimiter = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(15, "60 s"),
    analytics: true,
    prefix: "ratelimit:auth",
  })
}

// Stricter rate limiter for AI endpoints (cost control)
let aiRateLimiter: Ratelimit | null = null
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  aiRateLimiter = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(10, "60 s"),
    analytics: true,
    prefix: "ratelimit:ai",
  })
}

// Stricter rate limiter for checkout/payment endpoints (abuse prevention)
let checkoutRateLimiter: Ratelimit | null = null
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  checkoutRateLimiter = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(5, "60 s"),
    analytics: true,
    prefix: "ratelimit:checkout",
  })
}

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for")
  const realIp = request.headers.get("x-real-ip")
  if (forwardedFor) return forwardedFor.split(",")[0].trim()
  if (realIp) return realIp
  return "anonymous"
}

// Define public routes that don't require authentication
const publicRoutes = [
  '/',
  '/sign-in',
  '/sign-up',
  '/login',
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/callback',
  '/api/webhooks',
  '/api/stripe/webhook',
  '/api/med-cert/preview',
  '/api/medications',
  '/api/search',
  '/api/terminology',
  '/medical-certificate',
  '/medical-certificates',
  '/prescriptions',
  '/medications',
  '/about',
  '/contact',
  '/faq',
  '/how-it-works',
  '/pricing',
  '/privacy',
  '/terms',
  '/trust',
  '/reviews',
  '/blog',
  '/start',
  '/request',
  '/consult',
  '/gp-consult',
  '/general-consult',
  '/repeat-prescription',
  '/repeat-prescriptions',
  '/locations',
  '/verify',
  '/health',
  '/for',
  '/hair-loss',
  '/weight-loss',
  '/weight-management',
  '/mens-health',
  '/womens-health',
  '/performance-anxiety',
  '/track',
  '/offline',
]

// Define routes that should be ignored by middleware entirely
const ignoredRoutes = [
  '/api/webhooks',
  '/api/stripe/webhook',
  '/_next',
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml',
  '/manifest.webmanifest',
]

function isPublicRoute(pathname: string): boolean {
  return publicRoutes.some(route => {
    if (route.endsWith('/')) {
      return pathname === route || pathname.startsWith(route)
    }
    return pathname === route || pathname.startsWith(route + '/')
  })
}

function isIgnoredRoute(pathname: string): boolean {
  return ignoredRoutes.some(route => pathname.startsWith(route))
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware for ignored routes
  if (isIgnoredRoute(pathname)) {
    return NextResponse.next()
  }

  // Apply rate limiting if Upstash is configured
  // Select appropriate rate limiter based on route sensitivity
  const isAuthRoute = pathname.startsWith('/auth/') || pathname.startsWith('/api/auth/')
  const isAiRoute = pathname.startsWith('/api/ai/') || pathname.startsWith('/api/flow/drafts')
  const isCheckoutRoute = pathname.startsWith('/api/stripe/') && !pathname.includes('/webhook')
  
  let limiter: Ratelimit | null = rateLimiter
  if (isAuthRoute) {
    limiter = authRateLimiter
  } else if (isAiRoute) {
    limiter = aiRateLimiter
  } else if (isCheckoutRoute) {
    limiter = checkoutRateLimiter
  }
  
  const ip = getClientIp(request)
  
  if (limiter) {
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
    } catch (rateLimitError) {
      // Upstash failed - use in-memory fallback for critical paths
      const errorMessage = rateLimitError instanceof Error ? rateLimitError.message : "Unknown error"
      
      // eslint-disable-next-line no-console -- Intentional: middleware runs in edge, needs console for observability
      console.error("[Middleware] Upstash rate limiter failed - using memory fallback", {
        error: errorMessage,
        path: pathname,
      })
      
      // Apply memory-based rate limiting as fallback for sensitive routes
      if (isAuthRoute || isAiRoute || isCheckoutRoute) {
        const fallbackResult = memoryFallbackCheck(ip, isAuthRoute ? 'auth' : isAiRoute ? 'ai' : 'checkout')
        if (!fallbackResult.success) {
          return NextResponse.json(
            {
              error: "Too many requests",
              message: "Please slow down and try again later",
              retryAfter: 60,
            },
            { status: 429 }
          )
        }
      }
      
      // Alert via Sentry (throttled to prevent alert storm)
      const now = Date.now()
      if (now - lastRateLimitAlertTime > RATE_LIMIT_ALERT_THROTTLE_MS) {
        lastRateLimitAlertTime = now
        Sentry.captureMessage("Rate limiter degraded - Upstash may be down, using memory fallback", {
          level: "warning",
          tags: {
            source: "middleware-rate-limiter",
            alert_type: "degraded_service",
          },
          extra: {
            error: errorMessage,
            path: pathname,
          },
        })
      }
    }
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh the session if it exists
  const { data: { user } } = await supabase.auth.getUser()

  // Protect non-public routes
  if (!isPublicRoute(pathname) && !user) {
    const redirectUrl = new URL('/auth/login', request.url)
    redirectUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  return response
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
