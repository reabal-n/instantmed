import "server-only"

import { createHmac, timingSafeEqual } from "crypto"

import { createLogger } from "@/lib/observability/logger"

const log = createLogger("telegram")

const TELEGRAM_API = "https://api.telegram.org"

function getToken() { return process.env.TELEGRAM_BOT_TOKEN }
function getChatId() { return process.env.TELEGRAM_CHAT_ID }
function getActionSigningSecret() { return process.env.TELEGRAM_ACTION_SIGNING_SECRET }

class TelegramSendError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "TelegramSendError"
  }
}

export function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, "\\$&")
}

/**
 * Escape dynamic text for use inside a MarkdownV2 template that already
 * contains intentional formatting (e.g. *bold*).  Escapes everything
 * EXCEPT `*` and `\` (assumed to be pre-escaped by the caller).
 */
export function escapeMarkdownValue(text: string): string {
  return text.replace(/[_[\]()~`>#+\-=|{}.!]/g, "\\$&")
}

/**
 * Telegram approval actions are intentionally opt-in. A leaked bot token must
 * not be enough to approve clinical work.
 */
export function areTelegramApprovalActionsEnabled(): boolean {
  return process.env.TELEGRAM_APPROVAL_ACTIONS_ENABLED === "true" && Boolean(getActionSigningSecret())
}

export function signIntakeAction(intakeId: string, action: string): string {
  const secret = getActionSigningSecret()
  if (!secret) return ""
  return createHmac("sha256", secret).update(`${intakeId}:${action}`).digest("hex").slice(0, 16)
}

export function verifyIntakeAction(intakeId: string, action: string, signature: string): boolean {
  const expected = signIntakeAction(intakeId, action)
  if (!expected || signature.length !== expected.length) return false
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  } catch {
    return false
  }
}

// --- Notification types ---

interface TelegramNotifyOptions {
  intakeId: string
  patientName: string
  serviceName: string
  amount: string
  serviceSlug?: string
  appUrl?: string
}

/**
 * Send a new-order notification to the doctor's Telegram.
 * Messages are PHI-minimal: service, amount, short ref, and authenticated review link.
 * Med cert approval buttons are disabled unless explicitly enabled with a separate signing secret.
 * Other requests get a notification + Review link.
 */
export async function notifyNewIntakeViaTelegram(opts: TelegramNotifyOptions): Promise<void> {
  const token = getToken()
  const chatId = getChatId()
  if (!token || !chatId) {
    const missing = [
      !token ? "TELEGRAM_BOT_TOKEN" : null,
      !chatId ? "TELEGRAM_CHAT_ID" : null,
    ].filter(Boolean).join(", ")
    const error = new TelegramSendError(`Telegram notification is not configured: missing ${missing}`)
    log.error("Telegram notification not configured", { intakeId: opts.intakeId, missing })
    throw error
  }

  const isMedCert = opts.serviceSlug?.startsWith("med-cert")

  if (isMedCert) {
    await sendMedCertNotification(opts, token, chatId)
  } else {
    await sendGenericNotification(opts, token, chatId)
  }
}

async function sendGenericNotification(
  opts: TelegramNotifyOptions,
  token: string,
  chatId: string,
): Promise<void> {
  const refId = opts.intakeId.slice(0, 8).toUpperCase()
  const appUrl = opts.appUrl || process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au"
  const reviewUrl = `${appUrl}/doctor/intakes/${opts.intakeId}`

  const message = [
    `💰 *New request received*`,
    ``,
    `*${escapeMarkdown(opts.serviceName)}* \\- ${escapeMarkdown(opts.amount)}`,
    `Ref: \`${refId}\``,
    ``,
    `[Review now →](${reviewUrl})`,
  ].join("\n")

  try {
    const response = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "MarkdownV2",
        disable_web_page_preview: true,
      }),
    })
    if (!response.ok) {
      const body = await response.text()
      log.error("Telegram send failed", { status: response.status, body })
      throw new TelegramSendError(`Telegram send failed: ${response.status}`)
    } else {
      log.info("Telegram notification sent", { intakeId: opts.intakeId })
    }
  } catch (error) {
    log.error("Telegram error", { intakeId: opts.intakeId }, error instanceof Error ? error : new Error(String(error)))
    throw error
  }
}

