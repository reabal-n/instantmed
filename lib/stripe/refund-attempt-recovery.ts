import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import type Stripe from "stripe"

const STRIPE_REFUND_SAFE_REPLAY_WINDOW_MS = 20 * 60 * 60 * 1_000

export type ClaimedStripeRefundAttempt = {
  attempt_id: string
  created_at: string
  idempotency_key: string
  intake_id: string
  lease_token: string
  livemode: boolean
  payment_intent_id: string
  refund_type: string
  requested_amount_cents: number
  state:
    | "reserved"
    | "submitted"
    | "unknown_outcome"
    | "succeeded"
    | "failed"
    | "canceled"
  stripe_refund_id: string | null
}

type RefundRecoveryStripe = Pick<Stripe, "refunds">

type RecoveryResult = {
  error: string | null
  refund: Stripe.Refund | null
  status: "manual_review" | "observed" | "resubmitted" | "retryable"
}

export async function recoverStripeRefundAttempt(
  deps: {
    stripe: RefundRecoveryStripe
    supabase: Pick<SupabaseClient, "rpc">
  },
  input: {
    attempt: ClaimedStripeRefundAttempt
    nowMs?: number
  },
): Promise<RecoveryResult> {
  const nowMs = input.nowMs ?? Date.now()
  const attempt = input.attempt

  if (attempt.stripe_refund_id) {
    try {
      const observed = await deps.stripe.refunds.retrieve(
        attempt.stripe_refund_id,
        { expand: ["balance_transaction", "failure_balance_transaction"] },
      )
      const identityError = refundIdentityError(observed, attempt)
      if (identityError) {
        return failUnknown(
          deps.supabase,
          attempt,
          identityError,
          "manual_review",
        )
      }
      return { error: null, refund: observed, status: "observed" }
    } catch (error) {
      return failUnknown(
        deps.supabase,
        attempt,
        "Stripe refund lookup failed during durable recovery",
        isMissingStripeRefundError(error) ? "manual_review" : "retryable",
      )
    }
  }

  let matches: Stripe.Refund[]
  try {
    const listed = await deps.stripe.refunds.list({
      expand: ["data.balance_transaction", "data.failure_balance_transaction"],
      limit: 100,
      payment_intent: attempt.payment_intent_id,
    })
    if (listed.has_more) {
      return failUnknown(
        deps.supabase,
        attempt,
        "Stripe refund recovery exceeded the bounded PaymentIntent read",
        "manual_review",
      )
    }
    matches = listed.data.filter(
      (refund) => refund.metadata?.refund_attempt_id === attempt.attempt_id,
    )
  } catch {
    return failUnknown(
      deps.supabase,
      attempt,
      "Stripe refund list failed during durable recovery",
    )
  }

  if (matches.length > 1) {
    return failUnknown(
      deps.supabase,
      attempt,
      "Multiple Stripe refunds match one durable refund attempt",
      "manual_review",
    )
  }

  if (matches.length === 1) {
    const observed = matches[0]!
    const identityError = refundIdentityError(observed, attempt)
    if (identityError) {
      return failUnknown(
        deps.supabase,
        attempt,
        identityError,
        "manual_review",
      )
    }
    const bindingError = await bindObservedRefund(deps.supabase, attempt, observed)
    return {
      error: bindingError,
      refund: observed,
      status: "observed",
    }
  }

  const createdAtMs = Date.parse(attempt.created_at)
  if (
    !Number.isFinite(createdAtMs) ||
    nowMs < createdAtMs ||
    nowMs - createdAtMs >= STRIPE_REFUND_SAFE_REPLAY_WINDOW_MS
  ) {
    return failUnknown(
      deps.supabase,
      attempt,
      "Stripe refund outcome remains unknown beyond the safe replay window",
      "manual_review",
    )
  }

  let created: Stripe.Refund
  try {
    created = await deps.stripe.refunds.create(
      canonicalRefundParameters(attempt),
      { idempotencyKey: attempt.idempotency_key },
    )
  } catch {
    return failUnknown(
      deps.supabase,
      attempt,
      "Stripe refund replay returned an unknown outcome",
    )
  }

  const identityError = refundIdentityError(created, attempt)
  if (identityError) {
    return failUnknown(
      deps.supabase,
      attempt,
      identityError,
      "manual_review",
    )
  }

  const completion = await deps.supabase.rpc("complete_stripe_refund_attempt", {
    p_attempt_id: attempt.attempt_id,
    p_lease_token: attempt.lease_token,
    p_stripe_refund_id: created.id,
    p_stripe_status: created.status ?? null,
  })
  return {
    error: completion.error
      ? `Stripe refund attempt completion failed: ${completion.error.message}`
      : null,
    refund: created,
    status: "resubmitted",
  }
}

