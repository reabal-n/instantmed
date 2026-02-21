import { NextRequest, NextResponse } from "next/server"
import { processEmailDispatch } from "@/lib/email/email-dispatcher"
import { createLogger } from "@/lib/observability/logger"
import { verifyCronRequest } from "@/lib/api/cron-auth"
import { captureCronError } from "@/lib/observability/sentry"

const logger = createLogger("cron-email-retries")

/**
 * DEPRECATED: This cron route now delegates to the email_outbox dispatcher.
 * The legacy email_retry_queue system has been replaced by email_outbox + dispatcher.
 * This route is kept for backward compatibility with existing Vercel cron config.
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
    const err = error instanceof Error ? error : new Error(String(error))
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
