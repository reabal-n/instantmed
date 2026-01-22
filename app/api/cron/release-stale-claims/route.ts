import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createLogger } from "@/lib/observability/logger"

const logger = createLogger("cron:release-stale-claims")

// Vercel cron job configuration
export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

// Cron job to release stale intake claims
// Runs every 5 minutes to prevent queue stalls
// Configure in vercel.json crons array
export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    logger.warn("Unauthorized cron attempt")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createServiceRoleClient()
  const startTime = Date.now()

  try {
    // Call the database function to release stale claims
    const { data, error } = await supabase.rpc("release_stale_intake_claims", {
      stale_threshold_minutes: 30,
    })

    if (error) {
      logger.error("Failed to release stale claims", { error: error.message })
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    const releasedCount = data?.length || 0
    const duration = Date.now() - startTime

    // Log results
    if (releasedCount > 0) {
      logger.info("Released stale claims", {
        count: releasedCount,
        claims: data,
        durationMs: duration,
      })
    }

    // Track cron run
    await supabase.from("cron_job_runs").upsert(
      {
        job_name: "release_stale_claims",
        last_run_at: new Date().toISOString(),
        last_result: { released: releasedCount, durationMs: duration },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "job_name" }
    )

    return NextResponse.json({
      success: true,
      released: releasedCount,
      durationMs: duration,
    })
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error"
    logger.error("Cron job failed", { error: errorMessage })
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}