async function sendMedCertNotification(
  opts: TelegramNotifyOptions,
  token: string,
  chatId: string,
): Promise<void> {
  const appUrl = opts.appUrl || process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au"
  const refId = opts.intakeId.slice(0, 8).toUpperCase()

  const reviewUrl = `${appUrl}/doctor/intakes/${opts.intakeId}`
  const buttons: Array<{ text: string; callback_data?: string; url?: string }> = [
    { text: "📋 Review", url: reviewUrl },
  ]

  if (areTelegramApprovalActionsEnabled()) {
    buttons.unshift({ text: "✅ Approve", callback_data: `approve:${opts.intakeId}:${signIntakeAction(opts.intakeId, "approve")}` })
  }

  const message = [
    `💰 *New med cert request*`,
    ``,
    `*${escapeMarkdown(opts.serviceName)}* \\- ${escapeMarkdown(opts.amount)}`,
    `Ref: \`${refId}\``,
  ].join("\n")

  const inlineKeyboard = {
    inline_keyboard: [buttons],
  }

  try {
    const response = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "MarkdownV2",
        disable_web_page_preview: true,
        reply_markup: inlineKeyboard,
      }),
    })
    if (!response.ok) {
      const body = await response.text()
      log.error("Telegram med cert send failed", { status: response.status, body })
      throw new TelegramSendError(`Telegram med cert send failed: ${response.status}`)
    } else {
      log.info("Telegram med cert notification sent", { intakeId: opts.intakeId })
    }
  } catch (error) {
    log.error("Telegram error", { intakeId: opts.intakeId }, error instanceof Error ? error : new Error(String(error)))
    throw error
  }
}

/**
 * Edit a Telegram message (used to update after approval)
 */
export async function editTelegramMessage(
  chatId: string | number,
  messageId: number,
  newText: string,
): Promise<void> {
  const token = getToken()
  if (!token) return

  try {
    const response = await fetch(`${TELEGRAM_API}/bot${token}/editMessageText`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        text: newText,
        parse_mode: "MarkdownV2",
      }),
    })
    if (!response.ok) {
      const body = await response.text()
      log.error("Failed to edit Telegram message", { status: response.status, body })
    }
  } catch (error) {
    log.error("Failed to edit Telegram message", {}, error instanceof Error ? error : new Error(String(error)))
  }
}

/**
 * Answer a Telegram callback query (dismisses the loading spinner on the button)
 */
export async function answerCallbackQuery(
  callbackQueryId: string,
  text: string,
): Promise<void> {
  const token = getToken()
  if (!token) return

  try {
    const response = await fetch(`${TELEGRAM_API}/bot${token}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text,
        show_alert: false,
      }),
    })
    if (!response.ok) {
      const body = await response.text()
      log.error("Failed to answer callback query", { status: response.status, body })
    }
  } catch (error) {
    log.error("Failed to answer callback query", {}, error instanceof Error ? error : new Error(String(error)))
  }
}

/**
 * Telegram severity tiers. Only `critical` reaches the phone by default.
 * Everything else is silenced by this channel and must route through Sentry +
 * the daily digest email instead.
 *
 * Why: after the 2026-04-21 audit, Telegram was firing for stuck intakes,
 * date-correction requests, auto-approval warnings, email SLA blips — i.e.
 * any time the founder wasn't actively looking, half a dozen pings would
 * arrive overnight. Noise kills signal. This gate collapses the channel
 * to two things only: "code is on fire" and "new paid order".
 *
 * To re-enable non-critical Telegram alerts set `TELEGRAM_ALL_LEVELS=1`.
 */
export type TelegramSeverity = "critical" | "warning" | "info"

function isSeverityAllowed(severity: TelegramSeverity): boolean {
  if (severity === "critical") return true
  return process.env.TELEGRAM_ALL_LEVELS === "1"
}

/**
 * Send a plain text alert (for system events, errors, etc.).
 *
 * Only `critical` severity fires by default — see TelegramSeverity. Callers
 * that want quieter signals should still call with the correct severity
 * (never silently change to `critical` to force delivery; the daily digest
 * is the right home for warning/info).
 */
export async function sendTelegramAlert(
  message: string,
  options: { severity?: TelegramSeverity } = {}
): Promise<void> {
  const severity = options.severity ?? "critical"
  if (!isSeverityAllowed(severity)) return

  const token = getToken()
  const chatId = getChatId()
  if (!token || !chatId) return

  try {
    const response = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "MarkdownV2",
        disable_web_page_preview: true,
      }),
    })
    if (!response.ok) {
      const body = await response.text()
      log.error("Telegram alert failed", { status: response.status, body })
    }
  } catch (error) {
    log.error("Telegram alert failed", {}, error instanceof Error ? error : new Error(String(error)))
  }
}
