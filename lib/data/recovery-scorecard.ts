import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { classifyAttributionSource } from "@/lib/analytics/source-classification"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const RECOVERY_EMAIL_TYPES = ["partial_intake_recovery", "abandoned_checkout", "abandoned_checkout_followup"] as const
const RECOVERED_PAYMENT_STATUSES = ["paid", "partially_refunded", "refunded"] as const

type PartialIntakeRecoveryRow = {
  converted_to_intake_id: string | null
  email: string | null
  recovery_email_sent_at: string | null
  service_type: string | null
}

type RecoveryEmailRow = {
  delivery_status: string | null
  email_type: string | null
  status: string | null
}

type RecoveredPaidRow = {
  amount_cents: number | null
  refund_amount_cents: number | null
}

type RecoveredPaidAttributionRow = RecoveredPaidRow & {
  referrer?: string | null
  utm_campaign?: string | null
  utm_medium?: string | null
  utm_source?: string | null
}

export type RecoveryScorecard = {
  abandonedCheckoutSent: number
  captured: number
  converted: number
  emailCaptureRate: number | null
  emailCaptured: number
  emailClickCount: number
  emailOpenCount: number
  emailed: number
  partialRecoverySent: number
  recoveredGrossRevenueCents: number
  recoveredNetRevenueCents: number
  recoveredPaidCount: number
  recoveredRefundedCents: number
  recoveryEmailCoverageRate: number | null
  windowDays: number
}

export type RecoveryScorecardInput = {
  abandonedCheckoutEmailRows: RecoveryEmailRow[]
  partialIntakeRows: PartialIntakeRecoveryRow[]
  recoveredPaidRows: RecoveredPaidRow[]
  windowDays?: number
}

function roundRate(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null
  return Math.round((numerator / denominator) * 1000) / 10
}

function isAcceptedEmail(row: RecoveryEmailRow): boolean {
  return row.status === "sent" || row.status === "skipped_e2e"
}

function isOpenedEmail(row: RecoveryEmailRow): boolean {
  return row.delivery_status === "opened" || row.delivery_status === "clicked"
}

function isClickedEmail(row: RecoveryEmailRow): boolean {
  return row.delivery_status === "clicked"
}

export function buildRecoveryScorecard({
  abandonedCheckoutEmailRows,
  partialIntakeRows,
  recoveredPaidRows,
  windowDays = 30,
}: RecoveryScorecardInput): RecoveryScorecard {
  const emailCaptured = partialIntakeRows.filter((row) => Boolean(row.email)).length
  const emailed = partialIntakeRows.filter((row) => Boolean(row.recovery_email_sent_at)).length
  const converted = partialIntakeRows.filter((row) => Boolean(row.converted_to_intake_id)).length
  const acceptedRecoveryEmails = abandonedCheckoutEmailRows.filter(isAcceptedEmail)
  const recoveredGrossRevenueCents = recoveredPaidRows.reduce((sum, row) => sum + Number(row.amount_cents ?? 0), 0)
  const recoveredRefundedCents = recoveredPaidRows.reduce((sum, row) => sum + Number(row.refund_amount_cents ?? 0), 0)

  return {
    abandonedCheckoutSent: acceptedRecoveryEmails.filter((row) => row.email_type !== "partial_intake_recovery").length,
    captured: partialIntakeRows.length,
    converted,
    emailCaptureRate: roundRate(emailCaptured, partialIntakeRows.length),
    emailCaptured,
    emailClickCount: abandonedCheckoutEmailRows.filter(isClickedEmail).length,
    emailOpenCount: abandonedCheckoutEmailRows.filter(isOpenedEmail).length,
    emailed,
    partialRecoverySent: acceptedRecoveryEmails.filter((row) => row.email_type === "partial_intake_recovery").length,
    recoveredGrossRevenueCents,
    recoveredNetRevenueCents: recoveredGrossRevenueCents - recoveredRefundedCents,
    recoveredPaidCount: recoveredPaidRows.length,
    recoveredRefundedCents,
    recoveryEmailCoverageRate: roundRate(emailed, emailCaptured),
    windowDays,
  }
}

function isRecoveryAttributed(row: RecoveredPaidAttributionRow): boolean {
  return classifyAttributionSource(row).group === "recovery_email"
}

export async function getRecoveryScorecard(
  supabase: SupabaseClient = createServiceRoleClient(),
  now = new Date(),
  windowDays = 30,
): Promise<RecoveryScorecard> {
  const since = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000).toISOString()

  const [partialRows, recoveryEmails, recoveredPaid] = await Promise.all([
    supabase
      .from("partial_intakes")
      .select("service_type, email, recovery_email_sent_at, converted_to_intake_id, updated_at")
      .gte("updated_at", since),
    supabase
      .from("email_outbox")
      .select("email_type, status, delivery_status, created_at")
      .in("email_type", [...RECOVERY_EMAIL_TYPES])
      .gte("created_at", since),
    supabase
      .from("intakes")
      .select("amount_cents, refund_amount_cents, payment_status, paid_at, utm_source, utm_medium, utm_campaign, referrer")
      .in("payment_status", [...RECOVERED_PAYMENT_STATUSES])
      .not("paid_at", "is", null)
      .gte("paid_at", since),
  ])

  if (partialRows.error) throw new Error(`Recovery partial-intake query failed: ${partialRows.error.message}`)
  if (recoveryEmails.error) throw new Error(`Recovery email query failed: ${recoveryEmails.error.message}`)
  if (recoveredPaid.error) throw new Error(`Recovery paid-order query failed: ${recoveredPaid.error.message}`)

  return buildRecoveryScorecard({
    abandonedCheckoutEmailRows: (recoveryEmails.data ?? []) as RecoveryEmailRow[],
    partialIntakeRows: (partialRows.data ?? []) as PartialIntakeRecoveryRow[],
    recoveredPaidRows: ((recoveredPaid.data ?? []) as RecoveredPaidAttributionRow[]).filter(isRecoveryAttributed),
    windowDays,
  })
}
