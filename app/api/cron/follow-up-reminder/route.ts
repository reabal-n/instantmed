import * as Sentry from "@sentry/nextjs"
import { NextRequest, NextResponse } from "next/server"

import { acquireCronLock, releaseCronLock,verifyCronRequest } from "@/lib/api/cron-auth"
import { processFollowUpReminders } from "@/lib/email/follow-up-reminder"
import { toError } from "@/lib/errors"
import { createLogger } from "@/lib/observability/logger"
import { captureCronError } from "@/lib/observability/sentry"

export const dynamic = "force-dynamic"

const logger = createLogger("cron-follow-up-reminder")

/**
 * Cron endpoint to send day-3 follow-up emails to med cert patients
 * Runs daily at 1am UTC (~11am AEST) via Vercel Cron (configured in vercel.json)
 */
export async function GET(request: NextRequest) {
  // Verify cron authentication
  const authError = verifyCronRequest(request)
  if (authError) return authError

  // Acquire concurrency lock - prevents overlapping execution in serverless
  const lock = await acquireCronLock("follow-up-reminder")
  if (!lock.acquired) {
    return NextResponse.json({
      success: true,
      skipped: true,
      reason: lock.existingLockAge
        ? `Already running for ${lock.existingLockAge}s`
        : "Already running"
    })
  }

  try {
    const result = await processFollowUpReminders()

    logger.info("Cron: follow-up reminders processed", result)

    await releaseCronLock("follow-up-reminder")

    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    Sentry.captureException(error)
    const err = toError(error)
    logger.error("Cron: follow-up reminders failed", { error: err.message })
    captureCronError(err, { jobName: "follow-up-reminder" })
    await releaseCronLock("follow-up-reminder")

    return NextResponse.json(
      { error: "Failed to process follow-up reminders" },
      { status: 500 }
    )
  }
}
