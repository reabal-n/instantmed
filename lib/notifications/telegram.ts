import "server-only"

import { createHmac, timingSafeEqual } from "crypto"

import { env } from "@/lib/config/env"
import { resolveConfiguredUrl } from "@/lib/constants/resolve-configured-url"
import { buildDoctorIntakeHref } from "@/lib/dashboard/routes"
import { createLogger } from "@/lib/observability/logger"

const log = createLogger("telegram")

const TELEGRAM_API = "https://api.telegram.org"

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
  /** Consult subtype — used to pick a per-service emoji + noun (ed, hair_loss, etc.). */
  subtype?: string
  /** Compact detail appended to the title as "· detail" (e.g. "1 day", "Atorvastatin"). */
  serviceDetail?: string
  appUrl?: string
  isPriority?: boolean
  /**
   * The system will attempt auto-approval (med cert + ai_auto_approve_enabled).
   * Med cert renders ✅ when true, ❌ when false (needs your manual review).
   * Ignored for non-med-cert services (which always need manual review and
   * render with their service-specific emoji instead).
   * Actual eligibility runs later against AI drafts; this is a routing signal —
   * the auto-approval pipeline edits the message to its true outcome.
   */
  autoApprovalCandidate?: boolean
}

interface TitleOptions {
  serviceSlug?: string
  subtype?: string
  serviceDetail?: string
  isPriority?: boolean
  autoApprovalCandidate?: boolean
}

/**
 * Per-service emoji so the operator can tell what kind of work landed at a
 * glance. Med cert is the only auto-approval candidate: ✅ when the system
 * will try, ❌ when the operator needs to handle it manually.
 */
function getServiceEmoji(opts: Pick<TitleOptions, "serviceSlug" | "subtype" | "autoApprovalCandidate">): string {
  const { serviceSlug, subtype, autoApprovalCandidate } = opts
  if (serviceSlug?.startsWith("med-cert")) {
    return autoApprovalCandidate ? "✅" : "❌"
  }
  if (serviceSlug === "common-scripts") return "💊"
  if (serviceSlug === "consult") {
    if (subtype === "ed") return "💙"
    if (subtype === "hair_loss") return "💇"
    if (subtype === "womens_health") return "🌸"
    if (subtype === "weight_loss") return "⚖️"
    if (subtype === "new_medication") return "💊"
  }
  return "🩺"
}

function getServiceNoun(opts: Pick<TitleOptions, "serviceSlug" | "subtype">): string {
  const { serviceSlug, subtype } = opts
  if (serviceSlug?.startsWith("med-cert")) return "med cert"
  if (serviceSlug === "common-scripts") return "prescription"
  if (serviceSlug === "consult") {
    if (subtype === "ed") return "ED consult"
    if (subtype === "hair_loss") return "hair loss consult"
    if (subtype === "womens_health") return "women's health consult"
    if (subtype === "weight_loss") return "weight loss consult"
    if (subtype === "new_medication") return "new Rx consult"
  }
  return "request"
}

function appendDetail(noun: string, detail?: string): string {
  if (!detail) return noun
  return `${noun} · ${escapeMarkdownValue(detail)}`
}

function buildTitle(opts: TitleOptions): string {
  const parts: string[] = []
  if (opts.isPriority) parts.push("⚡")
  parts.push(getServiceEmoji(opts))
  parts.push(`New ${appendDetail(getServiceNoun(opts), opts.serviceDetail)}`)
  return `*${parts.join(" ")}*`
}

/**
 * Title used after the intake has been decided (approved/declined/needs-manual).
 * For non-med-cert intakes we keep the original service emoji so the operator
 * can match the edited message to the original at a glance. For med-cert we
 * drop the routing ✅/❌ to avoid stacking marks (the prefix already conveys it).
 */
