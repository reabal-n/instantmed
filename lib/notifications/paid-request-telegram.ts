import "server-only"

import * as Sentry from "@sentry/nextjs"
import type { SupabaseClient } from "@supabase/supabase-js"

import { getIntakeAnswers } from "@/lib/data/intake-answers"
import {
  isLikelyTestPatientIdentity,
  SEEDED_E2E_PATIENT_PROFILE_ID,
} from "@/lib/data/seeded-e2e-data"
import { getFeatureFlags } from "@/lib/feature-flags"
import { createLogger } from "@/lib/observability/logger"

import { notifyNewIntakeViaTelegram } from "./telegram"

const log = createLogger("paid-request-telegram")

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MAX_ERROR_LENGTH = 1000
const PAID_REQUEST_TELEGRAM_RETRY_CAP = 6

type PaidRequestTelegramNotificationInput = {
  intakeId?: string | null
  paymentStatus?: string | null
  amountTotal?: number | null
}

type ClaimRow = {
  id: string
  patient_id: string | null
  amount_cents: number | null
  category: string | null
  subtype: string | null
  paid_request_telegram_attempts: number | null
}

export type PaidRequestTelegramResult =
  | { sent: true }
  | { sent: false; skipped: "not_paid" | "missing_intake" | "invalid_intake" | "disabled" | "already_sent_or_claimed" | "e2e" }

type SendPaidRequestTelegramInput = {
  supabase: Pick<SupabaseClient, "from" | "rpc">
  intakeId?: string | null
  patientId?: string | null
  paymentStatus?: string | null
  amountCents?: number | null
  serviceSlug?: string | null
  category?: string | null
  subtype?: string | null
}

export function shouldSendPaidRequestTelegramNotification(input: PaidRequestTelegramNotificationInput): boolean {
  return Boolean(input.intakeId && input.paymentStatus === "paid")
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message.slice(0, MAX_ERROR_LENGTH)
  return String(error).slice(0, MAX_ERROR_LENGTH)
}

export function resolvePaidRequestServiceSlug(input: {
  serviceSlug?: string | null
  category?: string | null
  subtype?: string | null
}): string {
  if (input.serviceSlug) return input.serviceSlug

  if (input.category === "med_certs" || input.category === "medical_certificate") {
    return input.subtype === "carer" ? "med-cert-carer" : "med-cert-sick"
  }

  if (input.category === "prescription" || input.category === "common_scripts") {
    return "common-scripts"
  }

  if (input.category === "consult" || input.category === "consultation") {
    return "consult"
  }

  return ""
}

export function resolvePaidRequestServiceDetail(input: {
  category?: string | null
  subtype?: string | null
  answers?: Record<string, unknown> | null
}): string | null {
  const { category, answers } = input
  if (!answers) return null

  if (category === "med_certs" || category === "medical_certificate") {
    const raw = answers.duration
    const days = typeof raw === "string" ? raw : typeof raw === "number" ? String(raw) : null
    if (!days) return null
    const trimmed = days.trim()
    if (!/^[1-3]$/.test(trimmed)) return null
    return `${trimmed} day${trimmed === "1" ? "" : "s"}`
  }

  if (category === "prescription" || category === "common_scripts") {
    const name = typeof answers.medicationName === "string" ? answers.medicationName.trim() : ""
    if (!name) return null
    // Truncate to keep the Telegram one-liner readable.
    return name.length > 40 ? `${name.slice(0, 39)}…` : name
  }

  return null
}

