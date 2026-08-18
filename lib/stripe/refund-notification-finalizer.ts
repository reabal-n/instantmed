import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { reserveRefundEmail } from "@/lib/email/template-sender"
import type { StripeRefundEvidenceRow } from "@/lib/stripe/refund-event-ledger"

type FinalizedRefundEvidence = {
  amountCents: number
  cashAt: string | null
  createdAt: string
  isPriorityFeeRefund: boolean
  reversedAt: string | null
  stripeRefundId: string
}

type NotificationRecipient = {
  email: string
  patientId: string
  patientName: string
}

/**
 * Convert exact, persisted Stripe cash evidence into idempotent per-refund
 * notification reservations. Pending refunds do nothing; reversals cancel the
 * matching reservation; every operational failure is returned to the webhook
 * so the Stripe event remains replayable.
 */
export async function finalizeRefundNotifications(input: {
  evidence: StripeRefundEvidenceRow[]
  intakeId: string
  livemode: boolean
  supabase: SupabaseClient
}): Promise<{ error: string | null }> {
  const finalized = consolidateEvidence(input)
  if (finalized.error) return { error: finalized.error }

  const reversedRefundIds = finalized.refunds
    .filter((refund) => Boolean(refund.reversedAt))
    .map((refund) => refund.stripeRefundId)
    .sort()
  if (reversedRefundIds.length > 0) {
    const cancellation = await input.supabase.rpc(
      "cancel_stripe_refund_notifications",
      {
        p_intake_id: input.intakeId,
        p_refund_ids: reversedRefundIds,
      },
    )
    if (cancellation.error) {
      return {
        error: `Stripe refund notification cancellation failed: ${cancellation.error.message}`,
      }
    }
  }

  const settled = finalized.refunds
    .filter((refund) => Boolean(refund.cashAt) && !refund.reversedAt)
    .sort(compareRefunds)
  if (settled.length === 0) return { error: null }

  const recipient = await readNotificationRecipient(input.supabase, input.intakeId)
  if (recipient.error || !recipient.value) {
    return { error: recipient.error || "Refund notification recipient is missing" }
  }

  for (const refund of settled) {
    const reservation = await reserveRefundEmail({
      amountCents: refund.amountCents,
      intakeId: input.intakeId,
      livemode: input.livemode,
      patientId: recipient.value.patientId,
      patientName: recipient.value.patientName,
      refundReason: refund.isPriorityFeeRefund
        ? "Priority review fee refunded"
        : "Refund processed",
      stripeRefundId: refund.stripeRefundId,
      to: recipient.value.email,
    })
    if (!reservation.success) {
      return {
        error: reservation.error || "Refund notification reservation failed",
      }
    }
  }

  return { error: null }
}

function consolidateEvidence(input: {
  evidence: StripeRefundEvidenceRow[]
  intakeId: string
  livemode: boolean
}): { error: string | null; refunds: FinalizedRefundEvidence[] } {
  const refunds = new Map<string, FinalizedRefundEvidence>()

  for (const row of input.evidence) {
    if (row.intake_id && row.intake_id !== input.intakeId) {
      return {
        error: "Stripe refund notification evidence conflicts with the intake",
        refunds: [],
      }
    }
    if (row.livemode !== input.livemode) {
      return {
        error: "Stripe refund notification evidence conflicts with Stripe mode",
        refunds: [],
      }
    }
    if (
      !row.stripe_refund_id ||
      !Number.isInteger(row.amount_cents) ||
      row.amount_cents <= 0 ||
      row.currency.toLowerCase() !== "aud"
    ) {
      return {
        error: "Stripe refund notification evidence is incomplete",
        refunds: [],
      }
    }
    if (row.refund_reversed_at && !row.refund_cash_at) {
      return {
        error: "Stripe refund reversal is missing prior cash evidence",
        refunds: [],
      }
    }

    const current = refunds.get(row.stripe_refund_id)
    if (!current) {
      refunds.set(row.stripe_refund_id, {
        amountCents: row.amount_cents,
        cashAt: row.refund_cash_at,
        createdAt: row.refund_created_at,
        isPriorityFeeRefund: row.is_priority_fee_refund,
        reversedAt: row.refund_reversed_at,
        stripeRefundId: row.stripe_refund_id,
      })
      continue
    }

    if (
      current.amountCents !== row.amount_cents ||
      current.isPriorityFeeRefund !== row.is_priority_fee_refund ||
      !sameNullableTimestamp(current.createdAt, row.refund_created_at)
    ) {
      return {
        error: "Stripe refund notification evidence conflicts across observations",
        refunds: [],
      }
    }

    const cashAt = mergeTimestamp(current.cashAt, row.refund_cash_at)
    const reversedAt = mergeTimestamp(current.reversedAt, row.refund_reversed_at)
    if (cashAt.conflict || reversedAt.conflict) {
      return {
        error: "Stripe refund notification lifecycle evidence conflicts across observations",
        refunds: [],
      }
    }
    current.cashAt = cashAt.value
    current.reversedAt = reversedAt.value
  }

  return { error: null, refunds: [...refunds.values()] }
}

async function readNotificationRecipient(
  supabase: SupabaseClient,
  intakeId: string,
): Promise<
  | { error: null; value: NotificationRecipient }
  | { error: string; value: null }
> {
  const intakeRead = await supabase
    .from("intakes")
    .select("id, patient_id")
    .eq("id", intakeId)
    .single()
  if (intakeRead.error) {
    return {
      error: `Refund notification intake lookup failed: ${intakeRead.error.message}`,
      value: null,
    }
  }
  const patientId = normalizedString(intakeRead.data?.patient_id)
  if (!patientId) {
    return { error: "Refund notification patient recipient is missing", value: null }
  }

  const patientRead = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("id", patientId)
    .single()
  if (patientRead.error) {
    return {
      error: `Refund notification patient lookup failed: ${patientRead.error.message}`,
      value: null,
    }
  }
  const email = normalizedString(patientRead.data?.email)
  if (!patientRead.data?.id || !email) {
    return { error: "Refund notification recipient email is missing", value: null }
  }

  return {
    error: null,
    value: {
      email,
      patientId: patientRead.data.id,
      patientName: greetingFirstName(patientRead.data.full_name),
    },
  }
}

function compareRefunds(
  left: FinalizedRefundEvidence,
  right: FinalizedRefundEvidence,
): number {
  const leftAt = Date.parse(left.cashAt ?? left.createdAt)
  const rightAt = Date.parse(right.cashAt ?? right.createdAt)
  if (leftAt !== rightAt) return leftAt - rightAt
  return left.stripeRefundId.localeCompare(right.stripeRefundId)
}

function mergeTimestamp(
  current: string | null,
  incoming: string | null,
): { conflict: boolean; value: string | null } {
  if (!current) return { conflict: false, value: incoming }
  if (!incoming) return { conflict: false, value: current }
  return sameNullableTimestamp(current, incoming)
    ? { conflict: false, value: current }
    : { conflict: true, value: null }
}

function sameNullableTimestamp(
  left: string | null,
  right: string | null,
): boolean {
  if (left === null || right === null) return left === right
  return Date.parse(left) === Date.parse(right)
}

function greetingFirstName(name: string | null | undefined): string {
  const first = normalizedString(name)?.split(/\s+/)[0]
  if (!first) return "there"
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase()
}

function normalizedString(value: unknown): string | null {
  if (typeof value !== "string") return null
  const normalized = value.trim()
  return normalized || null
}
