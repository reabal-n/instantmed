import { NextRequest, NextResponse } from "next/server"

import { verifyCronRequest } from "@/lib/api/cron-auth"
import { filterSeededE2EIntakes } from "@/lib/data/seeded-e2e-data"
import { QUEUE_REVIEW_STATUSES } from "@/lib/doctor/queue-utils"
import { recordCronHeartbeat } from "@/lib/monitoring/cron-heartbeat"
import {
  buildPendingQueueReminderMessages,
  type PendingQueueReminderRow,
} from "@/lib/notifications/pending-queue-reminder"
import { escapeMarkdown, sendTelegramAlert } from "@/lib/notifications/telegram"
import { createLogger } from "@/lib/observability/logger"
import { captureCronError } from "@/lib/observability/sentry"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const logger = createLogger("cron-pending-queue-reminders")

export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function GET(request: NextRequest) {
  const authError = verifyCronRequest(request)
  if (authError) return authError

  await recordCronHeartbeat("pending-queue-reminders")

  try {
    const supabase = createServiceRoleClient()
    const { data, error } = await filterSeededE2EIntakes(supabase
      .from("intakes")
      .select("status, is_priority, sla_deadline, paid_at, submitted_at, created_at")
      .in("status", QUEUE_REVIEW_STATUSES)
      .eq("payment_status", "paid"))
      .order("is_priority", { ascending: false })
      .order("sla_deadline", { ascending: true, nullsFirst: false })
      .order("paid_at", { ascending: true, nullsFirst: false })
      .order("submitted_at", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true })

    if (error) throw new Error(`Pending queue reminder query failed: ${error.message}`)

    const rows = (data ?? []) as PendingQueueReminderRow[]
    const messages = buildPendingQueueReminderMessages(rows)
    for (const message of messages) {
      const delivered = await sendTelegramAlert(escapeMarkdown(message), { severity: "warning" })
      if (!delivered) throw new Error("Pending queue reminder Telegram delivery failed")
    }

    return NextResponse.json({
      success: true,
      queue_count: rows.length,
      messages_sent: messages.length,
      checked_at: new Date().toISOString(),
    })
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    logger.error("Pending queue reminder failed", { error: err.message })
    captureCronError(err, { jobName: "pending-queue-reminders" })
    return NextResponse.json({ success: false, error: "Pending queue reminder failed" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
