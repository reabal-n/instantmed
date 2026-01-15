import { NextResponse } from "next/server"
import { processAbandonedCheckouts } from "@/lib/email/abandoned-checkout"
import { createLogger } from "@/lib/observability/logger"

const logger = createLogger("cron-abandoned-checkouts")

/**
 * Cron endpoint to process abandoned checkouts and send recovery emails
 * Configure in Vercel: run every hour
 * 
 * Vercel Cron config (add to vercel.json):
 * {
 *   "crons": [{
 *     "path": "/api/cron/abandoned-checkouts",
 *     "schedule": "0 * * * *"
 *   }]
 * }
 */
export async function GET(request: Request) {
  // Verify cron secret in production
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    logger.warn("Unauthorized cron request")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  
  try {
    const result = await processAbandonedCheckouts()
    
    logger.info("Cron: abandoned checkouts processed", result)
    
    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error("Cron: abandoned checkouts failed", { 
      error: error instanceof Error ? error.message : "Unknown error" 
    })
    
    return NextResponse.json(
      { error: "Failed to process abandoned checkouts" },
      { status: 500 }
    )
  }
}
