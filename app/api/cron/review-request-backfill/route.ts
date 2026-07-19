import * as Sentry from "@sentry/nextjs"
import { NextRequest, NextResponse } from "next/server"

import { verifyCronRequest } from "@/lib/api/cron-auth"
import { processReviewRequestBackfill } from "@/lib/email/review-request"
import { REVIEW_REQUEST_CATCH_UP_DAYS } from "@/lib/email/review-request-timing"
import { toError } from "@/lib/errors"
import { createLogger } from "@/lib/observability/logger"
import { captureCronError } from "@/lib/observability/sentry"

const logger = createLogger("cron-review-request-backfill")

/**
 * One-time / catch-up review-email backfill. Manual trigger (CRON_SECRET-gated),
 * NOT on a Vercel schedule. Sends the day-2 review email to satisfied patients
 * (approved/completed) who never received one — reusing the audited, marketing-
 * consent-gated, review_email_sent_at-deduped send path.
 *
 * SAFE BY DEFAULT: dryRun unless `?dryRun=false`. Optional `?limit=N` stages a
 * partial first send; `?sinceDays=N` sets the recency floor (default 120).
 *
 *   GET /api/cron/review-request-backfill                 -> dry-run count
 *   GET /api/cron/review-request-backfill?dryRun=false    -> send
 *   GET /api/cron/review-request-backfill?dryRun=false&limit=10
 */
export async function GET(request: NextRequest) {
  const authError = verifyCronRequest(request)
  if (authError) return authError

  const sp = request.nextUrl.searchParams
  const dryRun = sp.get("dryRun") !== "false" // default true
  const limit = sp.get("limit") ? Number(sp.get("limit")) : undefined
  const sinceDays = sp.get("sinceDays") ? Number(sp.get("sinceDays")) : undefined

  if (limit !== undefined && (!Number.isFinite(limit) || limit < 0)) {
    return NextResponse.json({ error: "invalid limit" }, { status: 400 })
  }
  if (
    sinceDays !== undefined &&
    (
      !Number.isFinite(sinceDays) ||
      sinceDays < 0 ||
      sinceDays > REVIEW_REQUEST_CATCH_UP_DAYS
    )
  ) {
    return NextResponse.json({ error: "invalid sinceDays" }, { status: 400 })
  }

  try {
    const result = await processReviewRequestBackfill({ dryRun, limit, sinceDays })
    logger.info("Cron: review backfill processed", result)
    return NextResponse.json({ success: true, ...result, timestamp: new Date().toISOString() })
  } catch (error) {
    Sentry.captureException(error)
    const err = toError(error)
    logger.error("Cron: review backfill failed", { error: err.message })
    captureCronError(err, { jobName: "review-request-backfill" })
    return NextResponse.json({ error: "Failed to process review backfill" }, { status: 500 })
  }
}
