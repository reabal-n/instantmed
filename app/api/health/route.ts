import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createLogger } from "@/lib/observability/logger"
import { stripe } from "@/lib/stripe/client"

const logger = createLogger("health-check")

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
