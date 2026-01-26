import { NextRequest, NextResponse } from "next/server"
import { processAbandonedCheckouts } from "@/lib/email/abandoned-checkout"
import { createLogger } from "@/lib/observability/logger"
import { verifyCronRequest } from "@/lib/api/cron-auth"
import { captureCronError } from "@/lib/observability/sentry"

const logger = createLogger("cron-abandoned-checkouts")

/**
 * Cron endpoint to process abandoned checkouts and send recovery emails
 * Runs every hour via Vercel Cron (configured in vercel.json)
 */
export async function GET(request: NextRequest) {
  // Verify cron authentication
  const authError = verifyCronRequest(request)
  if (authError) return authError
  
  try {
    const result = await processAbandonedCheckouts()
    
    logger.info("Cron: abandoned checkouts processed", result)
    
    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    logger.error("Cron: abandoned checkouts failed", { error: err.message })
    captureCronError(err, { jobName: "abandoned-checkouts" })
    
    return NextResponse.json(
      { error: "Failed to process abandoned checkouts" },
      { status: 500 }
    )
  }
}
