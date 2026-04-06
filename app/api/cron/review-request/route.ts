import * as Sentry from "@sentry/nextjs"
import { NextRequest, NextResponse } from "next/server"
import { processReviewRequests } from "@/lib/email/review-request"
import { createLogger } from "@/lib/observability/logger"
import { verifyCronRequest } from "@/lib/api/cron-auth"
import { captureCronError } from "@/lib/observability/sentry"
import { toError } from "@/lib/errors"

const logger = createLogger("cron-review-request")

/**
 * Cron endpoint to send review request emails (day 2) and followups (day 7)
 * Runs daily via Vercel Cron (configured in vercel.json)
 */
export async function GET(request: NextRequest) {
  const authError = verifyCronRequest(request)
  if (authError) return authError

  try {
    const result = await processReviewRequests()

    logger.info("Cron: review requests processed", result)

    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
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
