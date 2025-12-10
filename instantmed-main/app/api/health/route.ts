import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const runtime = "edge"
export const dynamic = "force-dynamic"

interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy"
  timestamp: string
  version: string
  checks: {
    database: "ok" | "error"
    auth: "ok" | "error"
  }
  responseTime?: number
}

export async function GET() {
  const startTime = Date.now()
  
  const healthStatus: HealthStatus = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "1.0.0",
    checks: {
      database: "ok",
      auth: "ok",
    },
  }

  try {
    // Check Supabase connection
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      healthStatus.checks.database = "error"
      healthStatus.checks.auth = "error"
      healthStatus.status = "unhealthy"
    } else {
      const supabase = createClient(supabaseUrl, supabaseKey)
      
      // Quick database check - just verify connection
      const { error: dbError } = await supabase
        .from("profiles")
        .select("id")
        .limit(1)
        .maybeSingle()

      if (dbError && dbError.code !== "PGRST116") {
        healthStatus.checks.database = "error"
        healthStatus.status = "degraded"
      }
    }
  } catch {
    healthStatus.checks.database = "error"
    healthStatus.status = "degraded"
  }

  healthStatus.responseTime = Date.now() - startTime

  const statusCode = healthStatus.status === "healthy" ? 200 : healthStatus.status === "degraded" ? 200 : 503

  return NextResponse.json(healthStatus, { status: statusCode })
}
