import * as Sentry from "@sentry/nextjs"
import { NextRequest, NextResponse } from "next/server"

import { verifyCronRequest, withCronTimeout } from "@/lib/api/cron-auth"
import { recordCronHeartbeat } from "@/lib/monitoring/cron-heartbeat"
import { sendPaidRequestTelegramNotification } from "@/lib/notifications/paid-request-telegram"
import { createLogger } from "@/lib/observability/logger"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const logger = createLogger("cron-telegram-notifications")

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

const MAX_ATTEMPTS = 6
const BATCH_SIZE = 20

type PendingPaidTelegramIntake = {
  id: string
  patient_id: string | null
  amount_cents: number | null
  category: string | null
  subtype: string | null
  payment_status: string | null
  paid_request_telegram_attempts: number | null
}

async function processPendingPaidTelegramNotifications() {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from("intakes")
    .select("id, patient_id, amount_cents, category, subtype, payment_status, paid_request_telegram_attempts")
    .eq("payment_status", "paid")
    .not("paid_at", "is", null)
    .gt("amount_cents", 0)
    .is("paid_request_telegram_sent_at", null)
    .lt("paid_request_telegram_attempts", MAX_ATTEMPTS)
    .order("paid_at", { ascending: true, nullsFirst: false })
    .limit(BATCH_SIZE)

  if (error) {
    throw error
  }

  const pending = (data || []) as PendingPaidTelegramIntake[]
  let sent = 0
  let failed = 0
  let skipped = 0

  for (const intake of pending) {
    try {
      const result = await sendPaidRequestTelegramNotification({
        supabase,
        intakeId: intake.id,
        patientId: intake.patient_id,
        paymentStatus: intake.payment_status,
        amountCents: intake.amount_cents,
        category: intake.category,
        subtype: intake.subtype,
      })

      if (result.sent) {
        sent++
      } else {
        skipped++
      }
    } catch (err) {
      failed++
      logger.error("Paid request Telegram retry failed", {
        intakeId: intake.id,
        attempts: intake.paid_request_telegram_attempts,
        error: err instanceof Error ? err.message : String(err),
      })
      Sentry.captureException(err, {
        tags: { source: "telegram-notification-cron" },
        extra: { intakeId: intake.id, attempts: intake.paid_request_telegram_attempts },
      })
    }
  }

  return {
    processed: pending.length,
    sent,
    failed,
    skipped,
  }
}

export async function GET(request: NextRequest) {
  const authError = verifyCronRequest(request)
  if (authError) return authError

  await recordCronHeartbeat("telegram-notifications")

  try {
    const outcome = await withCronTimeout(
      () => processPendingPaidTelegramNotifications(),
      { timeoutMs: 50_000, jobName: "telegram-notifications" },
    )

    if (outcome.timedOut) {
      logger.warn("Telegram notification cron timed out", {})
      return NextResponse.json({
        success: true,
        partial: true,
        message: "Processing timed out - will continue next run",
      })
    }

    logger.info("Telegram notification cron completed", outcome.result)

    return NextResponse.json({
      success: true,
      ...outcome.result,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    logger.error("Telegram notification cron failed", { error: message })
    Sentry.captureException(err, { tags: { source: "telegram-notification-cron" } })
    return NextResponse.json({ success: false, error: "Telegram notification retry failed" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
