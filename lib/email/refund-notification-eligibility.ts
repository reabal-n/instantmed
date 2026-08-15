import { createServiceRoleClient } from "@/lib/supabase/service-role"

import type { OutboxRow } from "./send/types"

export type RefundNotificationEligibility =
  | { allowed: true }
  | { allowed: false; reason: string; retryable: boolean }

/**
 * Re-check exact Stripe cash immediately before a refund notice reaches the
 * provider. The outbox metadata is only an identity hint; the consistent,
 * unreversed cash-movement view remains the authority.
 */
export async function evaluateRefundNotificationEligibility(
  row: OutboxRow,
): Promise<RefundNotificationEligibility> {
  if (row.email_type !== "refund-processed") return { allowed: true }

  const refundId = row.metadata?.stripe_refund_id
  const amountCents = Number(row.metadata?.refund_amount_cents)
  const livemode = row.metadata?.refund_livemode
  if (
    !row.intake_id ||
    typeof refundId !== "string" ||
    !refundId ||
    !Number.isInteger(amountCents) ||
    amountCents <= 0 ||
    typeof livemode !== "boolean"
  ) {
    return {
      allowed: false,
      reason: "Refund notification is missing exact Stripe cash identity",
      retryable: false,
    }
  }

  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from("stripe_refund_cash_movements")
    .select("stripe_refund_id, intake_id, amount_cents, refund_reversed_at")
    .eq("stripe_refund_id", refundId)
    .eq("intake_id", row.intake_id)
    .eq("livemode", livemode)
    .eq("currency", "aud")
    .maybeSingle()

  if (error) {
    return {
      allowed: false,
      reason: `Exact refund notification eligibility lookup failed: ${error.message}`,
      retryable: true,
    }
  }
  if (
    !data ||
    data.stripe_refund_id !== refundId ||
    data.intake_id !== row.intake_id ||
    data.amount_cents !== amountCents ||
    data.refund_reversed_at !== null
  ) {
    return {
      allowed: false,
      reason: "Exact Stripe refund cash is absent, reversed, or inconsistent",
      retryable: false,
    }
  }

  return { allowed: true }
}
