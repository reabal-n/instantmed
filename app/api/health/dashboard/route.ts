import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

interface HealthCheck {
  name: string
  status: "healthy" | "degraded" | "unhealthy"
  latencyMs?: number
  error?: string
}

export async function GET() {
  const checks: HealthCheck[] = []
  const startTime = Date.now()

  // Check Supabase connection
  const supabaseCheck = await checkSupabase()
  checks.push(supabaseCheck)

  // Check critical tables
  const tablesCheck = await checkCriticalTables()
  checks.push(tablesCheck)

  // Check RPC functions
  const rpcCheck = await checkRPCFunctions()
  checks.push(rpcCheck)

  // Determine overall status
  const hasUnhealthy = checks.some((c) => c.status === "unhealthy")
  const hasDegraded = checks.some((c) => c.status === "degraded")
  const overallStatus = hasUnhealthy ? "unhealthy" : hasDegraded ? "degraded" : "healthy"

  return NextResponse.json(
    {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      totalLatencyMs: Date.now() - startTime,
      checks,
    },
    { status: overallStatus === "healthy" ? 200 : overallStatus === "degraded" ? 200 : 503 }
  )
}

async function checkSupabase(): Promise<HealthCheck> {
  const start = Date.now()
  try {
    const supabase = createServiceRoleClient()
    const { error } = await supabase.from("profiles").select("id").limit(1)
    
    if (error) {
      return {
        name: "supabase_connection",
        status: "unhealthy",
        latencyMs: Date.now() - start,
        error: error.message,
      }
    }

    return {
      name: "supabase_connection",
      status: "healthy",
      latencyMs: Date.now() - start,
    }
  } catch (err) {
    return {
      name: "supabase_connection",
      status: "unhealthy",
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : "Unknown error",
    }
  }
}

async function checkCriticalTables(): Promise<HealthCheck> {
  const start = Date.now()
  const criticalTables = ["profiles", "intakes", "services", "audit_logs"]
  const errors: string[] = []

  try {
    const supabase = createServiceRoleClient()

    for (const table of criticalTables) {
      const { error } = await supabase.from(table).select("id", { count: "exact", head: true })
      if (error) {
        errors.push(`${table}: ${error.message}`)
      }
    }

    if (errors.length > 0) {
      return {
        name: "critical_tables",
        status: errors.length === criticalTables.length ? "unhealthy" : "degraded",
        latencyMs: Date.now() - start,
        error: errors.join("; "),
      }
    }

    return {
      name: "critical_tables",
      status: "healthy",
      latencyMs: Date.now() - start,
    }
  } catch (err) {
    return {
      name: "critical_tables",
      status: "unhealthy",
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : "Unknown error",
    }
  }
}

async function checkRPCFunctions(): Promise<HealthCheck> {
  const start = Date.now()
  try {
    const supabase = createServiceRoleClient()
    
    // Test that the RPC function exists (with a harmless call)
    const { error } = await supabase.rpc("release_stale_intake_claims", {
      p_timeout_minutes: 0, // 0 minutes means nothing will be released
    })

    if (error && !error.message.includes("0 rows")) {
      return {
        name: "rpc_functions",
        status: "degraded",
        latencyMs: Date.now() - start,
        error: error.message,
      }
    }

    return {
      name: "rpc_functions",
      status: "healthy",
      latencyMs: Date.now() - start,
    }
  } catch (err) {
    return {
      name: "rpc_functions",
      status: "degraded",
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : "Unknown error",
    }
  }
}
