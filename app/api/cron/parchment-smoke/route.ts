import * as Sentry from "@sentry/nextjs"
import { NextRequest, NextResponse } from "next/server"

import { verifyCronRequest } from "@/lib/api/cron-auth"
import { recordCronHeartbeat } from "@/lib/monitoring/cron-heartbeat"
import { createLogger } from "@/lib/observability/logger"
import { runParchmentSmokeValidation } from "@/lib/parchment/smoke-runner"

const logger = createLogger("cron-parchment-smoke")

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 20

export async function GET(request: NextRequest) {
  const authError = verifyCronRequest(request)
  if (authError) return authError

  const startedAt = Date.now()

  try {
    const result = await runParchmentSmokeValidation({ includeSso: false })
    const durationMs = Date.now() - startedAt
    await recordCronHeartbeat("parchment-smoke", {
      durationMs,
      itemsProcessed: 1,
      status: "ok",
    })

    logger.info("Parchment production smoke passed", {
      apiHost: result.apiHost,
      durationMs,
      requestId: result.requestId,
    })

    return NextResponse.json({
      checkedAt: result.checkedAt,
      environment: result.environment,
      ok: true,
      requestId: result.requestId,
    })
  } catch (error) {
    const durationMs = Date.now() - startedAt
    await recordCronHeartbeat("parchment-smoke", {
      durationMs,
      itemsProcessed: 0,
      status: "error",
    })

    const message = error instanceof Error ? error.message : "Unknown Parchment smoke failure"
    logger.error("Parchment production smoke failed", { durationMs, message })
    Sentry.captureMessage("Parchment production smoke failed", {
      level: "error",
      tags: {
        alert_type: "parchment_production_smoke",
        source: "cron-parchment-smoke",
      },
      extra: {
        durationMs,
        message,
      },
    })
    Sentry.captureException(error, {
      tags: {
        alert_type: "parchment_production_smoke",
        source: "cron-parchment-smoke",
      },
    })

    return NextResponse.json(
      {
        error: "Parchment production smoke failed",
        ok: false,
      },
      { status: 500 },
    )
  }
}
