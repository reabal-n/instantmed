import "server-only"

import * as Sentry from "@sentry/nextjs"
import type { SupabaseClient } from "@supabase/supabase-js"
import type Stripe from "stripe"

import { getStripeLivemode } from "@/lib/config/env"
import { createLogger } from "@/lib/observability/logger"

const log = createLogger("stripe-refund-attempts")

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type StripeRefundAttemptType =
  | "admin_manual"
  | "decline"
  | "priority_breach"
  | "standalone"
  | "standalone_topup"

type StripeRefundStatus = NonNullable<Stripe.Refund["status"]>

export type StripeRefundAttemptRequest = {
  actorProfileId?: string | null
  intakeId: string
  paymentIntentId: string
  refundType: StripeRefundAttemptType
  targetTotalCents: number
}

export type StripeRefundAttemptResult =
  | {
      amountCents: number
      attemptId: string
      refundId: string
      status: "submitted"
      stripeStatus: StripeRefundStatus
    }
  | {
      amountCents: number
      attemptId: string
      error: string
      refundId?: string
      status: "unknown_outcome"
    }
  | {
      amountCents: number
      attemptId: string
      refundId?: undefined
      status: "active"
    }
  | {
      amountCents: 0
      status: "cash_satisfied"
    }
  | {
      error: string
      status: "failed"
    }

type RefundAttemptReservation = {
  attemptId: string
  idempotencyKey: string
  leaseToken: string
  requestedAmountCents: number
}

type RefundAttemptReservationOutcome =
  | { kind: "active"; amountCents: number; attemptId: string }
  | { kind: "cash_satisfied" }
  | { kind: "reserved"; reservation: RefundAttemptReservation }

type RefundAttemptDependencies = {
  stripe: { refunds: Pick<Stripe["refunds"], "create"> }
  supabase: Pick<SupabaseClient, "rpc">
}

/**
 * Reserve a refund generation before contacting Stripe, then bind Stripe's
 * response to that exact attempt with an attempt-and-lease compare-and-set.
 *
 * This function deliberately never writes intake/payment aggregate state.
 * Exact Stripe balance evidence and the reconciliation RPC own those mirrors.
 */
