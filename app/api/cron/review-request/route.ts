import * as Sentry from "@sentry/nextjs"
import { NextRequest, NextResponse } from "next/server"

import { verifyCronRequest } from "@/lib/api/cron-auth"
import { processReviewRequests } from "@/lib/email/review-request"
import { isSydneyReviewRequestHour } from "@/lib/email/review-request-timing"
import { toError } from "@/lib/errors"
import { createLogger } from "@/lib/observability/logger"
import { captureCronError } from "@/lib/observability/sentry"

const logger = createLogger("cron-review-request")

/**
 * Cron endpoint for the single review request. Vercel invokes at the two UTC
 * hours that can map to 10:00 Sydney; the timezone guard handles AEST/AEDT.
 */
export async function GET(request: NextRequest) {
  const authError = verifyCronRequest(request)
  if (authError) return authError

  const now = new Date()
  if (!isSydneyReviewRequestHour(now)) {
    return NextResponse.json({
      success: true,
      skipped: true,
      reason: "Outside the 10:00 Australia/Sydney send hour",
      timestamp: now.toISOString(),
    })
  }

  try {
    const result = await processReviewRequests()

    logger.info("Cron: review requests processed", result)

    return NextResponse.json({
      success: true,
      ...result,
      timestamp: now.toISOString(),
    })
  } catch (error) {
    Sentry.captureException(error)
    const err = toError(error)
    logger.error("Cron: review requests failed", { error: err.message })
    captureCronError(err, { jobName: "review-request" })

    return NextResponse.json(
      { error: "Failed to process review requests" },
      { status: 500 }
    )
  }
}
