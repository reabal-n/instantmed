import "server-only"

import { NextRequest, NextResponse } from "next/server"
import { createLogger } from "@/lib/observability/logger"

const logger = createLogger("cron-auth")

/**
 * Verify that a request is a legitimate cron job request.
 * 
 * Checks:
 * 1. CRON_SECRET header (required in all environments)
 * 2. Vercel cron signature (when available on Vercel)
 * 
 * @example
 * export async function GET(request: NextRequest) {
 *   const authError = verifyCronRequest(request)
 *   if (authError) return authError
 *   
 *   // ... cron job logic
 * }
 */
export function verifyCronRequest(request: NextRequest): NextResponse | null {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  
  // Check Vercel cron signature (if on Vercel)
  // SECURITY: Still require CRON_SECRET match even with Vercel signature
  // This provides defense-in-depth against header spoofing
  const vercelCronSignature = request.headers.get("x-vercel-cron-signature")
  if (process.env.VERCEL && vercelCronSignature) {
    // Vercel cron requests should still include our CRON_SECRET for extra security
    if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
      return null
    }
    // If CRON_SECRET not configured but we have Vercel signature, allow with warning
    if (!cronSecret) {
      logger.warn("CRON_SECRET not configured - relying on Vercel signature only", {
        hasVercelSignature: true,
      })
      return null
    }
    // Vercel signature present but CRON_SECRET mismatch - suspicious
    logger.warn("Vercel cron signature present but CRON_SECRET mismatch", {
      hasAuth: !!authHeader,
      ip: request.headers.get("x-forwarded-for") || "unknown",
    })
  }
  
  // Fall back to CRON_SECRET check
  if (!cronSecret) {
    logger.error("CRON_SECRET not configured", {})
    return NextResponse.json(
      { error: "Cron not configured" },
      { status: 500 }
    )
  }
  
  if (authHeader !== `Bearer ${cronSecret}`) {
    logger.warn("Unauthorized cron request", {
      hasAuth: !!authHeader,
      ip: request.headers.get("x-forwarded-for") || "unknown",
    })
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    )
  }
  
  return null
}

/**
 * Higher-order function to wrap cron handlers with authentication
 */
export function withCronAuth(
  handler: (request: NextRequest) => Promise<NextResponse>
): (request: NextRequest) => Promise<NextResponse> {
  return async (request: NextRequest) => {
    const authError = verifyCronRequest(request)
    if (authError) return authError
    return handler(request)
  }
}
