import "server-only"

import { createHmac, timingSafeEqual } from "crypto"

import { env } from "@/lib/config/env"
import { resolveConfiguredUrl } from "@/lib/constants/resolve-configured-url"
import { buildDoctorIntakeHref } from "@/lib/dashboard/routes"
import { createLogger } from "@/lib/observability/logger"

const log = createLogger("telegram")

const TELEGRAM_API = "https://api.telegram.org"
const TELEGRAM_EDIT_TIMEOUT_MS = 5_000

function getToken() { return process.env.TELEGRAM_BOT_TOKEN }
function getChatId() { return process.env.TELEGRAM_CHAT_ID }
function getActionSigningSecret() { return process.env.TELEGRAM_ACTION_SIGNING_SECRET }
function getNotificationAppUrl(override?: string): string {
  return resolveConfiguredUrl(override, env.appUrl).replace(/\/$/, "")
}

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
  serviceSlug?: string
  /** Consult subtype — retained for routing context, never rendered in Telegram. */
  subtype?: string
  /** Deprecated compatibility input. Telegram never renders request detail. */
  serviceDetail?: string
  appUrl?: string
  isPriority?: boolean
}

interface TitleOptions {
  serviceSlug?: string
  subtype?: string
  serviceDetail?: string
  isPriority?: boolean
}

/**
 * Per-service emoji so the operator can tell what kind of work landed at a
 * glance. New med certs stay neutral until the real protocol outcome edits the
 * message to Approved or Manual review needed.
 */
function getServiceEmoji(opts: Pick<TitleOptions, "serviceSlug">): string {
  const { serviceSlug } = opts
  if (serviceSlug?.startsWith("med-cert")) {
    return "📄"
  }
  if (serviceSlug === "common-scripts") return "💊"
  if (serviceSlug === "consult") return "🩺"
  return "🩺"
}

function getServiceNoun(opts: Pick<TitleOptions, "serviceSlug">): string {
  const { serviceSlug } = opts
  if (serviceSlug?.startsWith("med-cert")) return "med cert"
  if (serviceSlug === "common-scripts") return "prescription"
  if (serviceSlug === "consult") return "consult"
  return "request"
}

function buildTitle(opts: TitleOptions): string {
  const parts: string[] = []
  if (opts.isPriority) parts.push("⚡")
  parts.push(getServiceEmoji(opts))
  parts.push(`New ${getServiceNoun(opts)}`)
  return `*${parts.join(" ")}*`
}

/**
 * Title used after the intake has been decided (approved/declined/needs-manual).
 * For non-med-cert intakes we keep the original service emoji so the operator
 * can match the edited message to the original at a glance. For med-cert we
 * drop the routing ✅/❌ to avoid stacking marks (the prefix already conveys it).
 */
function buildEditedTitle(prefix: string, opts: TitleOptions): string {
  const noun = getServiceNoun(opts)
  const isMedCert = opts.serviceSlug?.startsWith("med-cert")
  const middle = isMedCert ? noun : `${getServiceEmoji(opts)} ${noun}`
  return `*${prefix} · ${middle}*`
}

export interface NotifyNewIntakeResult {
  messageId: number | null
}

function parseMessageId(json: unknown): number | null {
  if (!json || typeof json !== "object") return null
  const result = (json as { result?: { message_id?: unknown } }).result
  const raw = result?.message_id
  return typeof raw === "number" ? raw : null
}

/**
 * Send a new-order notification to the doctor's Telegram.
 * Messages are PHI-minimal: broad service class and authenticated review link.
 * Medication, presenting complaint, consultation subtype, patient identity, and
 * other clinical detail must never enter Telegram.
 * Med cert approval buttons are disabled unless explicitly enabled with a separate signing secret.
 * Other requests get a notification + Review link.
 *
 * Returns the Telegram message_id so callers can persist it and later edit
 * the message to a Reviewed or Declined state.
 */
export async function notifyNewIntakeViaTelegram(opts: TelegramNotifyOptions): Promise<NotifyNewIntakeResult> {
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

  return isMedCert
    ? sendMedCertNotification(opts, token, chatId)
    : sendGenericNotification(opts, token, chatId)
}

async function sendGenericNotification(
  opts: TelegramNotifyOptions,
  token: string,
  chatId: string,
): Promise<NotifyNewIntakeResult> {
  const appUrl = getNotificationAppUrl(opts.appUrl)
  const reviewUrl = `${appUrl}${buildDoctorIntakeHref(opts.intakeId)}`
  const title = buildTitle({
    serviceSlug: opts.serviceSlug,
    subtype: opts.subtype,
    serviceDetail: opts.serviceDetail,
    isPriority: opts.isPriority,
  })

  const message = [title, ``, `[Review now →](${reviewUrl})`].join("\n")

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
    }
    const json = await response.json().catch(() => null)
    const messageId = parseMessageId(json)
    log.info("Telegram notification sent", { intakeId: opts.intakeId, hasMessageId: messageId !== null })
    return { messageId }
  } catch (error) {
    log.error("Telegram error", { intakeId: opts.intakeId }, error instanceof Error ? error : new Error(String(error)))
    throw error
  }
}

