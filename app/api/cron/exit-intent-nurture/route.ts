import * as Sentry from "@sentry/nextjs"
import { NextRequest, NextResponse } from "next/server"
import { processExitIntentNurture } from "@/lib/email/exit-intent-nurture"
import { createLogger } from "@/lib/observability/logger"
import { verifyCronRequest, acquireCronLock, releaseCronLock } from "@/lib/api/cron-auth"
import { captureCronError } from "@/lib/observability/sentry"
import { toError } from "@/lib/errors"

const logger = createLogger("cron-exit-intent-nurture")

/**
 * Cron endpoint to send exit-intent nurture emails (emails 2 & 3)
 * Runs at :30 past every hour via Vercel Cron (configured in vercel.json)
 */
export async function GET(request: NextRequest) {
  const authError = verifyCronRequest(request)
  if (authError) return authError

  // Distributed lock — prevents double-firing if Vercel invokes cron twice
  const lock = await acquireCronLock("exit-intent-nurture")
  if (!lock.acquired) {
    return NextResponse.json({
      success: true,
      skipped: true,
      reason: lock.existingLockAge
        ? `Already running for ${lock.existingLockAge}s`
        : "Already running",
    })
  }

  try {
    const result = await processExitIntentNurture()

    logger.info("Cron: exit intent nurture processed", result)

    await releaseCronLock("exit-intent-nurture")

    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    Sentry.captureException(error)
    const err = toError(error)
    logger.error("Cron: exit intent nurture failed", { error: err.message })
    captureCronError(err, { jobName: "exit-intent-nurture" })
    await releaseCronLock("exit-intent-nurture")

    return NextResponse.json(
      { error: "Failed to process exit intent nurture" },
      { status: 500 }
    )
  }
}
