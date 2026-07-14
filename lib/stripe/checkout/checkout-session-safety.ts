import type Stripe from "stripe"

import { createLogger } from "@/lib/observability/logger"
import type { createServiceRoleClient } from "@/lib/supabase/service-role"

import { stripe } from "../client"
import { canRetryPaymentForIntake } from "../payment-integrity"

const logger = createLogger("checkout-session-safety")

export const HIGH_STAKES_PAYMENT_LOCK = "safety_blocked_high_stakes"

function toError(value: unknown, fallback: string): Error {
  if (value instanceof Error) return value
  if (
    value &&
    typeof value === "object" &&
    "message" in value &&
    typeof value.message === "string"
  ) {
    return new Error(value.message)
  }
  return new Error(fallback)
}

export type CheckoutSessionState =
  | "expired"
  | "open"
  | "payment_in_flight"
  | "unresolved"

export type SessionInvalidationResult = "invalidated" | "payment_in_flight" | "unresolved"

export type CheckoutSessionAttachResult =
  | { outcome: "already_attached" | "attached" }
  | { currentState: RetryablePaymentState | null; outcome: "state_changed" }
  | { outcome: "session_not_open"; sessionState: Exclude<CheckoutSessionState, "open"> }
  | { outcome: "unresolved" }

export type HighStakesCancellationResult =
  | "cancelled"
  | "payment_in_flight"
  | "state_changed"
  | "unresolved"

export interface RetryablePaymentState {
  payment_id: string | null
  payment_status: string | null
  status: string | null
}

interface StoredPaymentState extends RetryablePaymentState {
  checkout_error: string | null
}

type CheckoutSessionSnapshot = Pick<
  Stripe.Checkout.Session,
  "id" | "payment_status" | "status" | "url"
>

function classifyCheckoutSession(
  session: CheckoutSessionSnapshot,
): CheckoutSessionState {
  if (
    session.status === "complete" ||
    session.payment_status === "paid" ||
    session.payment_status === "no_payment_required"
  ) {
    return "payment_in_flight"
  }

  if (session.status === "expired") return "expired"
  if (session.status === "open") return "open"
  return "unresolved"
}

export async function inspectCheckoutSession(
  sessionId: string,
  intakeId: string,
): Promise<{ session: CheckoutSessionSnapshot | null; state: CheckoutSessionState }> {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    return { session, state: classifyCheckoutSession(session) }
  } catch (error) {
    logger.error(
      "Could not retrieve checkout session state",
      { intakeId, sessionId },
      error instanceof Error ? error : new Error(String(error)),
    )
    return { session: null, state: "unresolved" }
  }
}

export async function invalidateCheckoutSessionForSafety(
  sessionId: string,
  intakeId: string,
): Promise<SessionInvalidationResult> {
  try {
    await stripe.checkout.sessions.expire(sessionId)
    logger.info("Expired checkout session for payment safety", { intakeId, sessionId })
    return "invalidated"
  } catch (expireError) {
    const inspection = await inspectCheckoutSession(sessionId, intakeId)

    if (inspection.state === "expired") return "invalidated"

    if (inspection.state === "payment_in_flight") {
      logger.error(
        "Checkout session is complete or payment is in flight",
        {
          intakeId,
          paymentStatus: inspection.session?.payment_status,
          sessionId,
          sessionStatus: inspection.session?.status,
        },
        expireError instanceof Error ? expireError : new Error(String(expireError)),
      )
      return "payment_in_flight"
    }

    logger.error(
      "Could not invalidate checkout session",
      {
        intakeId,
        paymentStatus: inspection.session?.payment_status,
        sessionId,
        sessionStatus: inspection.session?.status,
      },
      expireError instanceof Error ? expireError : new Error(String(expireError)),
    )
    return "unresolved"
  }
}