export async function requestStripeRefund(
  deps: RefundAttemptDependencies,
  request: StripeRefundAttemptRequest,
): Promise<StripeRefundAttemptResult> {
  const requestError = validateRequest(request)
  if (requestError) {
    return { error: requestError, status: "failed" }
  }

  let livemode: boolean
  try {
    livemode = getStripeLivemode()
  } catch (error) {
    captureAttemptFailure("stripe_mode_unavailable", request.intakeId, error)
    return { error: "refund_attempt_reservation_failed", status: "failed" }
  }

  let reservationResponse: Awaited<ReturnType<SupabaseClient["rpc"]>>
  try {
    reservationResponse = await deps.supabase.rpc(
      "reserve_stripe_refund_attempt",
      {
        p_actor_profile_id: request.actorProfileId ?? null,
        p_intake_id: request.intakeId,
        p_livemode: livemode,
        p_payment_intent_id: request.paymentIntentId,
        p_refund_type: request.refundType,
        p_target_total_cents: request.targetTotalCents,
      },
    )
  } catch (error) {
    captureAttemptFailure("reservation_rpc_threw", request.intakeId, error)
    return { error: "refund_attempt_reservation_failed", status: "failed" }
  }

  if (reservationResponse.error) {
    captureAttemptFailure(
      "reservation_rpc_failed",
      request.intakeId,
      reservationResponse.error,
    )
    return {
      error: safeReservationError(reservationResponse.error.message),
      status: "failed",
    }
  }

  const reservationOutcome = parseReservationOutcome(
    reservationResponse.data,
    request.targetTotalCents,
  )
  if (!reservationOutcome) {
    captureAttemptFailure(
      "reservation_evidence_invalid",
      request.intakeId,
      new Error("Refund reservation returned incomplete or conflicting evidence"),
    )
    return { error: "refund_attempt_not_reserved", status: "failed" }
  }

  if (reservationOutcome.kind === "active") {
    return {
      amountCents: reservationOutcome.amountCents,
      attemptId: reservationOutcome.attemptId,
      status: "active",
    }
  }
  if (reservationOutcome.kind === "cash_satisfied") {
    return { amountCents: 0, status: "cash_satisfied" }
  }

  const reservation = reservationOutcome.reservation

  let refund: Stripe.Refund
  try {
    refund = await deps.stripe.refunds.create(
      {
        amount: reservation.requestedAmountCents,
        metadata: {
          intake_id: request.intakeId,
          refund_attempt_id: reservation.attemptId,
          refund_type: request.refundType,
        },
        payment_intent: request.paymentIntentId,
        reason: "requested_by_customer",
      },
      { idempotencyKey: reservation.idempotencyKey },
    )
  } catch (error) {
    await markAttemptUnknown({
      deps,
      errorCode: "stripe_refund_create_threw",
      externalError: error,
      intakeId: request.intakeId,
      reservation,
    })
    return {
      amountCents: reservation.requestedAmountCents,
      attemptId: reservation.attemptId,
      error: "stripe_refund_outcome_unknown",
      status: "unknown_outcome",
    }
  }

  if (!isValidStripeResponse(refund, request, reservation)) {
    await markAttemptUnknown({
      deps,
      errorCode: "stripe_refund_response_invalid",
      externalError: new Error("Stripe returned incomplete refund evidence"),
      intakeId: request.intakeId,
      reservation,
    })
    return {
      amountCents: reservation.requestedAmountCents,
      attemptId: reservation.attemptId,
      error: "stripe_refund_outcome_unknown",
      refundId: typeof refund.id === "string" && refund.id ? refund.id : undefined,
      status: "unknown_outcome",
    }
  }

  let completionResponse: Awaited<ReturnType<SupabaseClient["rpc"]>>
  try {
    completionResponse = await deps.supabase.rpc(
      "complete_stripe_refund_attempt",
      {
        p_attempt_id: reservation.attemptId,
        p_lease_token: reservation.leaseToken,
        p_stripe_refund_id: refund.id,
        p_stripe_status: refund.status,
      },
    )
  } catch (error) {
    await markAttemptUnknown({
      deps,
      errorCode: "refund_attempt_completion_threw",
      externalError: error,
      intakeId: request.intakeId,
      reservation,
    })
    return {
      amountCents: reservation.requestedAmountCents,
      attemptId: reservation.attemptId,
      error: "stripe_refund_completion_unknown",
      refundId: refund.id,
      status: "unknown_outcome",
    }
  }

  if (completionResponse.error || typeof completionResponse.data !== "boolean") {
    await markAttemptUnknown({
      deps,
      errorCode: "refund_attempt_completion_failed",
      externalError: completionResponse.error ?? new Error(
        "Refund attempt completion returned invalid evidence",
      ),
      intakeId: request.intakeId,
      reservation,
    })
    return {
      amountCents: reservation.requestedAmountCents,
      attemptId: reservation.attemptId,
      error: "stripe_refund_completion_unknown",
      refundId: refund.id,
      status: "unknown_outcome",
    }
  }

  // `false` is a benign CAS miss: the exact webhook completed the attempt
  // before Refund.create returned to this process.
  if (!completionResponse.data) {
    log.info("Exact refund webhook won the create-response completion race", {
      intakeId: request.intakeId,
      refundId: refund.id,
    })
  }

  return {
    amountCents: reservation.requestedAmountCents,
    attemptId: reservation.attemptId,
    refundId: refund.id,
    status: "submitted",
    stripeStatus: refund.status,
  }
}

function safeReservationError(message: string): string {
  if (message.includes("support_refund_amount_limit")) {
    return "support_refund_amount_limit"
  }
  if (message.includes("support_refund_attempt_limit")) {
    return "support_refund_attempt_limit"
  }
  return "refund_attempt_reservation_failed"
}

function validateRequest(request: StripeRefundAttemptRequest): string | null {
  if (!request.intakeId || !request.paymentIntentId || !request.refundType) {
    return "refund_attempt_request_incomplete"
  }
  if (
    !Number.isSafeInteger(request.targetTotalCents) ||
    request.targetTotalCents <= 0
  ) {
    return "refund_attempt_target_invalid"
  }
  return null
}

