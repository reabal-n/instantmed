import type Stripe from "stripe"

import { createLogger } from "@/lib/observability/logger"
import type { createServiceRoleClient } from "@/lib/supabase/service-role"

import { stripe } from "../client"
import {
  canRetryPaymentForIntake,
  PAYMENT_REPLACEMENT_LOCK,
  validateCheckoutSessionIntakeMatch,
} from "../payment-integrity"
import {
  HIGH_STAKES_PAYMENT_LOCK,
  isPaymentSafetyLock,
  PAYMENT_SAFETY_LOCKS,
} from "../payment-safety-lock"

const logger = createLogger("checkout-session-safety")

export { HIGH_STAKES_PAYMENT_LOCK } from "../payment-safety-lock"

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
  | "failed"
  | "open"
  | "paid"
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

export interface CheckoutSessionReplacementState extends RetryablePaymentState {
  checkout_error: string | null
}

export type CheckoutSessionReplacementClaimResult =
  | { outcome: "claimed" | "not_needed" }
  | { currentState: RetryablePaymentState | null; outcome: "state_changed" }
  | { outcome: "unresolved" }

export type CheckoutSessionReturnConfirmation =
  | { currentState: CheckoutSessionReplacementState; outcome: "current" }
  | { currentState: CheckoutSessionReplacementState | null; outcome: "state_changed" }
  | { outcome: "unresolved" }

interface StoredPaymentState extends RetryablePaymentState {
  checkout_error: string | null
}

type CheckoutSessionSnapshot = Pick<
  Stripe.Checkout.Session,
  "amount_total" | "id" | "metadata" | "payment_status" | "status" | "url"
>

function classifyCheckoutSession(
  session: CheckoutSessionSnapshot,
  persistedState?: Pick<RetryablePaymentState, "payment_status" | "status">,
): CheckoutSessionState {
  if (session.payment_status === "paid") return "paid"

  // Stripe leaves an async-payment Session as complete/unpaid after failure.
  // Once that failure is durably reflected on the intake, the Session is final
  // and a replacement may be created. Without the persisted pair, fail closed
  // as payment in flight so a delayed success webhook can still win.
  if (
    session.status === "complete" &&
    session.payment_status === "unpaid" &&
    persistedState?.status === "checkout_failed" &&
    persistedState.payment_status === "failed"
  ) {
    return "failed"
  }

  if (session.status === "complete") return "payment_in_flight"
  if (session.status === "expired") return "expired"
  if (session.status === "open") return "open"
  return "unresolved"
}