function buildEditedTitle(prefix: string, opts: TitleOptions): string {
  const noun = appendDetail(getServiceNoun(opts), opts.serviceDetail)
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
 * Messages are PHI-minimal: service, amount, short ref, and authenticated review link.
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
    autoApprovalCandidate: opts.autoApprovalCandidate,
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
    // 👍 (not ✅) so the button stays distinct from the title's ✅ auto-approval marker.
    buttons.unshift({ text: "👍 Approve", callback_data: `approve:${opts.intakeId}:${signIntakeAction(opts.intakeId, "approve")}` })
  }

  const message = buildTitle({
    serviceSlug: opts.serviceSlug,
    subtype: opts.subtype,
    serviceDetail: opts.serviceDetail,
    isPriority: opts.isPriority,
    autoApprovalCandidate: opts.autoApprovalCandidate,
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
 * history stays scannable. No-op when chat is not configured. Errors propagate
 * to the caller for logging.
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
 * sent with ✅ but turned out to be ineligible (mental-health keyword, duration
 * out of range, repeat-request cooldown, etc.).
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
 * Telegram system alerts are disabled by default. The doctor-facing phone
 * channel should stay reserved for new paid request notifications sent via
 * notifyNewIntakeViaTelegram().
 *
 * Temporary ops override: set TELEGRAM_SYSTEM_ALERTS_ENABLED=1.
 */
export type TelegramSeverity = "critical" | "warning" | "info"

function isSeverityAllowed(severity: TelegramSeverity): boolean {
  void severity
  return process.env.TELEGRAM_SYSTEM_ALERTS_ENABLED === "1"
}

/**
 * Send a plain text alert (for system events, errors, etc.).
 *
 * Disabled unless TELEGRAM_SYSTEM_ALERTS_ENABLED=1. New request alerts use
 * notifyNewIntakeViaTelegram() directly and are not affected by this gate.
 */
export async function sendTelegramAlert(
  message: string,
  options: { severity?: TelegramSeverity } = {}
): Promise<boolean> {
  // Returns true only if the alert was actually delivered. Callers that write a
  // cooldown/dedup row (e.g. business-alerts) MUST gate that write on this
  // result — otherwise a transient Telegram failure burns the cooldown and
  // suppresses re-paging for the whole window. Returns false (not throws) when
  // disabled/unconfigured/failed so callers never crash on alerting.
  const severity = options.severity ?? "critical"
  if (!isSeverityAllowed(severity)) return false

  const token = getToken()
  const chatId = getChatId()
  if (!token || !chatId) return false

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
      return false
    }
    return true
  } catch (error) {
    log.error("Telegram alert failed", {}, error instanceof Error ? error : new Error(String(error)))
    return false
  }
}

export interface TelegramTestAlertOptions {
  eventId: string
  issuedAt: string
  signature: string
  appUrl?: string
}

export interface TelegramTestAlertResult {
  sentAt: string
  messageId?: number
}

export async function sendTelegramTestAlert(
  opts: TelegramTestAlertOptions,
): Promise<TelegramTestAlertResult> {
  const token = getToken()
  const chatId = getChatId()
  if (!token || !chatId) {
    const missing = [
      !token ? "TELEGRAM_BOT_TOKEN" : null,
      !chatId ? "TELEGRAM_CHAT_ID" : null,
    ].filter(Boolean).join(", ")
    throw new TelegramSendError(`Telegram test alert is not configured: missing ${missing}`)
  }

  const appUrl = getNotificationAppUrl(opts.appUrl)
  const text = [
    "InstantMed ops test alert",
    "",
    `Event: ${opts.eventId}`,
    `Issued: ${opts.issuedAt}`,
    `Signature: ${opts.signature}`,
    `Source: ${appUrl}`,
  ].join("\n")

  const response = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    log.error("Telegram test alert failed", { status: response.status, body })
    throw new TelegramSendError(`Telegram test alert failed: ${response.status}`)
  }

  const responseJson = (await response.json().catch(() => null)) as {
    result?: { message_id?: unknown }
  } | null
  const rawMessageId = responseJson?.result?.message_id
  const messageId = typeof rawMessageId === "number" ? rawMessageId : undefined

  log.info("Telegram test alert sent", {
    eventId: opts.eventId,
    messageId,
  })

  return {
    sentAt: opts.issuedAt,
    messageId,
  }
}
