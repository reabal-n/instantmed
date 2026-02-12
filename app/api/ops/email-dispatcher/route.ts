import { NextRequest, NextResponse } from "next/server"
import {
  processEmailDispatch,
  getEmailDispatcherStats,
  MAX_BATCH_SIZE,
  MAX_RETRIES,
} from "@/lib/email/email-dispatcher"
import { logger } from "@/lib/observability/logger"
import { timingSafeEqual } from "crypto"

function verifyOpsSecret(providedSecret: string | null, cronSecret: string | null): boolean {
  if (!cronSecret || !providedSecret) return false
  const expected = Buffer.from(cronSecret)
  const provided = Buffer.from(providedSecret)
  return expected.length === provided.length && timingSafeEqual(expected, provided)
}

/**
 * Email Dispatcher Route (OPS) - Manual trigger endpoint
 * 
 * NOTE: The canonical automated dispatcher is /api/cron/email-dispatcher
 * (runs every 5 minutes via Vercel Cron). This route exists for manual
 * ops use and E2E tests only.
 * 
 * Alternative endpoint for external cron services.
 * Protected by OPS_CRON_SECRET header.
 * 
 * Prefer using /api/cron/email-dispatcher for Vercel cron.
 */

export async function POST(request: NextRequest) {
  // Authenticate via shared secret with timing-safe comparison
  const cronSecret = process.env.OPS_CRON_SECRET
  const providedSecret = request.headers.get("x-ops-cron-secret")

  if (!verifyOpsSecret(providedSecret, cronSecret ?? null)) {
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

  if (!verifyOpsSecret(providedSecret, cronSecret ?? null)) {
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
