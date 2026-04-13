import * as Sentry from "@sentry/nextjs"
import { NextRequest, NextResponse } from "next/server"

import { verifyCronRequest } from "@/lib/api/cron-auth"
import { processSubscriptionNudges } from "@/lib/email/subscription-nudge"
import { toError } from "@/lib/errors"
import { createLogger } from "@/lib/observability/logger"
import { captureCronError } from "@/lib/observability/sentry"

const logger = createLogger("cron-subscription-nudge")

/**
 * Cron endpoint to send day-30 subscription nudges to repeat Rx patients
 * Runs daily via Vercel Cron (configured in vercel.json)
 */
export async function GET(request: NextRequest) {
  const authError = verifyCronRequest(request)
  if (authError) return authError

  try {
    const result = await processSubscriptionNudges()

    logger.info("Cron: subscription nudges processed", result)

    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    Sentry.captureException(error)
    const err = toError(error)
    logger.error("Cron: subscription nudges failed", { error: err.message })
    captureCronError(err, { jobName: "subscription-nudge" })

    return NextResponse.json(
      { error: "Failed to process subscription nudges" },
      { status: 500 }
    )
  }
}
