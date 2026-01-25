import { NextRequest, NextResponse } from "next/server"
import { processEmailRetries, getRetryQueueStats } from "@/lib/email/retry-queue"
import { createLogger } from "@/lib/observability/logger"
import { verifyCronRequest } from "@/lib/api/cron-auth"

const logger = createLogger("cron-email-retries")

export async function GET(request: NextRequest) {
  // Use centralized cron auth
  const authError = verifyCronRequest(request)
  if (authError) return authError

  try {
    const result = await processEmailRetries()
    
    logger.info("Email retry cron completed", {
      processed: result.processed,
      succeeded: result.succeeded,
      failed: result.failed,
      exhausted: result.exhausted,
    })

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    logger.error("Email retry cron failed", {}, error instanceof Error ? error : new Error(String(error)))
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

// Stats endpoint for monitoring
export async function HEAD(request: NextRequest) {
  const authError = verifyCronRequest(request)
  if (authError) return new NextResponse(null, { status: 401 })

  try {
    const stats = await getRetryQueueStats()
    return new NextResponse(null, {
      status: 200,
      headers: {
        "X-Pending-Emails": stats.pending.toString(),
        "X-Exhausted-Emails": stats.exhausted.toString(),
      },
    })
  } catch {
    return new NextResponse(null, { status: 500 })
  }
}