async function markSent(
  supabase: Pick<SupabaseClient, "from">,
  intakeId: string,
  messageId: number | null,
): Promise<void> {
  const now = new Date().toISOString()
  const { error } = await supabase
    .from("intakes")
    .update({
      paid_request_telegram_sent_at: now,
      paid_request_telegram_failed_at: null,
      paid_request_telegram_error: null,
      paid_request_telegram_claimed_at: null,
      paid_request_telegram_message_id: messageId,
      updated_at: now,
    })
    .eq("id", intakeId)

  if (!error) return

  // Telegram was already sent. Retry with a minimal update that only sets
  // sent_at — the critical field the cron filter checks. A partial write is
  // better than silence: without sent_at the stale-claim window will expire
  // and the cron will send a duplicate notification.
  log.warn("markSent failed, retrying with minimal sent_at update to prevent duplicate", {
    intakeId,
    error: error.message,
  })
  const { error: retryError } = await supabase
    .from("intakes")
    .update({ paid_request_telegram_sent_at: now, paid_request_telegram_claimed_at: null, updated_at: now })
    .eq("id", intakeId)

  if (retryError) {
    log.error("markSent retry also failed — duplicate notification risk exists", {
      intakeId,
      originalError: error.message,
      retryError: retryError.message,
    })
    throw retryError
  }

  // Retry succeeded: sent_at is now set. Best-effort: save message_id too.
  void supabase
    .from("intakes")
    .update({ paid_request_telegram_message_id: messageId })
    .eq("id", intakeId)
}

function captureRetryCapReached(intakeId: string, attempts: number | null | undefined) {
  if ((attempts ?? 0) < PAID_REQUEST_TELEGRAM_RETRY_CAP) return

  Sentry.captureMessage("Paid request Telegram notification retry cap reached", {
    level: "error",
    tags: { source: "paid-request-telegram" },
    extra: { intakeId, attempts },
  })
}

