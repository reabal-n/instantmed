import { NextRequest, NextResponse } from "next/server"
import { 
  processEmailDispatch, 
  getEmailDispatcherStats,
  MAX_BATCH_SIZE,
  MAX_RETRIES,
} from "@/lib/email/email-dispatcher"
import { logger } from "@/lib/observability/logger"

/**
 * Email Dispatcher Route (OPS)
 * 
 * Alternative endpoint for external cron services.
 * Protected by OPS_CRON_SECRET header.
 * 
 * Prefer using /api/cron/email-dispatcher for Vercel cron.
 */

export async function POST(request: NextRequest) {
  // Authenticate via shared secret
  const cronSecret = process.env.OPS_CRON_SECRET
  const providedSecret = request.headers.get("x-ops-cron-secret")
  
  if (!cronSecret || providedSecret !== cronSecret) {
    logger.warn("[Email Dispatcher OPS] Unauthorized request")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const result = await processEmailDispatch()
    return NextResponse.json(result)
  } catch (err) {
    const error = err instanceof Error ? err.message : "Unknown error"
    logger.error("[Email Dispatcher OPS] Failed", { error })
    return NextResponse.json({ error }, { status: 500 })
  }
}

// GET for health check / manual trigger info
export async function GET(request: NextRequest) {
  const cronSecret = process.env.OPS_CRON_SECRET
  const providedSecret = request.headers.get("x-ops-cron-secret")
  
  if (!cronSecret || providedSecret !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const stats = await getEmailDispatcherStats()

  return NextResponse.json({
    queue: stats,
    config: {
      maxBatchSize: MAX_BATCH_SIZE,
      maxRetries: MAX_RETRIES,
    },
  })
}
