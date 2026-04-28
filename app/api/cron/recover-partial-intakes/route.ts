import * as Sentry from "@sentry/nextjs"
import { NextRequest, NextResponse } from "next/server"

import { verifyCronRequest } from "@/lib/api/cron-auth"
import { processPartialIntakeRecoveries } from "@/lib/email/partial-intake-recovery"
import { toError } from "@/lib/errors"
import { createLogger } from "@/lib/observability/logger"
import { captureCronError } from "@/lib/observability/sentry"

const logger = createLogger("cron-recover-partial-intakes")

export const maxDuration = 60

/**
 * Recover partial intakes by emailing users who started an intake form
 * (and provided email) but didn't complete. Runs hourly via Vercel Cron.
 *
 * Scoped narrowly: only drafts that are 60-360 minutes idle, only one
 * email per draft, marketing-email auto unsubscribe headers attached.
 */
export async function GET(request: NextRequest) {
  const authError = verifyCronRequest(request)
  if (authError) return authError

  try {
    const result = await processPartialIntakeRecoveries()

    logger.info("Cron: partial intake recoveries processed", result)

    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    Sentry.captureException(error)
    const err = toError(error)
    logger.error("Cron: partial intake recoveries failed", { error: err.message })
    captureCronError(err, { jobName: "recover-partial-intakes" })

    return NextResponse.json(
      { error: "Failed to process partial intake recoveries" },
      { status: 500 },
    )
  }
}
