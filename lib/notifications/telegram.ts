import "server-only"
import { createLogger } from "@/lib/observability/logger"

const log = createLogger("telegram")

const TELEGRAM_API = "https://api.telegram.org"

interface TelegramNotifyOptions {
  intakeId: string
  patientName: string
  serviceName: string
  amount: string
  appUrl?: string
}

function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, "\\$1")
}

/**
 * Send a new-order notification to the doctor's Telegram.
 * Designed to feel like a Shopify sale notification -- satisfying and actionable.
 * Non-blocking: errors are logged but never thrown to avoid disrupting the payment flow.
 */
export async function notifyNewIntakeViaTelegram({
  intakeId,
  patientName,
  serviceName,
  amount,
  appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au",
}: TelegramNotifyOptions): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID

  if (!token || !chatId) {
    log.debug("Telegram not configured, skipping notification")
    return
  }

  const firstName = patientName.split(" ")[0]
  const refId = intakeId.slice(0, 8).toUpperCase()
  const reviewUrl = `${appUrl}/doctor/intakes/${intakeId}`

  const message = [
    `💰 *New request received*`,
    ``,
    `*${escapeMarkdown(serviceName)}* — ${escapeMarkdown(amount)}`,
    `Patient: ${escapeMarkdown(firstName)}`,
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
      return
    }

    log.info("Telegram notification sent", { intakeId, refId })
  } catch (error) {
    log.error("Telegram notification error", { intakeId }, error instanceof Error ? error : new Error(String(error)))
  }
}

/**
 * Send a plain text alert (for system events, errors, etc.)
 */
export async function sendTelegramAlert(message: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID

  if (!token || !chatId) return

  try {
    await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "MarkdownV2",
        disable_web_page_preview: true,
      }),
    })
  } catch {
    log.error("Telegram alert failed")
  }
}
