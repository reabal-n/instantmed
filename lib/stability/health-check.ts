/**
 * Health Check Utilities
 * 
 * System health monitoring for critical services.
 */

import { createClient } from "@supabase/supabase-js"

export type ServiceStatus = "healthy" | "degraded" | "unhealthy"

export interface HealthCheckResult {
  service: string
  status: ServiceStatus
  latency?: number
  error?: string
  timestamp: string
}

export interface SystemHealth {
  status: ServiceStatus
  services: HealthCheckResult[]
  timestamp: string
}

/**
 * Check database connectivity
 */
async function checkDatabase(): Promise<HealthCheckResult> {
  const start = Date.now()
  const service = "database"

  try {
    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    const { error } = await client.from("profiles").select("id").limit(1)
    
    if (error) throw error

    return {
      service,
      status: "healthy",
      latency: Date.now() - start,
      timestamp: new Date().toISOString(),
    }
  } catch (error) {
    return {
      service,
      status: "unhealthy",
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    }
  }
}

/**
 * Check Stripe connectivity
 */
async function checkStripe(): Promise<HealthCheckResult> {
  const start = Date.now()
  const service = "stripe"

  try {
    // Just verify the API key is valid by checking balance
    const response = await fetch("https://api.stripe.com/v1/balance", {
      headers: {
        Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      },
    })

    if (!response.ok) throw new Error(`Stripe API error: ${response.status}`)

    return {
      service,
      status: "healthy",
      latency: Date.now() - start,
      timestamp: new Date().toISOString(),
    }
  } catch (error) {
    return {
      service,
      status: "unhealthy",
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    }
  }
}

/**
 * Check email service (Resend)
 */
async function checkEmail(): Promise<HealthCheckResult> {
  const start = Date.now()
  const service = "email"

  try {
    const response = await fetch("https://api.resend.com/domains", {
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
    })

    if (!response.ok) throw new Error(`Resend API error: ${response.status}`)

    return {
      service,
      status: "healthy",
      latency: Date.now() - start,
      timestamp: new Date().toISOString(),
    }
  } catch (error) {
    return {
      service,
      status: "unhealthy",
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    }
  }
}

/**
 * Run all health checks
 */
export async function runHealthChecks(): Promise<SystemHealth> {
  const results = await Promise.all([
    checkDatabase(),
    checkStripe(),
    checkEmail(),
  ])

  const hasUnhealthy = results.some((r) => r.status === "unhealthy")
  const hasDegraded = results.some((r) => r.status === "degraded")

  return {
    status: hasUnhealthy ? "unhealthy" : hasDegraded ? "degraded" : "healthy",
    services: results,
    timestamp: new Date().toISOString(),
  }
}

/**
 * Quick database-only health check for load balancers
 */
export async function quickHealthCheck(): Promise<boolean> {
  try {
    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    const { error } = await client.rpc("health_check")
    return !error
  } catch {
    return false
  }
}
