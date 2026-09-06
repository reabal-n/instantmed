/**
 * Independent cron and production browser-evidence watchdog.
 * Business/queue/delivery checks retain their dedicated owners.
 */

import * as Sentry from "@sentry/nextjs"
import { NextRequest, NextResponse } from "next/server"

import { verifyCronRequest } from "@/lib/api/cron-auth"
import { checkBrowserObserver } from "@/lib/monitoring/browser-observer"
import { checkCronHeartbeats, recordCronHeartbeat } from "@/lib/monitoring/cron-heartbeat"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 20

export async function GET(request: NextRequest) {
  const authError = verifyCronRequest(request)
  if (authError) return authError
  
  const startedAt = Date.now()
  const results = await Promise.allSettled([checkCronHeartbeats(), checkBrowserObserver()])
  const crons = results[0].status === "fulfilled" ? results[0].value : { healthy: false, overdue: [] }
  const browser = results[1].status === "fulfilled" ? results[1].value : { healthy: false, observerOk: false }
  const healthy = crons.healthy && browser.healthy
  if (results.some(result => result.status === "rejected")) {
    Sentry.captureMessage("Health observer failed before classification", {
      level: "error", fingerprint: ["health-observer-unavailable"],
    })
  }
  await recordCronHeartbeat("health-check", {
    durationMs: Date.now() - startedAt, status: healthy ? "ok" : "partial_failure",
  })
  await Sentry.flush(2000)
  return NextResponse.json({
    timestamp: new Date().toISOString(), healthy, status: healthy ? "ok" : "degraded",
    checks: { crons, browser },
  })
}
