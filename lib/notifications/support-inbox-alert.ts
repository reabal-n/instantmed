import "server-only"

import { createLogger } from "@/lib/observability/logger"

const log = createLogger("support-inbox-alert")
const TELEGRAM_API = "https://api.telegram.org"
const SUPPORT_INBOX_ALERT_LOCK_KEY = "support-inbox-alert:positive-count:lock"

export const SUPPORT_INBOX_AUDIT_ACTION = "support_inbox_alert_observation"
export const SUPPORT_INBOX_ALERT_LOCK_TTL_SECONDS = 30
export const SUPPORT_INBOX_OUTBOUND_TIMEOUT_MS = 12_000

export type SupportInboxAlertOutcome = "delivered" | "delivery_failed" | "suppressed" | "zero"

export interface SupportInboxObservation {
  createdAt: string
  outcome: SupportInboxAlertOutcome
  unreadCount: number
}

export const SUPPORT_INBOX_REPEAT_INTERVAL_MS = 4 * 60 * 60 * 1000

type SupportInboxAlertLockStatus = "acquired" | "held" | "unavailable"

interface SupportInboxAlertLockRedis {
  set(
    key: string,
    value: string,
    options: { ex: number; nx: true },
  ): Promise<unknown>
}

export async function acquireSupportInboxAlertLock(input: {
  nodeEnv?: string
  redisFactory?: () => Promise<SupportInboxAlertLockRedis> | SupportInboxAlertLockRedis
  redisRestToken?: string
  redisRestUrl?: string
} = {}): Promise<SupportInboxAlertLockStatus> {
  const nodeEnv = input.nodeEnv ?? process.env.NODE_ENV
  const redisRestToken = input.redisRestToken ?? process.env.UPSTASH_REDIS_REST_TOKEN
  const redisRestUrl = input.redisRestUrl ?? process.env.UPSTASH_REDIS_REST_URL
  const failClosed = nodeEnv === "production"

  if (!redisRestToken || !redisRestUrl) {
    return failClosed ? "unavailable" : "acquired"
  }

  try {
    const redis = input.redisFactory
      ? await input.redisFactory()
      : (await import("@upstash/redis")).Redis.fromEnv()
    const acquired = await redis.set(
      SUPPORT_INBOX_ALERT_LOCK_KEY,
      crypto.randomUUID(),
      { ex: SUPPORT_INBOX_ALERT_LOCK_TTL_SECONDS, nx: true },
    )
    return acquired ? "acquired" : "held"
  } catch (error) {
    log.error(
      "Support inbox alert lock unavailable",
      undefined,
      error instanceof Error ? error : new Error(String(error)),
    )
    return failClosed ? "unavailable" : "acquired"
  }
}

export function decideSupportInboxAlert(input: {
  now: Date
  observations: SupportInboxObservation[]
  unreadCount: number
}): "page" | "suppressed" | "zero" {
  if (input.unreadCount === 0) return "zero"

  const latest = input.observations[0]
  if (!latest || latest.unreadCount !== input.unreadCount) return "page"
  if (latest.outcome === "delivery_failed") return "page"

  const lastDelivery = input.observations.find(
    (observation) => observation.outcome === "delivered" && observation.unreadCount === input.unreadCount,
  )
  if (!lastDelivery) return "page"

  const lastDeliveredAt = new Date(lastDelivery.createdAt).getTime()
  if (
    Number.isFinite(lastDeliveredAt) &&
    input.now.getTime() - lastDeliveredAt < SUPPORT_INBOX_REPEAT_INTERVAL_MS
  ) return "suppressed"

  return "page"
}

export async function sendSupportInboxTelegramAlert(unreadCount: number): Promise<boolean> {
  if (process.env.TELEGRAM_SUPPORT_INBOX_ALERTS_ENABLED !== "1") return false
  if (!Number.isInteger(unreadCount) || unreadCount < 1 || unreadCount > 10_000) return false

  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) return false

  try {
    const response = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        disable_web_page_preview: true,
        text: `Support inbox: ${unreadCount} unread.\nReview in Gmail: https://mail.google.com/mail/#inbox`,
      }),
      signal: AbortSignal.timeout(SUPPORT_INBOX_OUTBOUND_TIMEOUT_MS),
    })
    if (!response.ok) {
      log.error("Support inbox Telegram alert failed", { status: response.status, unreadCount })
      return false
    }
    return true
  } catch (error) {
    log.error(
      "Support inbox Telegram alert failed",
      { unreadCount },
      error instanceof Error ? error : new Error(String(error)),
    )
    return false
  }
}
