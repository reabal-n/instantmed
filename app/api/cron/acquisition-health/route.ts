import * as Sentry from "@sentry/nextjs"
import { NextRequest, NextResponse } from "next/server"

import { getAcquisitionHealth } from "@/lib/analytics/acquisition-health"
import { verifyCronRequest } from "@/lib/api/cron-auth"
import { createLogger } from "@/lib/observability/logger"
import { captureCronError } from "@/lib/observability/sentry"

const logger = createLogger("cron-acquisition-health")

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 30

export async function GET(request: NextRequest) {
  const authError = verifyCronRequest(request)
  if (authError) return authError

  try {
    const result = await getAcquisitionHealth(7)
    const logContext: Record<string, unknown> = { ...result }

    if (!result.healthy) {
      logger.warn("Acquisition tracking health check failed", logContext)
      Sentry.captureMessage("Acquisition tracking health check failed", {
        level: "warning",
        tags: {
          source: "acquisition-health-cron",
        },
        extra: logContext,
      })
    } else {
      logger.info("Acquisition tracking health check passed", logContext)
    }

    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    logger.error("Acquisition health cron failed", { error: err.message })
    captureCronError(err, { jobName: "acquisition-health" })

    return NextResponse.json(
      { error: "Failed to check acquisition health" },
      { status: 500 },
    )
  }
}
