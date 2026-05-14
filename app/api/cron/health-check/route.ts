/**
 * Cron heartbeat watchdog.
 *
 * Queue delay, delivery failures, and business alerts each have dedicated
 * crons. This endpoint stays intentionally narrow so the ops surface has one
 * owner for cron liveness instead of several overlapping health checks.
 */

import * as Sentry from "@sentry/nextjs"
import { NextRequest, NextResponse } from "next/server"

import { verifyCronRequest } from "@/lib/api/cron-auth"
import { checkCronHeartbeats, recordCronHeartbeat } from "@/lib/monitoring/cron-heartbeat"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 10

export async function GET(request: NextRequest) {
  const authError = verifyCronRequest(request)
  if (authError) return authError
  
  await recordCronHeartbeat("health-check")

  try {
    const cronHealth = await checkCronHeartbeats()

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      healthy: cronHealth.healthy,
      status: cronHealth.healthy ? "ok" : "degraded",
      checks: {
        crons: {
          healthy: cronHealth.healthy,
          overdueCount: cronHealth.overdue.length,
          overdue: cronHealth.overdue.map((o) => `${o.jobName} (+${o.minutesOverdue}min)`),
        },
      },
    })
    
  } catch (error) {
    Sentry.captureException(error, {
      tags: { context: "health_check_cron" },
    })
    
    return NextResponse.json(
      { 
        error: "Health check failed",
        timestamp: new Date().toISOString(),
        status: "error",
      },
      { status: 500 }
    )
  }
}
