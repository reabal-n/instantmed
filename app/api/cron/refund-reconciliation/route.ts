import { NextRequest, NextResponse } from "next/server"

import {
  acquireCronLock,
  releaseCronLock,
  verifyCronRequest,
} from "@/lib/api/cron-auth"
import { toError } from "@/lib/errors"
import { recordCronHeartbeat } from "@/lib/monitoring/cron-heartbeat"
import { createLogger } from "@/lib/observability/logger"
import { captureCronError } from "@/lib/observability/sentry"
import { stripe } from "@/lib/stripe/client"
import { runStripeRefundRecovery } from "@/lib/stripe/refund-recovery-runner"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const JOB_NAME = "refund-reconciliation"
const BATCH_LIMIT = 25
const logger = createLogger("cron:refund-reconciliation")

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
// One claimed item may require bounded Stripe list/retrieve/create reads plus
// database reconciliation. The durable lease/idempotency contract makes a
// long Fluid Compute window safe while avoiding hard-killed half-batches.
export const maxDuration = 300

export async function GET(request: NextRequest) {
  const authError = verifyCronRequest(request)
  if (authError) return authError

  const startedAt = Date.now()
  const lock = await acquireCronLock(JOB_NAME)
  if (!lock.acquired) {
    const lockUnavailable = lock.reason === "unavailable"
    await recordCronHeartbeat("refund-reconciliation", {
      durationMs: Date.now() - startedAt,
      status: lockUnavailable ? "configuration_error" : "skipped",
    })
    return NextResponse.json(
      {
        success: !lockUnavailable,
        skipped: !lockUnavailable,
        reason: lock.existingLockAge
          ? `Already running for ${lock.existingLockAge}s`
          : lockUnavailable
            ? "Cron lock unavailable"
            : "Already running",
      },
      { status: lockUnavailable ? 503 : 200 },
    )
  }

  try {
    const supabase = createServiceRoleClient()
    const summary = await runStripeRefundRecovery(
      { stripe, supabase },
      { limit: BATCH_LIMIT },
    )
    const unhealthy = summary.failed > 0 || summary.manualReview > 0
    const status = unhealthy
      ? summary.processed > 0
        ? "partial_failure"
        : "error"
      : "ok"

    logger.info("Stripe refund recovery complete", {
      claimed: summary.claimed,
      failed: summary.failed,
      manualReview: summary.manualReview,
      processed: summary.processed,
    })
    await recordCronHeartbeat("refund-reconciliation", {
      durationMs: Date.now() - startedAt,
      itemsProcessed: summary.processed,
      status,
    })

    return NextResponse.json(
      {
        success: !unhealthy,
        claimed: summary.claimed,
        processed: summary.processed,
        failed: summary.failed,
        manual_review: summary.manualReview,
      },
      { status: unhealthy ? 500 : 200 },
    )
  } catch (err) {
    const error = toError(err)
    captureCronError(error, { jobName: JOB_NAME })
    logger.error("Stripe refund recovery cron failed", {}, error)
    await recordCronHeartbeat("refund-reconciliation", {
      durationMs: Date.now() - startedAt,
      status: "error",
    })
    return NextResponse.json(
      { success: false, error: "Stripe refund recovery failed" },
      { status: 500 },
    )
  } finally {
    await releaseCronLock(JOB_NAME)
  }
}
