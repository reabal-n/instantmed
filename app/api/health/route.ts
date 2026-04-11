import { NextRequest, NextResponse } from "next/server"
import { timingSafeEqual } from "crypto"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createLogger } from "@/lib/observability/logger"
import { stripe } from "@/lib/stripe/client"
import * as Sentry from "@sentry/nextjs"

const logger = createLogger("health-check")

// Throttle alerts to prevent spam (max 1 per 5 minutes per service)
const lastAlertTimes: Record<string, number> = {}
const ALERT_THROTTLE_MS = 5 * 60 * 1000

/**
 * Verify the request carries a valid CRON_SECRET or internal monitoring token.
 * Returns true if the caller is authorized to see detailed health data.
 */
function isAuthorizedMonitor(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || !authHeader) return false
  // Use timing-safe comparison to prevent timing attacks
  const expected = Buffer.from(`Bearer ${cronSecret}`)
  const actual = Buffer.from(authHeader)
  if (expected.length !== actual.length) return false
  return timingSafeEqual(expected, actual)
}

/**
 * GET /api/health
 * Health check endpoint for load balancers and monitoring
 *
 * Unauthenticated: returns { status: "ok" } (no infrastructure details)
 * Authenticated (Bearer CRON_SECRET): returns full diagnostics
 *
 * Returns:
 * - 200: All systems operational
 * - 503: One or more systems degraded
 */
export async function GET(request: NextRequest) {
  // For unauthenticated callers (load balancers, public probes), return
  // a minimal response that does not leak infrastructure details.
  if (!isAuthorizedMonitor(request)) {
    // Still run a lightweight DB check so load balancers get a real signal
    try {
      const supabase = createServiceRoleClient()
      const { error } = await supabase.from("services").select("id").limit(1)
      if (error) {
        return NextResponse.json({ status: "error" }, { status: 503 })
      }
    } catch {
      return NextResponse.json({ status: "error" }, { status: 503 })
    }
    return NextResponse.json({ status: "ok" })
  }

  // ---- Authenticated detailed health check below ----
  const checks: Record<string, { status: "ok" | "error"; latencyMs?: number; error?: string }> = {}
  const startTime = Date.now()

  // Check database connectivity
  try {
    const dbStart = Date.now()
    const supabase = createServiceRoleClient()
    const { error } = await supabase.from("services").select("id").limit(1)

    if (error) {
      checks.database = { status: "error", error: "Database unreachable" }
      logger.warn("Health check: database error", { error: error.message })
    } else {
      checks.database = { status: "ok", latencyMs: Date.now() - dbStart }
    }
  } catch (err) {
    checks.database = { status: "error", error: "Database unreachable" }
    logger.warn("Health check: database exception", { error: err instanceof Error ? err.message : "Unknown" })
  }

  // Check Redis connectivity (rate limiting)
  try {
    const redisStart = Date.now()
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      const { Redis } = await import("@upstash/redis")
      const redis = Redis.fromEnv()
      await redis.ping()
      checks.redis = { status: "ok", latencyMs: Date.now() - redisStart }
    } else {
      checks.redis = { status: "ok", latencyMs: 0 } // Not configured = using in-memory fallback
    }
  } catch (err) {
    checks.redis = { status: "error", error: "Redis unreachable" }
    logger.warn("Health check: redis error", { error: err instanceof Error ? err.message : "Unknown" })
  }

  // Check Stripe connectivity
  try {
    const stripeStart = Date.now()
    await stripe.balance.retrieve()
    checks.stripe = { status: "ok", latencyMs: Date.now() - stripeStart }
  } catch (err) {
    checks.stripe = { status: "error", error: "Stripe unreachable" }
    logger.warn("Health check: stripe error", { error: err instanceof Error ? err.message : "Unknown" })
  }

  // Check Resend (email delivery)
  try {
    const resendStart = Date.now()
    if (process.env.RESEND_API_KEY) {
      const res = await fetch("https://api.resend.com/domains", {
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
        signal: AbortSignal.timeout(5000),
      })
      checks.resend = res.ok
        ? { status: "ok", latencyMs: Date.now() - resendStart }
        : { status: "error", error: "Resend API error" }
    } else {
      checks.resend = { status: "error", error: "Resend not configured" }
    }
  } catch (err) {
    checks.resend = { status: "error", error: "Resend unreachable" }
    logger.warn("Health check: resend error", { error: err instanceof Error ? err.message : "Unknown" })
  }

  // Check Supabase Auth
  try {
    const authStart = Date.now()
    const supabaseAuth = createServiceRoleClient()
    // Lightweight auth admin call - list 1 user to verify the auth service responds
    const { error: authError } = await supabaseAuth.auth.admin.listUsers({ page: 1, perPage: 1 })
    if (authError) {
      checks.auth = { status: "error", error: "Supabase Auth error" }
      logger.warn("Health check: auth error", { error: authError.message })
    } else {
      checks.auth = { status: "ok", latencyMs: Date.now() - authStart }
    }
  } catch (err) {
    checks.auth = { status: "error", error: "Supabase Auth unreachable" }
    logger.warn("Health check: auth error", { error: err instanceof Error ? err.message : "Unknown" })
  }

  // Check environment variables
  const requiredEnvVars = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "STRIPE_SECRET_KEY",
  ]

  const missingEnvVars = requiredEnvVars.filter((key) => !process.env[key])
  if (missingEnvVars.length > 0) {
    checks.environment = {
      status: "error",
      error: `${missingEnvVars.length} required variable(s) missing`
    }
  } else {
    checks.environment = { status: "ok" }
  }

  // Determine overall health
  const allHealthy = Object.values(checks).every((check) => check.status === "ok")
  const totalLatencyMs = Date.now() - startTime

  if (!allHealthy) {
    logger.warn("Health check failed", { checks })

    // Alert via Sentry for degraded services (throttled)
    const now = Date.now()
    const failedServices = Object.entries(checks)
      .filter(([, check]) => check.status === "error")
      .map(([service]) => service)

    for (const service of failedServices) {
      if (!lastAlertTimes[service] || now - lastAlertTimes[service] > ALERT_THROTTLE_MS) {
        lastAlertTimes[service] = now
        Sentry.captureMessage(`Health check degraded: ${service}`, {
          level: "warning",
          tags: {
            source: "health-check",
            alert_type: "service_degraded",
            service,
          },
          extra: {
            checks,
            totalLatencyMs,
          },
        })
      }
    }
  }

  return NextResponse.json(
    {
      status: allHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      totalLatencyMs,
      checks,
    },
    { status: allHealthy ? 200 : 503 }
  )
}
