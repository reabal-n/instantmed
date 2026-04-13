import "server-only"

import * as Sentry from "@sentry/nextjs"
import { timingSafeEqual } from "crypto"
import { NextRequest, NextResponse } from "next/server"

import { createLogger } from "@/lib/observability/logger"

const logger = createLogger("cron-auth")

/** Constant-time string comparison to prevent timing attacks */
function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

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
    if (cronSecret && authHeader && safeCompare(authHeader, `Bearer ${cronSecret}`)) {
      return null
    }
    // If CRON_SECRET not configured, reject - fail-closed for security
    if (!cronSecret) {
      logger.error("CRON_SECRET not configured - rejecting cron request even with Vercel signature", {
        hasVercelSignature: true,
      })
      return NextResponse.json(
        { error: "Cron not configured" },
        { status: 500 }
      )
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
  
  if (!authHeader || !safeCompare(authHeader, `Bearer ${cronSecret}`)) {
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

/**
 * AUDIT FIX: Cron job concurrency lock using database.
 * Prevents overlapping execution when a cron job takes longer than its schedule interval.
 * Uses Supabase to store lock state (works across serverless instances).
 *
 * @example
 * const lock = await acquireCronLock("health-check", 300) // 5 min max
 * if (!lock.acquired) return NextResponse.json({ skipped: "already running" })
 * try {
 *   // ... cron logic
 * } finally {
 *   await releaseCronLock("health-check")
 * }
 */
export async function acquireCronLock(
  jobName: string,
  maxDurationSeconds: number = 300
): Promise<{ acquired: boolean; existingLockAge?: number }> {
  try {
    const { createServiceRoleClient } = await import("@/lib/supabase/service-role")
    const supabase = createServiceRoleClient()
    const now = new Date()
    const expiresAt = new Date(now.getTime() + maxDurationSeconds * 1000)

    // Try to claim lock - delete any expired locks first
    await supabase
      .from("cron_locks")
      .delete()
      .eq("job_name", jobName)
      .lt("expires_at", now.toISOString())

    // Attempt insert (unique constraint on job_name prevents duplicates)
    const { error } = await supabase
      .from("cron_locks")
      .insert({
        job_name: jobName,
        locked_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
      })

    if (error) {
      if (error.code === "23505") {
        // Lock already held - check age for monitoring
        const { data: existing } = await supabase
          .from("cron_locks")
          .select("locked_at")
          .eq("job_name", jobName)
          .single()

        const lockAge = existing
          ? Math.round((now.getTime() - new Date(existing.locked_at).getTime()) / 1000)
          : undefined

        logger.info("Cron lock already held, skipping", { jobName, lockAgeSeconds: lockAge })

        // Alert if lock has been held for longer than 2x the expected max duration
        const stuckThreshold = maxDurationSeconds * 2
        if (lockAge && lockAge > stuckThreshold) {
          logger.error("Cron lock appears stuck", { jobName, lockAgeSeconds: lockAge, stuckThreshold })
          Sentry.captureMessage(`Cron lock stuck: ${jobName} held for ${lockAge}s (threshold: ${stuckThreshold}s)`, {
            level: "warning",
            tags: { cronJob: jobName },
            extra: { lockAgeSeconds: lockAge, maxDurationSeconds, stuckThreshold },
          })
        }

        return { acquired: false, existingLockAge: lockAge }
      }
      throw error
    }

    return { acquired: true }
  } catch (err) {
    // If lock table doesn't exist or DB error, block execution (fail-closed for safety)
    logger.error("Cron lock acquisition failed, blocking execution", {
      jobName,
      error: err instanceof Error ? err.message : String(err)
    })
    Sentry.captureException(err, {
      tags: { cronJob: jobName },
      extra: { context: "cron-lock-acquisition-failure" },
    })
    return { acquired: false }
  }
}

export async function releaseCronLock(jobName: string): Promise<void> {
  try {
    const { createServiceRoleClient } = await import("@/lib/supabase/service-role")
    const supabase = createServiceRoleClient()
    await supabase.from("cron_locks").delete().eq("job_name", jobName)
  } catch (err) {
    logger.warn("Cron lock release failed", {
      jobName,
      error: err instanceof Error ? err.message : String(err)
    })
  }
}
