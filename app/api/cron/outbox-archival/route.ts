import * as Sentry from "@sentry/nextjs"
import { NextRequest, NextResponse } from "next/server"
import { verifyCronRequest } from "@/lib/api/cron-auth"
import { archiveOldOutboxRows } from "@/lib/email/outbox-archival"
import { recordCronHeartbeat } from "@/lib/monitoring/cron-heartbeat"
import { createLogger } from "@/lib/observability/logger"
import { captureCronError } from "@/lib/observability/sentry"
import { toError } from "@/lib/errors"

const logger = createLogger("cron-outbox-archival")

// Vercel cron job configuration
export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

/**
 * GET /api/cron/outbox-archival
 *
 * Deletes old delivered emails (90 days) and exhausted-failed emails (180 days)
 * from email_outbox to prevent unbounded table growth.
 * Runs daily via Vercel Cron (configured in vercel.json).
 *
 * Required env: CRON_SECRET
 * Auth: Authorization: Bearer <CRON_SECRET>
 */
export async function GET(request: NextRequest) {
  // Verify cron authentication (standardized with other cron routes)
  const authError = verifyCronRequest(request)
  if (authError) return authError

  await recordCronHeartbeat("outbox-archival")

  try {
    const result = await archiveOldOutboxRows()

    logger.info("Outbox archival cron completed", {
      deliveredDeleted: result.deliveredDeleted,
      failedDeleted: result.failedDeleted,
    })

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    Sentry.captureException(error)
    const err = toError(error)
    logger.error("Outbox archival cron failed", { error: err.message })
    captureCronError(err, { jobName: "outbox-archival" })
    return NextResponse.json(
      { success: false, error: "Outbox archival failed" },
      { status: 500 }
    )
  }
}

// Also support POST for flexibility
export async function POST(request: NextRequest) {
  return GET(request)
}
