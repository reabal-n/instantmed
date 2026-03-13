import "server-only"
import { createLogger } from "@/lib/observability/logger"
import { createHmac } from "crypto"

const log = createLogger("telegram")

const TELEGRAM_API = "https://api.telegram.org"

function getToken() { return process.env.TELEGRAM_BOT_TOKEN }
function getChatId() { return process.env.TELEGRAM_CHAT_ID }

export function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, "\\$1")
}

/**
 * Sign an intake ID for secure Telegram callback approval.
 * HMAC-SHA256 using the bot token as the secret -- only the server can generate valid signatures.
 */
export function signIntakeAction(intakeId: string, action: string): string {
  const secret = getToken()
  if (!secret) return ""
  return createHmac("sha256", secret).update(`${intakeId}:${action}`).digest("hex").slice(0, 16)
}

export function verifyIntakeAction(intakeId: string, action: string, signature: string): boolean {
  return signIntakeAction(intakeId, action) === signature
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

interface _MedCertNotifyOptions extends TelegramNotifyOptions {
  certType?: string
  duration?: string
  startDate?: string
  symptoms?: string
}

/**
 * Send a new-order notification to the doctor's Telegram.
 * Med cert requests include a clinical summary + Approve/Review buttons.
 * Other requests get a notification + Review link.
 */
export async function notifyNewIntakeViaTelegram(opts: TelegramNotifyOptions): Promise<void> {
  const token = getToken()
  const chatId = getChatId()
  if (!token || !chatId) {
    log.debug("Telegram not configured, skipping notification")
    return
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
  const firstName = opts.patientName.split(" ")[0]
  const refId = opts.intakeId.slice(0, 8).toUpperCase()
  const appUrl = opts.appUrl || process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au"
  const reviewUrl = `${appUrl}/doctor/intakes/${opts.intakeId}`

  const message = [
    `💰 *New request received*`,
    ``,
    `*${escapeMarkdown(opts.serviceName)}* — ${escapeMarkdown(opts.amount)}`,
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
    } else {
      log.info("Telegram notification sent", { intakeId: opts.intakeId })
    }
  } catch (error) {
    log.error("Telegram error", { intakeId: opts.intakeId }, error instanceof Error ? error : new Error(String(error)))
  }
}

async function sendMedCertNotification(
  opts: TelegramNotifyOptions,
  token: string,
  chatId: string,
): Promise<void> {
  const appUrl = opts.appUrl || process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au"
  const firstName = opts.patientName.split(" ")[0]
  const refId = opts.intakeId.slice(0, 8).toUpperCase()

  // Fetch the clinical summary from intake answers
  let summary = ""
  try {
    const { createServiceRoleClient } = await import("@/lib/supabase/service-role")
    const supabase = createServiceRoleClient()
    const { data: answers } = await supabase
      .from("intake_answers")
      .select("answers")
      .eq("intake_id", opts.intakeId)
      .maybeSingle()

    if (answers?.answers) {
      const a = answers.answers as Record<string, unknown>
      const certType = (a.certificate_type as string) || (a.cert_type as string) || ""
      const duration = (a.duration as string) || (a.number_of_days as string) || ""
      const startDate = (a.start_date as string) || ""
      const symptoms = (a.symptoms as string) || (a.reason as string) || (a.medical_reason as string) || ""

      const parts: string[] = []
      if (certType) parts.push(`Type: ${escapeMarkdown(certType)}`)
      if (duration) parts.push(`Duration: ${escapeMarkdown(String(duration))} day${duration === "1" ? "" : "s"}`)
      if (startDate) parts.push(`Start: ${escapeMarkdown(startDate)}`)
      if (symptoms) parts.push(`Reason: ${escapeMarkdown(symptoms.slice(0, 80))}${symptoms.length > 80 ? "\\.\\.\\." : ""}`)

      if (parts.length > 0) {
        summary = "\n" + parts.join("\n")
      }
    }
  } catch (_err) {
    log.warn("Failed to fetch intake answers for Telegram summary", { intakeId: opts.intakeId })
  }

  const sig = signIntakeAction(opts.intakeId, "approve")

  const message = [
    `💰 *New med cert request*`,
    ``,
    `*${escapeMarkdown(opts.serviceName)}* — ${escapeMarkdown(opts.amount)}`,
    `Patient: ${escapeMarkdown(firstName)}`,
    `Ref: \`${refId}\``,
    summary,
  ].join("\n")

  const inlineKeyboard = {
    inline_keyboard: [
      [
        { text: "✅ Approve", callback_data: `approve:${opts.intakeId}:${sig}` },
        { text: "📋 Review", url: `${appUrl}/doctor/intakes/${opts.intakeId}` },
      ],
    ],
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
    } else {
      log.info("Telegram med cert notification sent", { intakeId: opts.intakeId })
    }
  } catch (error) {
    log.error("Telegram error", { intakeId: opts.intakeId }, error instanceof Error ? error : new Error(String(error)))
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
    await fetch(`${TELEGRAM_API}/bot${token}/editMessageText`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        text: newText,
        parse_mode: "MarkdownV2",
      }),
    })
  } catch {
    log.error("Failed to edit Telegram message")
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
    await fetch(`${TELEGRAM_API}/bot${token}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text,
        show_alert: false,
      }),
    })
  } catch {
    log.error("Failed to answer callback query")
  }
}

/**
 * Send a plain text alert (for system events, errors, etc.)
 */
export async function sendTelegramAlert(message: string): Promise<void> {
  const token = getToken()
  const chatId = getChatId()
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
