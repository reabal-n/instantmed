import * as Sentry from "@sentry/nextjs"
import { NextRequest, NextResponse } from "next/server"

import { verifyCronRequest, withCronTimeout } from "@/lib/api/cron-auth"
import { recordCronHeartbeat } from "@/lib/monitoring/cron-heartbeat"
import { sendPaidRequestTelegramNotification } from "@/lib/notifications/paid-request-telegram"
import { createLogger } from "@/lib/observability/logger"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import {
  deliverMedicalDirectorVoiceMessageAlert,
  deliverMedicalDirectorVoiceUnresolvedReminder,
} from "@/lib/twilio/medical-director-voice-message"

const logger = createLogger("cron-telegram-notifications")

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

const MAX_ATTEMPTS = 6
const BATCH_SIZE = 20
const RETRY_WINDOW_MINUTES = 30

type PendingPaidTelegramIntake = {
  id: string
  patient_id: string | null
  amount_cents: number | null
  category: string | null
  subtype: string | null
  payment_status: string | null
  paid_request_telegram_attempts: number | null
}

type PendingVoiceMessage = {
  id: string
  telegram_notification_attempts: number
}

async function processPendingPaidTelegramNotifications(signal?: AbortSignal) {
  signal?.throwIfAborted()
  const supabase = createServiceRoleClient()
  const retryWindowStart = new Date(Date.now() - RETRY_WINDOW_MINUTES * 60 * 1000)

  const { data, error } = await supabase
    .from("intakes")
    .select("id, patient_id, amount_cents, category, subtype, payment_status, paid_request_telegram_attempts")
    .eq("payment_status", "paid")
    .not("paid_at", "is", null)
    .gt("paid_at", retryWindowStart.toISOString())
    .gt("amount_cents", 0)
    .is("paid_request_telegram_sent_at", null)
    .lt("paid_request_telegram_attempts", MAX_ATTEMPTS)
    .order("paid_at", { ascending: true, nullsFirst: false })
    .limit(BATCH_SIZE)

  if (error) {
    throw error
  }

  signal?.throwIfAborted()
  const pending = (data || []) as PendingPaidTelegramIntake[]
  let sent = 0
  let failed = 0
  let skipped = 0

  for (const intake of pending) {
    signal?.throwIfAborted()
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
      signal?.throwIfAborted()

      if (result.sent) {
        sent++
      } else {
        skipped++
      }
    } catch (err) {
      if (signal?.aborted) throw err
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

  signal?.throwIfAborted()
  const { data: pendingVoiceRows, error: pendingVoiceError } = await supabase
    .from("medical_director_voice_messages")
    .select("id, telegram_notification_attempts")
    .neq("status", "resolved")
    .is("telegram_notification_sent_at", null)
    .lt("telegram_notification_attempts", MAX_ATTEMPTS)
    .order("created_at", { ascending: true })
    .limit(BATCH_SIZE)

  if (
    pendingVoiceError &&
    !["42P01", "PGRST205"].includes(pendingVoiceError.code)
  ) {
    throw pendingVoiceError
  }

  // Keep the existing paid-request retry job healthy during the safe rollout
  // window before the voice-message migration is applied.
  const voiceQueueAvailable = !pendingVoiceError
  const pendingVoice = voiceQueueAvailable
    ? (pendingVoiceRows ?? []) as PendingVoiceMessage[]
    : []
  for (const voiceMessage of pendingVoice) {
    signal?.throwIfAborted()
    try {
      const delivered = await deliverMedicalDirectorVoiceMessageAlert(voiceMessage.id)
      if (delivered) sent++
      else skipped++
    } catch (err) {
      if (signal?.aborted) throw err
      failed++
      logger.error("Medical Director voice-message Telegram retry failed", {
        attempts: voiceMessage.telegram_notification_attempts,
      })
      Sentry.captureException(err, {
        tags: { source: "telegram-notification-cron", notificationType: "medical-director-voice-message" },
        extra: { attempts: voiceMessage.telegram_notification_attempts },
      })
    }
  }

  if (voiceQueueAvailable) {
    try {
      const reminded = await deliverMedicalDirectorVoiceUnresolvedReminder()
      if (reminded) sent++
    } catch (err) {
      if (signal?.aborted) throw err
      failed++
      logger.error("Medical Director voice-message reminder failed", {})
      Sentry.captureException(err, {
        tags: {
          source: "telegram-notification-cron",
          notificationType: "medical-director-voice-reminder",
        },
      })
    }
  }

  return {
    processed: pending.length + pendingVoice.length,
    sent,
    failed,
    skipped,
  }
}

export async function GET(request: NextRequest) {
  const authError = verifyCronRequest(request)
  if (authError) return authError

  const startedAt = Date.now()

  try {
    const outcome = await withCronTimeout(
      (signal) => processPendingPaidTelegramNotifications(signal),
      { timeoutMs: 50_000, jobName: "telegram-notifications" },
    )

    if (outcome.timedOut) {
      logger.warn("Telegram notification cron timed out", {})
      await recordCronHeartbeat("telegram-notifications", {
        durationMs: Date.now() - startedAt,
        status: "timeout",
      })
      return NextResponse.json({
        success: true,
        partial: true,
        message: "Processing timed out - will continue next run",
      })
    }

    logger.info("Telegram notification cron completed", outcome.result)
    await recordCronHeartbeat("telegram-notifications", {
      durationMs: Date.now() - startedAt,
      itemsProcessed: outcome.result.processed,
      status: outcome.result.failed > 0 ? "partial_failure" : "ok",
    })

    return NextResponse.json({
      success: true,
      ...outcome.result,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    logger.error("Telegram notification cron failed", { error: message })
    Sentry.captureException(err, { tags: { source: "telegram-notification-cron" } })
    await recordCronHeartbeat("telegram-notifications", {
      durationMs: Date.now() - startedAt,
      status: "error",
    })
    return NextResponse.json({ success: false, error: "Telegram notification retry failed" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
