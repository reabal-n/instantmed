import { NextRequest, NextResponse } from "next/server"
import { verifyCronRequest } from "@/lib/api/cron-auth"
import { processEmailDispatch } from "@/lib/email/email-dispatcher"
import { createLogger } from "@/lib/observability/logger"
import { captureCronError } from "@/lib/observability/sentry"

const logger = createLogger("cron-email-dispatcher")

// Vercel cron job configuration
export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

/**
 * GET /api/cron/email-dispatcher
 * 
 * Processes pending/failed emails from email_outbox with retry logic.
 * Runs every 5 minutes via Vercel Cron (configured in vercel.json).
 * 
 * Required env: CRON_SECRET
 * Auth: Authorization: Bearer <CRON_SECRET>
 * 
 * Uses atomic claiming to prevent duplicate sends if multiple
 * cron instances run simultaneously.
 */
export async function GET(request: NextRequest) {
  // Verify cron authentication (standardized with other cron routes)
  const authError = verifyCronRequest(request)
  if (authError) return authError

  try {
    const result = await processEmailDispatch()
    
    logger.info("Email dispatcher cron completed", {
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
    logger.error("Email dispatcher cron failed", { error: err.message })
    captureCronError(err, { jobName: "email-dispatcher" })
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    )
  }
}

// Also support POST for flexibility
export async function POST(request: NextRequest) {
  return GET(request)
}
