import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createLogger } from "@/lib/observability/logger"
import { stripe } from "@/lib/stripe/client"
import * as Sentry from "@sentry/nextjs"

const logger = createLogger("health-check")

// Throttle alerts to prevent spam (max 1 per 5 minutes per service)
const lastAlertTimes: Record<string, number> = {}
const ALERT_THROTTLE_MS = 5 * 60 * 1000

/**
 * GET /api/health
 * Health check endpoint for load balancers and monitoring
 * 
 * Returns:
 * - 200: All systems operational
 * - 503: One or more systems degraded
 */
export async function GET() {
  const checks: Record<string, { status: "ok" | "error"; latencyMs?: number; error?: string }> = {}
  const startTime = Date.now()

  // Check database connectivity
  try {
    const dbStart = Date.now()
    const supabase = createServiceRoleClient()
    const { error } = await supabase.from("services").select("id").limit(1)
    
    if (error) {
      checks.database = { status: "error", error: error.message }
    } else {
      checks.database = { status: "ok", latencyMs: Date.now() - dbStart }
    }
  } catch (err) {
    checks.database = { 
      status: "error", 
      error: err instanceof Error ? err.message : "Unknown error" 
    }
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
    checks.redis = {
      status: "error",
      error: err instanceof Error ? err.message : "Redis connection failed"
    }
  }

  // Check Stripe connectivity
  try {
    const stripeStart = Date.now()
    await stripe.balance.retrieve()
    checks.stripe = { status: "ok", latencyMs: Date.now() - stripeStart }
  } catch (err) {
    checks.stripe = {
      status: "error",
      error: err instanceof Error ? err.message : "Stripe API unreachable"
    }
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
      error: `Missing: ${missingEnvVars.join(", ")}` 
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