export async function inspectCheckoutSession(
  sessionId: string,
  intakeId: string,
  options: {
    intakeStatus?: string | null
    paymentStatus?: string | null
    storedPaymentId?: string | null
  } = {},
): Promise<{ session: CheckoutSessionSnapshot | null; state: CheckoutSessionState }> {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    const ownership = validateCheckoutSessionIntakeMatch({
      intakeId,
      session,
      storedPaymentId: options.storedPaymentId,
    })
    if (!ownership.valid) {
      logger.error(
        "Checkout session does not belong to the requested intake",
        { intakeId, reason: ownership.reason, sessionId },
        new Error("Stripe Checkout Session ownership validation failed"),
      )
      return { session: null, state: "unresolved" }
    }

    return {
      session,
      state: classifyCheckoutSession(session, {
        payment_status: options.paymentStatus ?? null,
        status: options.intakeStatus ?? null,
      }),
    }
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
  options: {
    intakeStatus?: string | null
    paymentStatus?: string | null
    storedPaymentId?: string | null
  } = {},
): Promise<SessionInvalidationResult> {
  // Ownership comes before mutation. A caller-controlled or stale Session id
  // must never be enough to expire another intake's Checkout Session.
  let inspection = await inspectCheckoutSession(sessionId, intakeId, options)

  if (inspection.state === "expired" || inspection.state === "failed") {
    return "invalidated"
  }
  if (inspection.state === "paid" || inspection.state === "payment_in_flight") {
    return "payment_in_flight"
  }
  if (inspection.state !== "open") return "unresolved"

  try {
    await stripe.checkout.sessions.expire(sessionId)
    logger.info("Expired checkout session for payment safety", { intakeId, sessionId })
    return "invalidated"
  } catch (expireError) {
    inspection = await inspectCheckoutSession(sessionId, intakeId, options)

    if (inspection.state === "expired" || inspection.state === "failed") {
      return "invalidated"
    }

    if (inspection.state === "paid" || inspection.state === "payment_in_flight") {
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

export async function attachCheckoutSession({
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
  source:
    | "authenticated_checkout"
    | "guest_checkout"
    | "guest_resume"
    | "retry_payment"
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

  // PostgREST rejects a PATCH that combines these nullable guards with `.or()`
  // (42703 on intakes.checkout_error). Preserve the same union as two guarded
  // compare-and-swap attempts so neither payment-safety lock can be cleared.
  const paymentSafetyLocksFilter = `(${PAYMENT_SAFETY_LOCKS.join(",")})`
  const runAttach = async (checkoutErrorGuard: "null" | "not_safety_locked") => {
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

    attachQuery = checkoutErrorGuard === "null"
      ? attachQuery.is("checkout_error", null)
      : attachQuery.not("checkout_error", "in", paymentSafetyLocksFilter)

    if (patientId) attachQuery = attachQuery.eq("patient_id", patientId)

    attachQuery = expectedPaymentId
      ? attachQuery.eq("payment_id", expectedPaymentId)
      : attachQuery.is("payment_id", null)

    return attachQuery.select("id")
  }

  let { data: attachedRows, error: attachError } = await runAttach("null")
  if (!attachError && (!attachedRows || attachedRows.length === 0)) {
    const fallbackAttach = await runAttach("not_safety_locked")
    attachedRows = fallbackAttach.data
    attachError = fallbackAttach.error
  }

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
    await invalidateCheckoutSessionForSafety(sessionId, intakeId)
    return { outcome: "unresolved" }
  }

  if (
    currentIntake?.payment_id === sessionId &&
    !isPaymentSafetyLock(currentIntake.checkout_error) &&
    canRetryPaymentForIntake(currentIntake.status, currentIntake.payment_status)
  ) {
    logger.info("Parallel request already attached the same idempotent session", {
      intakeId,
      sessionId,
      source,
    })
    return { outcome: "already_attached" }
  }

  if (
    currentIntake?.payment_id !== sessionId ||
    isPaymentSafetyLock(currentIntake?.checkout_error)
  ) {
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

/**
 * Re-read the exact persisted Session immediately before a guest recovery path
 * returns its open URL. This narrows the inspection/return race: a visible
 * safety lock or a different current Session always withholds the URL.
 */
export async function confirmCheckoutSessionStillCurrent({
  intakeId,
  patientId,
  sessionId,
  source,
  supabase,
}: {
  intakeId: string
  patientId?: string
  sessionId: string
  source: "guest_checkout" | "guest_resume"
  supabase: ReturnType<typeof createServiceRoleClient>
}): Promise<CheckoutSessionReturnConfirmation> {
  let query = supabase
    .from("intakes")
    .select("id, status, payment_status, payment_id, checkout_error")
    .eq("id", intakeId)
  if (patientId) query = query.eq("patient_id", patientId)

  const { data: currentIntake, error } = await query.maybeSingle()
  if (error) {
    logger.error(
      "Could not confirm current checkout Session before returning its URL",
      { intakeId, sessionId, source },
      error,
    )
    return { outcome: "unresolved" }
  }

  const currentState = currentIntake
    ? {
        checkout_error: currentIntake.checkout_error,
        payment_id: currentIntake.payment_id,
        payment_status: currentIntake.payment_status,
        status: currentIntake.status,
      }
    : null

  if (
    currentState?.payment_id === sessionId &&
    !isPaymentSafetyLock(currentState.checkout_error) &&
    canRetryPaymentForIntake(currentState.status, currentState.payment_status)
  ) {
    return { currentState, outcome: "current" }
  }

  return { currentState, outcome: "state_changed" }
}

/**
 * Claim a pending Session replacement before expiring the current Stripe
 * Session. The expiry webhook only transitions rows that are not carrying this
 * marker, preventing it from changing the row to expired between Stripe expiry
 * and the exact-CAS replacement attach.
 *
 * checkout_failed rows do not need the marker because the expiry webhook
 * already ignores them. A pre-existing marker is safe to resume: every caller
 * uses a deterministic Stripe idempotency key and the final attach still uses
 * the exact previous payment_id compare-and-swap. The marker is deliberately
 * durable on intermediate failure; only a successful attach or a terminal
 * payment webhook clears/replaces it, so one parallel caller cannot reopen the
 * expiry race while another caller is still working.
 */
export async function claimCheckoutSessionReplacement({
  initialState,
  intakeId,
  patientId,
  source,
  supabase,
}: {
  initialState: CheckoutSessionReplacementState
  intakeId: string
  patientId?: string
  source: "guest_checkout" | "guest_resume" | "retry_payment"
  supabase: ReturnType<typeof createServiceRoleClient>
}): Promise<CheckoutSessionReplacementClaimResult> {
  if (!initialState.payment_id || initialState.status !== "pending_payment") {
    return { outcome: "not_needed" }
  }

  if (
    isPaymentSafetyLock(initialState.checkout_error) ||
    !canRetryPaymentForIntake(initialState.status, initialState.payment_status)
  ) {
    return {
      currentState: initialState,
      outcome: "state_changed",
    }
  }

  // A prior process may have stopped after claiming the row. It is safe for a
  // later request to continue because replacement Session creation is
  // idempotent and attachment still exact-CASes the captured payment_id.
  if (initialState.checkout_error === PAYMENT_REPLACEMENT_LOCK) {
    return { outcome: "claimed" }
  }

  let claimQuery = supabase
    .from("intakes")
    .update({
      checkout_error: PAYMENT_REPLACEMENT_LOCK,
      updated_at: new Date().toISOString(),
    })
    .eq("id", intakeId)
    .eq("payment_id", initialState.payment_id)
    .eq("status", initialState.status)
    .eq("payment_status", initialState.payment_status)

  if (patientId) claimQuery = claimQuery.eq("patient_id", patientId)
  claimQuery = initialState.checkout_error
    ? claimQuery.eq("checkout_error", initialState.checkout_error)
    : claimQuery.is("checkout_error", null)

  const { data: claimedRows, error: claimError } = await claimQuery.select("id")
  if (!claimError && claimedRows && claimedRows.length > 0) {
    return { outcome: "claimed" }
  }

  let refetchQuery = supabase
    .from("intakes")
    .select("id, status, payment_status, payment_id, checkout_error")
    .eq("id", intakeId)
  if (patientId) refetchQuery = refetchQuery.eq("patient_id", patientId)

  const { data: currentIntake, error: refetchError } = await refetchQuery.maybeSingle()
  if (refetchError) {
    logger.error(
      "Could not reconcile checkout replacement claim",
      { intakeId, source },
      refetchError,
    )
    return { outcome: "unresolved" }
  }

  if (
    currentIntake?.checkout_error === PAYMENT_REPLACEMENT_LOCK &&
    currentIntake.payment_id === initialState.payment_id &&
    currentIntake.status === initialState.status &&
    currentIntake.payment_status === initialState.payment_status
  ) {
    return { outcome: "claimed" }
  }

  if (claimError) {
    logger.error(
      "Checkout replacement claim failed after state reconciliation",
      { intakeId, source },
      claimError,
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
      {
        intakeStatus: lockedState.status,
        paymentStatus: lockedState.payment_status,
        storedPaymentId: lockedState.payment_id,
      },
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
