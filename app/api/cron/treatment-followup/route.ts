import * as Sentry from "@sentry/nextjs"
import { NextRequest, NextResponse } from "next/server"

import { acquireCronLock, releaseCronLock,verifyCronRequest } from "@/lib/api/cron-auth"
import { processTreatmentFollowups } from "@/lib/email/treatment-followup"
import { toError } from "@/lib/errors"
import { createLogger } from "@/lib/observability/logger"
import { captureCronError } from "@/lib/observability/sentry"

export const dynamic = "force-dynamic"

const logger = createLogger("cron-treatment-followup")

/**
 * Daily cron -- sends ED/hair-loss follow-up reminders for due check-ins.
 * Schedule: 09:00 AEST = 23:00 UTC previous day (no DST in NSW).
 */
export async function GET(request: NextRequest) {
  const authError = verifyCronRequest(request)
  if (authError) return authError

  const lock = await acquireCronLock("treatment-followup")
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
    const result = await processTreatmentFollowups()
    logger.info("Cron: treatment-followup processed", { ...result })
    await releaseCronLock("treatment-followup")
    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    Sentry.captureException(error)
    const err = toError(error)
    logger.error("Cron: treatment-followup failed", { error: err.message })
    captureCronError(err, { jobName: "treatment-followup" })
    await releaseCronLock("treatment-followup")
    return NextResponse.json(
      { error: "Failed to process treatment followups" },
      { status: 500 },
    )
  }
}
