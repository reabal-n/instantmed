import { NextRequest, NextResponse } from "next/server"
import { processEmailDispatch } from "@/lib/email/email-dispatcher"
import { createLogger } from "@/lib/observability/logger"
import { verifyCronRequest } from "@/lib/api/cron-auth"
import { captureCronError } from "@/lib/observability/sentry"
import { toError } from "@/lib/errors"

const logger = createLogger("cron-email-retries")

/**
 * DEPRECATED + UNREGISTERED: Removed from vercel.json (2026-03-26).
 * The legacy email_retry_queue system has been replaced by email_outbox + dispatcher.
 * Canonical cron: /api/cron/email-dispatcher (every 5 min)
 * Safe to delete this file if no external service is calling it directly.
 */
export async function GET(request: NextRequest) {
  // Use centralized cron auth
  const authError = verifyCronRequest(request)
  if (authError) return authError

  try {
    // Delegate to the unified email dispatcher (email_outbox system)
    const result = await processEmailDispatch()

    logger.info("Email retry cron completed (delegated to dispatcher)", {
      processed: result.processed,
      sent: result.sent,
      failed: result.failed,
      skipped: result.skipped,
    })

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    const err = toError(error)
    logger.error("Email retry cron failed", { error: err.message })
    captureCronError(err, { jobName: "process-email-retries" })
    return NextResponse.json(
      { error: "Failed to process email retries" },
      { status: 500 }
    )
  }
}

// Also support POST for Vercel Cron
export async function POST(request: NextRequest) {
  return GET(request)
}