function canonicalRefundParameters(
  attempt: ClaimedStripeRefundAttempt,
): Stripe.RefundCreateParams {
  return {
    amount: attempt.requested_amount_cents,
    expand: ["balance_transaction", "failure_balance_transaction"],
    metadata: {
      intake_id: attempt.intake_id,
      refund_attempt_id: attempt.attempt_id,
      refund_type: attempt.refund_type,
    },
    payment_intent: attempt.payment_intent_id,
    reason: "requested_by_customer",
  }
}

function refundIdentityError(
  refund: Stripe.Refund,
  attempt: ClaimedStripeRefundAttempt,
): string | null {
  const paymentIntentId = stripeId(refund.payment_intent)
  if (
    refund.amount !== attempt.requested_amount_cents ||
    paymentIntentId !== attempt.payment_intent_id ||
    refund.metadata?.refund_attempt_id !== attempt.attempt_id ||
    refund.metadata?.intake_id !== attempt.intake_id ||
    refund.metadata?.refund_type !== attempt.refund_type
  ) {
    return "Stripe refund identity conflicts with the durable refund attempt"
  }
  return null
}

async function bindObservedRefund(
  supabase: Pick<SupabaseClient, "rpc">,
  attempt: ClaimedStripeRefundAttempt,
  refund: Stripe.Refund,
): Promise<string | null> {
  const binding = await supabase.rpc("bind_stripe_refund_attempt_from_webhook", {
    p_amount_cents: refund.amount,
    p_attempt_id: attempt.attempt_id,
    p_intake_id: attempt.intake_id,
    p_livemode: attempt.livemode,
    p_payment_intent_id: attempt.payment_intent_id,
    p_refund_type: attempt.refund_type,
    p_stripe_refund_id: refund.id,
    p_stripe_status: refund.status ?? null,
  })
  if (binding.error) {
    return `Stripe refund attempt binding failed: ${binding.error.message}`
  }
  return binding.data === true
    ? null
    : "Stripe refund attempt binding returned incomplete evidence"
}

async function failUnknown(
  supabase: Pick<SupabaseClient, "rpc">,
  attempt: ClaimedStripeRefundAttempt,
  message: string,
  status: RecoveryResult["status"] = "retryable",
): Promise<RecoveryResult> {
  const completion = await supabase.rpc("complete_stripe_refund_attempt_error", {
    p_attempt_id: attempt.attempt_id,
    p_error: message,
    p_lease_token: attempt.lease_token,
    p_outcome: status === "manual_review" ? "manual_review" : "unknown_outcome",
  })
  const completionError = completion.error
    ? `durable attempt update failed: ${completion.error.message}`
    : completion.data === true
      ? null
      : "durable attempt update returned incomplete evidence"
  return {
    error: completionError ? `${message}; ${completionError}` : message,
    refund: null,
    status: completionError ? "retryable" : status,
  }
}

function isMissingStripeRefundError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false
  const candidate = error as {
    code?: unknown
    raw?: { code?: unknown; statusCode?: unknown }
    statusCode?: unknown
  }
  return candidate.code === "resource_missing" ||
    candidate.raw?.code === "resource_missing" ||
    candidate.statusCode === 404 ||
    candidate.raw?.statusCode === 404
}

function stripeId(
  value: string | { id: string } | null,
): string | null {
  return typeof value === "string" ? value : value?.id ?? null
}