function parseReservationOutcome(
  value: unknown,
  targetTotalCents: number,
): RefundAttemptReservationOutcome | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null

  const candidate = value as Record<string, unknown>
  const attemptId = candidate.attempt_id
  const idempotencyKey = candidate.idempotency_key
  const leaseToken = candidate.lease_token
  const requestedAmountCents = candidate.requested_amount_cents

  if (
    candidate.reserved === false &&
    candidate.active === false &&
    candidate.matches_request === true &&
    candidate.outcome === "cash_satisfied" &&
    requestedAmountCents === 0 &&
    attemptId === null &&
    idempotencyKey === null &&
    leaseToken === null
  ) {
    return { kind: "cash_satisfied" }
  }

  const hasValidAttemptIdentity =
    typeof attemptId === "string" &&
    UUID_PATTERN.test(attemptId) &&
    idempotencyKey === `refund-attempt:${attemptId}` &&
    Number.isSafeInteger(requestedAmountCents) &&
    Number(requestedAmountCents) > 0 &&
    Number(requestedAmountCents) <= targetTotalCents

  if (
    candidate.reserved === false &&
    candidate.active === true &&
    candidate.matches_request === true &&
    candidate.outcome === "active" &&
    hasValidAttemptIdentity &&
    (leaseToken === null ||
      (typeof leaseToken === "string" && UUID_PATTERN.test(leaseToken)))
  ) {
    return {
      amountCents: Number(requestedAmountCents),
      attemptId: attemptId as string,
      kind: "active",
    }
  }

  if (
    candidate.reserved !== true ||
    !hasValidAttemptIdentity ||
    typeof leaseToken !== "string" ||
    !UUID_PATTERN.test(leaseToken) ||
    (candidate.outcome !== undefined && candidate.outcome !== "reserved") ||
    (candidate.active !== undefined && candidate.active !== true) ||
    (candidate.matches_request !== undefined && candidate.matches_request !== true)
  ) {
    return null
  }

  return {
    kind: "reserved",
    reservation: {
      attemptId: attemptId as string,
      idempotencyKey: idempotencyKey as string,
      leaseToken,
      requestedAmountCents: Number(requestedAmountCents),
    },
  }
}

function isValidStripeResponse(
  refund: Stripe.Refund,
  request: StripeRefundAttemptRequest,
  reservation: RefundAttemptReservation,
): refund is Stripe.Refund & { status: StripeRefundStatus } {
  return Boolean(
    refund &&
    typeof refund.id === "string" &&
    refund.id.length > 0 &&
    refund.amount === reservation.requestedAmountCents &&
    stripeId(refund.payment_intent) === request.paymentIntentId &&
    refund.metadata?.intake_id === request.intakeId &&
    refund.metadata?.refund_attempt_id === reservation.attemptId &&
    refund.metadata?.refund_type === request.refundType &&
    refund.status,
  )
}

function stripeId(
  value: { id: string } | string | null | undefined,
): string | null {
  if (typeof value === "string") return value.trim() || null
  return value?.id?.trim() || null
}

async function markAttemptUnknown(input: {
  deps: RefundAttemptDependencies
  errorCode: string
  externalError: unknown
  intakeId: string
  reservation: RefundAttemptReservation
}): Promise<void> {
  captureAttemptFailure(input.errorCode, input.intakeId, input.externalError)

  try {
    const { data, error } = await input.deps.supabase.rpc(
      "complete_stripe_refund_attempt_error",
      {
        p_attempt_id: input.reservation.attemptId,
        p_error: input.errorCode,
        p_lease_token: input.reservation.leaseToken,
        p_outcome: "unknown_outcome",
      },
    )
    if (error || (data !== true && data !== false)) {
      captureAttemptFailure(
        "unknown_outcome_write_failed",
        input.intakeId,
        error ?? new Error("Unknown-outcome completion returned invalid evidence"),
      )
    }
  } catch (error) {
    captureAttemptFailure("unknown_outcome_write_threw", input.intakeId, error)
  }
}

function captureAttemptFailure(
  code: string,
  intakeId: string,
  error: unknown,
): void {
  const normalized = error instanceof Error ? error : new Error(code)
  log.error("Refund attempt operation failed", { code, intakeId }, normalized)
  Sentry.captureException(normalized, {
    tags: {
      alert_type: "stripe_refund_attempt",
      failure_code: code,
    },
  })
}
