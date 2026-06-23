import * as Sentry from "@sentry/nextjs"
import { NextRequest, NextResponse } from "next/server"

import { verifyCronRequest } from "@/lib/api/cron-auth"
import { processRefillReminders } from "@/lib/email/refill-reminder"
import { toError } from "@/lib/errors"
import { createLogger } from "@/lib/observability/logger"
import { captureCronError } from "@/lib/observability/sentry"

const logger = createLogger("cron-refill-reminders")

/**
 * Daily cron: one-off refill-reminder reactivation email ~week 10-11 after a
 * repeatable script was issued (before a script + 2 repeats supply runs out;
 * window in lib/clinical/repeats-policy.ts). Ships disabled; no-ops until
 * REFILL_REMINDER_EMAILS_ENABLED=true. Marketing-consent gated per patient.
 */
export async function GET(request: NextRequest) {
  const authError = verifyCronRequest(request)
  if (authError) return authError

  try {
    const result = await processRefillReminders()

    logger.info("Cron: refill reminders processed", result)

    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    Sentry.captureException(error)
    const err = toError(error)
    logger.error("Cron: refill reminders failed", { error: err.message })
    captureCronError(err, { jobName: "refill-reminders" })

    return NextResponse.json(
      { error: "Failed to process refill reminders" },
      { status: 500 },
    )
  }
}
