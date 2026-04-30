import "server-only"

import * as Sentry from "@sentry/nextjs"
import type { SupabaseClient } from "@supabase/supabase-js"

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
  | { sent: false; skipped: "not_paid" | "missing_intake" | "invalid_intake" | "already_sent_or_claimed" }

type SendPaidRequestTelegramInput = {
  supabase: Pick<SupabaseClient, "from" | "rpc">
  intakeId?: string | null
  patientId?: string | null
  patientName?: string | null
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

function formatAmount(amountCents: number | null | undefined): string {
  return `$${((amountCents ?? 0) / 100).toFixed(2)}`
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

export function resolvePaidRequestServiceName(input: {
  serviceSlug?: string | null
  category?: string | null
  subtype?: string | null
}): string {
  const serviceSlug = resolvePaidRequestServiceSlug(input)
  const category = input.category ?? ""
  const subtype = input.subtype ?? ""

  if (category === "consult" || category === "consultation" || serviceSlug === "consult") {
    const subtypeLabels: Record<string, string> = {
      ed: "ED Consultation",
      hair_loss: "Hair Loss Consultation",
      womens_health: "Women's Health Consultation",
      weight_loss: "Weight Loss Consultation",
      new_medication: "New Medication Request",
      general: "General Consultation",
    }
    return subtypeLabels[subtype] ?? "Consultation"
  }

  const slugDisplayNames: Record<string, string> = {
    "med-cert-sick": "Medical Certificate",
    "med-cert-carer": "Carers Certificate",
    "common-scripts": "Prescription",
    consult: "Consultation",
  }

  return slugDisplayNames[serviceSlug] ?? "Medical Request"
}

async function markSent(
  supabase: Pick<SupabaseClient, "from">,
  intakeId: string,
): Promise<void> {
  const { error } = await supabase
    .from("intakes")
    .update({
      paid_request_telegram_sent_at: new Date().toISOString(),
      paid_request_telegram_failed_at: null,
      paid_request_telegram_error: null,
      paid_request_telegram_claimed_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", intakeId)

  if (error) {
    log.error("Failed to mark paid request Telegram notification sent", {
      intakeId,
      error: error.message,
    })
  }
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

  try {
    await notifyNewIntakeViaTelegram({
      intakeId: input.intakeId,
      patientName: "Patient",
      serviceName: resolvePaidRequestServiceName({ serviceSlug, category, subtype }),
      amount: formatAmount(input.amountCents ?? claim.amount_cents),
      serviceSlug,
    })

    await markSent(input.supabase, input.intakeId)
    return { sent: true }
  } catch (error) {
    await markFailed(input.supabase, input.intakeId, error)
    captureRetryCapReached(input.intakeId, claim.paid_request_telegram_attempts)
    throw error
  }
}
