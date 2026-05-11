"use server"

import { createHmac, randomUUID } from "crypto"

import { requireRoleOrNull } from "@/lib/auth/helpers"
import { getMissingTelegramAlertEnv } from "@/lib/config/env"
import { revalidateStaff } from "@/lib/dashboard/revalidate-staff"
import { sendTelegramTestAlert } from "@/lib/notifications/telegram"
import { createLogger } from "@/lib/observability/logger"
import { checkServerActionRateLimit } from "@/lib/rate-limit/redis"
import { logAuditEvent } from "@/lib/security/audit-log"
import type { ActionResult } from "@/types/shared"

const log = createLogger("telegram-ops-actions")

interface TelegramTestAlertActionData {
  eventId: string
  sentAt: string
  messageId?: number
}

function signTelegramTestEvent(eventId: string, issuedAt: string): string {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET
    || process.env.INTERNAL_API_SECRET
    || process.env.TELEGRAM_BOT_TOKEN
    || "instantmed-local-telegram-test"

  return createHmac("sha256", secret)
    .update(`telegram-ops-test:${eventId}:${issuedAt}`)
    .digest("hex")
    .slice(0, 16)
}

export async function sendTelegramTestAlertAction(): Promise<ActionResult<TelegramTestAlertActionData>> {
  const authResult = await requireRoleOrNull(["admin"])
  if (!authResult) {
    return { success: false, error: "Unauthorized" }
  }

  const rateLimit = await checkServerActionRateLimit(
    `admin:${authResult.profile.id}:telegram-test-alert`,
    "admin",
  )
  if (!rateLimit.success) {
    return { success: false, error: rateLimit.error || "Too many requests. Please wait and try again." }
  }

  const missingVars = getMissingTelegramAlertEnv()
  const eventId = randomUUID()
  const issuedAt = new Date().toISOString()
  const signature = signTelegramTestEvent(eventId, issuedAt)

  if (missingVars.length > 0) {
    await logAuditEvent({
      action: "admin_action",
      actorId: authResult.profile.id,
      actorType: "admin",
      metadata: {
        action_type: "telegram_test_alert",
        status: "blocked",
        event_id: eventId,
        missing_vars: missingVars,
      },
    })

    return {
      success: false,
      error: `Telegram alerts are missing ${missingVars.join(", ")}.`,
      data: { eventId, sentAt: issuedAt },
    }
  }

  try {
    const result = await sendTelegramTestAlert({
      eventId,
      issuedAt,
      signature,
    })

    await logAuditEvent({
      action: "admin_action",
      actorId: authResult.profile.id,
      actorType: "admin",
      metadata: {
        action_type: "telegram_test_alert",
        status: "sent",
        event_id: eventId,
        sent_at: result.sentAt,
        telegram_message_id: result.messageId,
        signature_prefix: signature.slice(0, 8),
      },
    })

    revalidateStaff({ ops: true })

    return {
      success: true,
      data: {
        eventId,
        sentAt: result.sentAt,
        messageId: result.messageId,
      },
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown Telegram send failure"

    await logAuditEvent({
      action: "admin_action",
      actorId: authResult.profile.id,
      actorType: "admin",
      metadata: {
        action_type: "telegram_test_alert",
        status: "failed",
        event_id: eventId,
        error_type: error instanceof Error ? error.name : "UnknownError",
        error_code: "telegram_test_alert_failed",
      },
    })

    log.error("Telegram test alert failed", {
      adminId: authResult.profile.id,
      eventId,
      error: errorMessage,
    })

    return {
      success: false,
      error: "Telegram test alert failed. Check the bot token, chat ID, and Telegram API response.",
      data: { eventId, sentAt: issuedAt },
    }
  }
}