async function markFailed(
  supabase: Pick<SupabaseClient, "from">,
  intakeId: string,
  error: unknown,
): Promise<void> {
  const message = getErrorMessage(error)
  const { error: updateError } = await supabase
    .from("intakes")
    .update({
      paid_request_telegram_failed_at: new Date().toISOString(),
      paid_request_telegram_error: message,
      paid_request_telegram_claimed_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", intakeId)

  if (updateError) {
    log.error("Failed to mark paid request Telegram notification failed", {
      intakeId,
      originalError: message,
      error: updateError.message,
    })
  }
}

export async function sendPaidRequestTelegramNotification(
  input: SendPaidRequestTelegramInput,
): Promise<PaidRequestTelegramResult> {
  if (input.paymentStatus !== "paid") {
    return { sent: false, skipped: "not_paid" }
  }

  if (!input.intakeId) {
    return { sent: false, skipped: "missing_intake" }
  }

  if (!UUID_RE.test(input.intakeId)) {
    return { sent: false, skipped: "invalid_intake" }
  }

  // Seeded E2E intakes never page the operator — no claim row, no Telegram.
  if (input.patientId === SEEDED_E2E_PATIENT_PROFILE_ID) {
    return { sent: false, skipped: "e2e" }
  }

  // An E2E-mode server (local Playwright with a real .env.local, CI) must
  // never page the operator's phone in real time, even though it points at
  // the shared prod Supabase + Telegram env. Deliberately narrower than
  // shouldIncludeSeededE2EData: NODE_ENV=test (vitest) still exercises the
  // real send path in unit tests.
  if (
    process.env.PLAYWRIGHT === "1" ||
    process.env.E2E === "true" ||
    process.env.E2E_MODE === "true"
  ) {
    return { sent: false, skipped: "e2e" }
  }

  const flags = await getFeatureFlags()
  if (!flags.telegram_notifications_enabled) {
    return { sent: false, skipped: "disabled" }
  }
  const autoApproveFlagOn = Boolean(flags.ai_auto_approve_enabled)

  const now = new Date()
  const staleClaimBefore = new Date(now.getTime() - 5 * 60 * 1000)
  const { data, error } = await input.supabase.rpc("claim_paid_request_telegram_notification", {
    p_intake_id: input.intakeId,
    p_claimed_at: now.toISOString(),
    p_stale_claim_before: staleClaimBefore.toISOString(),
  })

  if (error) {
    log.error("Failed to claim paid request Telegram notification", {
      intakeId: input.intakeId,
      error: error.message,
    })
    throw error
  }

  const claim = (Array.isArray(data) ? data[0] : data) as ClaimRow | null | undefined
  if (!claim) {
    return { sent: false, skipped: "already_sent_or_claimed" }
  }

  const category = input.category ?? claim.category
  const subtype = input.subtype ?? claim.subtype
  const serviceSlug = resolvePaidRequestServiceSlug({
    serviceSlug: input.serviceSlug,
    category,
    subtype,
  })

  // Fail-soft enrichment lookups: never abort the notification if these fail.
  // guest_email rides along on the same intake read (no profiles/PHI fetch)
  // purely to classify machine-generated test orders below.
  let isPriority = false
  let guestEmail: string | null = null
  try {
    const { data: intakeExtras } = await input.supabase
      .from("intakes")
      .select("is_priority, guest_email")
      .eq("id", input.intakeId)
      .maybeSingle()
    const extras = intakeExtras as { is_priority?: boolean; guest_email?: string | null } | null
    isPriority = Boolean(extras?.is_priority)
    guestEmail = extras?.guest_email ?? null
  } catch (extrasError) {
    log.error("Failed to look up is_priority for Telegram notification", {
      intakeId: input.intakeId,
      error: getErrorMessage(extrasError),
    })
  }

  let answers: Record<string, unknown> | null = null
  try {
    answers = await getIntakeAnswers(input.intakeId)
  } catch (answersError) {
    log.error("Failed to load intake answers for Telegram notification detail", {
      intakeId: input.intakeId,
      error: getErrorMessage(answersError),
    })
  }

  const detail = resolvePaidRequestServiceDetail({ category, subtype, answers })

  // Test-order guard AFTER claiming. E2E/CI runs create paid intakes as FRESH
  // guest profiles with machine-shaped emails (@example.com,
  // @instantmed-e2e.test, browser-<ts>@instantmed.com.au, ...) — the seeded-ID
  // check can't see them, and the CI server often can't send Telegram, so the
  // PROD telegram-notifications cron later retried these rows and paged the
  // operator with fake "New med cert" orders (2026-07-02). Classify them from
  // the intake's own guest_email (no profiles fetch — this path deliberately
  // never reads patient PHI) and mark them SENT (null message id) so the cron
  // stops re-claiming them forever.
  const isTestOrder =
    claim.patient_id === SEEDED_E2E_PATIENT_PROFILE_ID ||
    isLikelyTestPatientIdentity({ email: guestEmail })

  if (isTestOrder) {
    log.info("Skipping paid-request Telegram for test order", { intakeId: input.intakeId })
    await markSent(input.supabase, input.intakeId, null)
    return { sent: false, skipped: "e2e" }
  }

  const isMedCert = serviceSlug.startsWith("med-cert")
  const autoApprovalCandidate = autoApproveFlagOn && isMedCert

  // Track whether the external Telegram call succeeded so the catch block
  // can distinguish "Telegram failed → allow cron retry" from "Telegram
  // sent but DB write failed → do NOT allow cron retry via markFailed".
  let telegramSent = false
  try {
    const sendResult = await notifyNewIntakeViaTelegram({
      intakeId: input.intakeId,
      serviceSlug,
      subtype: subtype ?? undefined,
      serviceDetail: detail ?? undefined,
      isPriority,
      autoApprovalCandidate,
    })
    telegramSent = true

    await markSent(input.supabase, input.intakeId, sendResult.messageId)
    return { sent: true }
  } catch (error) {
    if (telegramSent) {
      // Telegram sent successfully but markSent threw (after both the main
      // attempt and the retry inside markSent failed). The message is already
      // delivered. Do NOT call markFailed — that would clear the claim and
      // allow the cron to reclaim and send a duplicate. Just re-throw so the
      // caller knows the DB is in a bad state; the stale claim window will
      // expire harmlessly since sent_at may not be set.
      log.error("markSent threw after successful Telegram send — not calling markFailed to prevent duplicate", {
        intakeId: input.intakeId,
        error: getErrorMessage(error),
      })
      throw error
    }
    await markFailed(input.supabase, input.intakeId, error)
    captureRetryCapReached(input.intakeId, claim.paid_request_telegram_attempts)
    throw error
  }
}
