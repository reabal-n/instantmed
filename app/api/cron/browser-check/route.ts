import * as Sentry from "@sentry/nextjs"
import { NextRequest, NextResponse } from "next/server"

import { acquireCronLock, verifyCronRequest } from "@/lib/api/cron-auth"
import { dispatchBrowserCheck } from "@/lib/monitoring/browser-dispatch"
import { recordCronHeartbeat } from "@/lib/monitoring/cron-heartbeat"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 20

export async function GET(request: NextRequest) {
  const authError = verifyCronRequest(request)
  if (authError) return authError
  if (process.env.VERCEL_ENV !== "production" || request.headers.get("user-agent") !== "vercel-cron/1.0") {
    return NextResponse.json({ status: "production_cron_required" }, { status: 403 })
  }
  // Retain the existing lock for 110 minutes: overlapping/retried cron calls
  // must not dispatch again after an ambiguous GitHub response or DB write.
  const lock = await acquireCronLock("browser-check", 110 * 60)
  if (!lock.acquired && lock.reason === "held") return NextResponse.json({ status: "already_attempted" })
  const startedAt = Date.now()
  try {
    if (!lock.acquired) throw new Error("browser_dispatch_lock_unavailable")
    await dispatchBrowserCheck()
    await recordCronHeartbeat("browser-check", { status: "ok", durationMs: Date.now() - startedAt })
    return NextResponse.json({ status: "dispatched" })
  } catch {
    await recordCronHeartbeat("browser-check", { status: "error", durationMs: Date.now() - startedAt })
    Sentry.captureMessage("Production browser dispatch failed", { level: "error", fingerprint: ["browser-dispatch-failed"] })
    await Sentry.flush(2000)
    return NextResponse.json({ status: "dispatch_failed" }, { status: 503 })
  }
}