export async function attachRetryCheckoutSession({
  expectedPaymentId,
  intakeId,
  patientId,
  sessionId,
  source,
  supabase,
}: {
  expectedPaymentId: string | null
  intakeId: string
  patientId?: string
  sessionId: string
  source: "guest_checkout" | "guest_resume" | "retry_payment"
  supabase: ReturnType<typeof createServiceRoleClient>
}): Promise<CheckoutSessionAttachResult> {
  // Stripe idempotency can replay a session created by an earlier request. A
  // replay may have expired or completed since it was first created, so never
  // attach it to the intake until Stripe confirms it is still payable.
  const inspection = await inspectCheckoutSession(sessionId, intakeId)
  if (inspection.state !== "open") {
    logger.warn("Withholding checkout session because it is not open", {
      intakeId,
      sessionId,
      sessionState: inspection.state,
      source,
    })
    return inspection.state === "unresolved"
      ? { outcome: "unresolved" }
      : { outcome: "session_not_open", sessionState: inspection.state }
  }

  let attachQuery = supabase
    .from("intakes")
    .update({
      payment_id: sessionId,
      payment_status: "pending",
      status: "pending_payment",
      checkout_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", intakeId)
    .in("status", ["pending_payment", "checkout_failed"])
    .in("payment_status", ["pending", "unpaid", "failed"])
    .or(`checkout_error.is.null,checkout_error.neq.${HIGH_STAKES_PAYMENT_LOCK}`)

  attachQuery = expectedPaymentId
    ? attachQuery.eq("payment_id", expectedPaymentId)
    : attachQuery.is("payment_id", null)

  const { data: attachedRows, error: attachError } = await attachQuery.select("id")
  if (!attachError && attachedRows && attachedRows.length > 0) {
    return { outcome: "attached" }
  }

  let refetchQuery = supabase
    .from("intakes")
    .select("id, status, payment_status, payment_id, checkout_error")
    .eq("id", intakeId)
  if (patientId) refetchQuery = refetchQuery.eq("patient_id", patientId)

  const { data: currentIntake, error: refetchError } = await refetchQuery.maybeSingle()
  if (refetchError) {
    logger.error(
      "Could not reconcile checkout session after attach uncertainty",
      { intakeId, sessionId, source },
      refetchError,
    )
    return { outcome: "unresolved" }
  }

  if (
    currentIntake?.payment_id === sessionId &&
    currentIntake.checkout_error !== HIGH_STAKES_PAYMENT_LOCK &&
    canRetryPaymentForIntake(currentIntake.status, currentIntake.payment_status)
  ) {
    logger.info("Parallel request already attached the same idempotent session", {
      intakeId,
      sessionId,
      source,
    })
    return { outcome: "already_attached" }
  }

  if (currentIntake?.payment_id !== sessionId) {
    await invalidateCheckoutSessionForSafety(sessionId, intakeId)
  }

  if (attachError) {
    logger.error(
      "Checkout session attach failed after state reconciliation",
      { intakeId, sessionId, source },
      attachError,
    )
  }

  return {
    currentState: currentIntake
      ? {
          payment_id: currentIntake.payment_id,
          payment_status: currentIntake.payment_status,
          status: currentIntake.status,
        }
      : null,
    outcome: "state_changed",
  }
}

export async function cancelHighStakesUnpaidIntake({
  initialState,
  intakeId,
  patientId,
  source,
  supabase,
}: {
  initialState: RetryablePaymentState
  intakeId: string
  patientId?: string
  source: "guest_resume" | "retry_payment"
  supabase: ReturnType<typeof createServiceRoleClient>
}): Promise<HighStakesCancellationResult> {
  const readCurrentState = async (): Promise<{
    error: Error | null
    state: StoredPaymentState | null
  }> => {
    let refreshQuery = supabase
      .from("intakes")
      .select("id, status, payment_status, payment_id, checkout_error")
      .eq("id", intakeId)
    if (patientId) refreshQuery = refreshQuery.eq("patient_id", patientId)

    const { data, error } = await refreshQuery.maybeSingle()
    return {
      error: error ? toError(error, "Payment state read failed") : null,
      state: data
        ? {
            checkout_error: data.checkout_error,
            payment_id: data.payment_id,
            payment_status: data.payment_status,
            status: data.status,
          }
        : null,
    }
  }

  // Claim the intake before touching Stripe. This single row lock captures the
  // current payment_id and prevents every shared attach path from swapping in
  // another session while safety invalidation is in progress. The row remains
  // retryable so a success webhook for the captured current session can still
  // win if payment completed just before Stripe rejected expiry.
  const lockTimestamp = new Date().toISOString()
  let lockQuery = supabase
    .from("intakes")
    .update({
      checkout_error: HIGH_STAKES_PAYMENT_LOCK,
      triage_result: "decline",
      triage_reasons: ["high_stakes_use_case"],
      requires_live_consult: false,
      live_consult_reason: null,
      updated_at: lockTimestamp,
    })
    .eq("id", intakeId)
    .in("status", ["pending_payment", "checkout_failed"])
    .in("payment_status", ["pending", "unpaid", "failed"])
  if (patientId) lockQuery = lockQuery.eq("patient_id", patientId)

  const { data: lockedRows, error: lockError } = await lockQuery
    .select("id, status, payment_status, payment_id, checkout_error")

  let capturedState: StoredPaymentState | null = lockedRows?.[0]
    ? {
        checkout_error: HIGH_STAKES_PAYMENT_LOCK,
        payment_id: lockedRows[0].payment_id,
        payment_status: lockedRows[0].payment_status,
        status: lockedRows[0].status,
      }
    : null

  if (lockError || !capturedState) {
    const refreshed = await readCurrentState()
    if (refreshed.error || !refreshed.state) {
      logger.error(
        "Failed to claim or reconcile high-stakes payment lock",
        { initialPaymentId: initialState.payment_id, intakeId, source },
        refreshed.error || toError(lockError, "Intake disappeared during payment lock"),
      )
      return "unresolved"
    }

    if (
      refreshed.state.checkout_error !== HIGH_STAKES_PAYMENT_LOCK ||
      !canRetryPaymentForIntake(refreshed.state.status, refreshed.state.payment_status)
    ) {
      return "state_changed"
    }

    // The update may have committed even when its response was lost. Reuse the
    // captured current session rather than opening an attach race again.
    capturedState = refreshed.state
  }

  if (!capturedState) return "unresolved"
  const lockedState = capturedState

  if (lockedState.payment_id) {
    const invalidation = await invalidateCheckoutSessionForSafety(
      lockedState.payment_id,
      intakeId,
    )
    if (invalidation !== "invalidated") return invalidation
  }

  const cancellationTimestamp = new Date().toISOString()
  let cancellationQuery = supabase
    .from("intakes")
    .update({
      status: "cancelled",
      cancelled_at: cancellationTimestamp,
      checkout_error: HIGH_STAKES_PAYMENT_LOCK,
      triage_result: "decline",
      triage_reasons: ["high_stakes_use_case"],
      requires_live_consult: false,
      live_consult_reason: null,
      updated_at: cancellationTimestamp,
    })
    .eq("id", intakeId)
    .eq("checkout_error", HIGH_STAKES_PAYMENT_LOCK)
    .in("status", ["pending_payment", "checkout_failed", "expired"])
    .in("payment_status", ["pending", "unpaid", "failed", "expired"])
  if (patientId) cancellationQuery = cancellationQuery.eq("patient_id", patientId)

  cancellationQuery = lockedState.payment_id
    ? cancellationQuery.eq("payment_id", lockedState.payment_id)
    : cancellationQuery.is("payment_id", null)

  const { data: cancelledRows, error: cancellationError } = await cancellationQuery
    .select("id")

  if (!cancellationError && cancelledRows && cancelledRows.length > 0) {
    return "cancelled"
  }

  // A committed update can still return an ambiguous transport error. Refetch
  // before deciding; never reopen checkout after the safety lock was claimed.
  const refreshed = await readCurrentState()
  if (
    !refreshed.error &&
    refreshed.state?.status === "cancelled" &&
    refreshed.state.checkout_error === HIGH_STAKES_PAYMENT_LOCK &&
    refreshed.state.payment_id === lockedState.payment_id
  ) {
    return "cancelled"
  }

  if (cancellationError || refreshed.error) {
    logger.error(
      "Failed to close high-stakes unpaid intake after session invalidation",
      { intakeId, sessionId: lockedState.payment_id, source },
      refreshed.error || toError(cancellationError, "Cancellation update failed"),
    )
    return "unresolved"
  }

  return "state_changed"
}