async function sendMedCertNotification(
  opts: TelegramNotifyOptions,
  token: string,
  chatId: string,
): Promise<NotifyNewIntakeResult> {
  const appUrl = getNotificationAppUrl(opts.appUrl)

  const reviewUrl = `${appUrl}${buildDoctorIntakeHref(opts.intakeId)}`
  const buttons: Array<{ text: string; callback_data?: string; url?: string }> = [
    { text: "📋 Review", url: reviewUrl },
  ]

  if (areTelegramApprovalActionsEnabled()) {
    // 👍 keeps the action distinct from the neutral new-request title.
    buttons.unshift({ text: "👍 Approve", callback_data: `approve:${opts.intakeId}:${signIntakeAction(opts.intakeId, "approve")}` })
  }

  const message = buildTitle({
    serviceSlug: opts.serviceSlug,
    subtype: opts.subtype,
    serviceDetail: opts.serviceDetail,
    isPriority: opts.isPriority,
  })

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
    }
    const json = await response.json().catch(() => null)
    const messageId = parseMessageId(json)
    log.info("Telegram med cert notification sent", { intakeId: opts.intakeId, hasMessageId: messageId !== null })
    return { messageId }
  } catch (error) {
    log.error("Telegram error", { intakeId: opts.intakeId }, error instanceof Error ? error : new Error(String(error)))
    throw error
  }
}

export interface EditTelegramMessageOptions {
  serviceSlug?: string
  subtype?: string
  serviceDetail?: string
}

/**
 * Edit the original new-request notification to show that the intake has been
 * approved (by the operator OR by the auto-approval pipeline). Caller passes
 * the message_id that was captured on send plus the service context so chat
 * history stays scannable. No-op when chat is not configured. The underlying
 * edit is bounded and fail-soft so it can be awaited by clinical workflows
 * without changing their outcome.
 */
export async function editTelegramMessageToApproved(
  messageId: number,
  opts: EditTelegramMessageOptions,
): Promise<void> {
  const chatId = getChatId()
  if (!chatId) return
  await editTelegramMessage(chatId, messageId, buildEditedTitle("✓ Approved", opts))
}

/**
 * Edit the original new-request notification to show that the operator
 * declined the intake. Same fail-soft contract as the approved variant.
 */
export async function editTelegramMessageToDeclined(
  messageId: number,
  opts: EditTelegramMessageOptions,
): Promise<void> {
  const chatId = getChatId()
  if (!chatId) return
  await editTelegramMessage(chatId, messageId, buildEditedTitle("✕ Declined", opts))
}

/**
 * Edit the original new-request notification to show that the auto-approval
 * pipeline declined to auto-approve (eligibility check failed) so the operator
 * needs to review it manually. Only relevant for med-cert intakes that were
 * sent with the neutral pending marker and then proved ineligible.
 */
export async function editTelegramMessageToNeedsManualReview(
  messageId: number,
  opts: EditTelegramMessageOptions,
): Promise<void> {
  const chatId = getChatId()
  if (!chatId) return
  await editTelegramMessage(chatId, messageId, buildEditedTitle("❌ Manual review needed", opts))
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
      signal: AbortSignal.timeout(TELEGRAM_EDIT_TIMEOUT_MS),
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
      return
    }
    log.info("Telegram message edited", { messageId })
  } catch (error) {
    log.error("Failed to edit Telegram message", {}, error instanceof Error ? error : new Error(String(error)))
  }
}

// --- Operational notifications (operator decision 2026-07-17) ---
// Beyond per-request pings, Telegram carries exactly two operational sends:
// an hourly count-only reminder while paid requests wait for review, and
// essential CRITICAL-severity business alerts. It is deliberately NOT a
// general second alerting channel — warnings, routine metrics, and cron
// watchdog noise stay in Sentry/PostHog. Content is aggregate counts and
// pre-built PHI-free detail strings only; patient identity, medicines, and
// clinical detail must never enter Telegram.

/** Fail-soft send for operational messages — a Telegram outage or missing
 * configuration must never fail the cron doing the real work. */
async function postOperationalTelegramMessage(
  message: string,
  context: string,
): Promise<boolean> {
  const token = getToken()
  const chatId = getChatId()
  if (!token || !chatId) {
    log.warn("Telegram operational send skipped: not configured", { context })
    return false
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
      }),
    })
    if (!response.ok) {
      const body = await response.text()
      log.error("Telegram operational send failed", { context, status: response.status, body })
      return false
    }
    return true
  } catch (error) {
    log.error(
      "Telegram operational send errored",
      { context },
      error instanceof Error ? error : new Error(String(error)),
    )
    return false
  }
}

function formatWaitDuration(minutes: number): string {
  if (minutes < 60) return `${Math.max(1, Math.round(minutes))} min`
  return `${(minutes / 60).toFixed(1)}h`
}

export interface QueueWaitingReminderOptions {
  waitingCount: number
  oldestWaitingMinutes: number
  appUrl?: string
}

/**
 * Hourly "requests are waiting in line" nudge (operator decision 2026-07-17).
 * Cadence is the caller's cron schedule; content is count + oldest wait only.
 */
export async function sendQueueWaitingReminderViaTelegram(
  opts: QueueWaitingReminderOptions,
): Promise<boolean> {
  const appUrl = getNotificationAppUrl(opts.appUrl)
  const noun = opts.waitingCount === 1 ? "request" : "requests"
  const title = `*⏳ ${opts.waitingCount} ${noun} waiting for review*`
  const detail = escapeMarkdown(
    `Oldest has waited ${formatWaitDuration(opts.oldestWaitingMinutes)}.`,
  )
  const message = [title, ``, detail, ``, `[Open queue →](${appUrl}/dashboard)`].join("\n")
  return postOperationalTelegramMessage(message, "queue_waiting_reminder")
}

/**
 * Essential critical-severity business alert. Callers pass the already
 * PHI-free aggregate detail string the Sentry critical capture uses.
 */
export async function sendCriticalBusinessAlertViaTelegram(
  detail: string,
): Promise<boolean> {
  const message = [`*🚨 Critical business alert*`, ``, escapeMarkdown(detail)].join("\n")
  return postOperationalTelegramMessage(message, "critical_business_alert")
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
