import * as Sentry from "@sentry/nextjs"
import { NextRequest, NextResponse } from "next/server"

import { verifyCronRequest } from "@/lib/api/cron-auth"
import { processRefillReminders, sendTestRefillReminder } from "@/lib/email/refill-reminder"
import { toError } from "@/lib/errors"
import { recordCronHeartbeat } from "@/lib/monitoring/cron-heartbeat"
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

  const startedAt = Date.now()

  // Pre-flight: `?testEmail=you@example.com` sends ONE sample reminder to that
  // address (deliverability check before the first real wave). Bypasses the
  // window/consent/DB; still CRON_SECRET-gated above.
  const testEmail = request.nextUrl.searchParams.get("testEmail")
  if (testEmail) {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(testEmail)) {
      return NextResponse.json({ error: "Invalid testEmail" }, { status: 400 })
    }
    const sent = await sendTestRefillReminder(testEmail)
    return NextResponse.json({ test: true, sent, to: testEmail, timestamp: new Date().toISOString() })
  }

  try {
    const result = await processRefillReminders()

    logger.info("Cron: refill reminders processed", result)
    await recordCronHeartbeat("refill-reminders", {
      durationMs: Date.now() - startedAt,
      itemsProcessed: result.candidates,
      status: !result.enabled
        ? "disabled"
        : result.failed > 0
          ? "partial_failure"
          : "ok",
    })

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
    await recordCronHeartbeat("refill-reminders", {
      durationMs: Date.now() - startedAt,
      itemsProcessed: 0,
      status: "error",
    })

    return NextResponse.json(
      { error: "Failed to process refill reminders" },
      { status: 500 },
    )
  }
}
