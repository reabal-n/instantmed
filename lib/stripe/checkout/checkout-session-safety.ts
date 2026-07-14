import type Stripe from "stripe"

import { createLogger } from "@/lib/observability/logger"
import type { createServiceRoleClient } from "@/lib/supabase/service-role"

import { stripe } from "../client"
import { canRetryPaymentForIntake } from "../payment-integrity"

const logger = createLogger("checkout-session-safety")
const MAX_HIGH_STAKES_INVALIDATION_ATTEMPTS = 3

export type CheckoutSessionState =
  | "expired"
  | "open"
  | "payment_in_flight"
  | "unresolved"

export type SessionInvalidationResult = "invalidated" | "payment_in_flight" | "unresolved"

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

type CheckoutSessionSnapshot = Pick<
  Stripe.Checkout.Session,
  "id" | "payment_status" | "status" | "url"
>

export function classifyCheckoutSession(
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
  let paymentState = initialState

  for (let attempt = 0; attempt < MAX_HIGH_STAKES_INVALIDATION_ATTEMPTS; attempt += 1) {
    if (paymentState.payment_id) {
      const invalidation = await invalidateCheckoutSessionForSafety(
        paymentState.payment_id,
        intakeId,
      )
      if (invalidation !== "invalidated") return invalidation
    }

    const now = new Date().toISOString()
    let cancellationQuery = supabase
      .from("intakes")
      .update({
        status: "cancelled",
        cancelled_at: now,
        checkout_error: null,
        triage_result: "decline",
        triage_reasons: ["high_stakes_use_case"],
        requires_live_consult: false,
        live_consult_reason: null,
        updated_at: now,
      })
      .eq("id", intakeId)
      .in("status", ["pending_payment", "checkout_failed"])
      .in("payment_status", ["pending", "unpaid", "failed"])

    cancellationQuery = paymentState.payment_id
      ? cancellationQuery.eq("payment_id", paymentState.payment_id)
      : cancellationQuery.is("payment_id", null)

    const { data: cancelledRows, error: cancellationError } = await cancellationQuery
      .select("id, payment_id")

    if (cancellationError) {
      logger.error(
        "Failed to cancel high-stakes unpaid intake",
        { intakeId, source },
        cancellationError,
      )
      return "unresolved"
    }

    if (cancelledRows && cancelledRows.length > 0) return "cancelled"

    logger.warn("High-stakes cancellation matched no rows; refetching payment state", {
      attempt: attempt + 1,
      intakeId,
      source,
    })

    let refreshQuery = supabase
      .from("intakes")
      .select("id, status, payment_status, payment_id")
      .eq("id", intakeId)
    if (patientId) refreshQuery = refreshQuery.eq("patient_id", patientId)

    const { data: refreshedIntake, error: refreshError } = await refreshQuery.single()

    if (refreshError || !refreshedIntake) {
      logger.error(
        "Failed to refetch high-stakes payment state",
        { intakeId, source },
        refreshError || new Error("Intake disappeared during safety invalidation"),
      )
      return "unresolved"
    }

    if (!canRetryPaymentForIntake(refreshedIntake.status, refreshedIntake.payment_status)) {
      return "state_changed"
    }

    paymentState = {
      payment_id: refreshedIntake.payment_id,
      payment_status: refreshedIntake.payment_status,
      status: refreshedIntake.status,
    }
  }

  if (paymentState.payment_id) {
    const finalInvalidation = await invalidateCheckoutSessionForSafety(
      paymentState.payment_id,
      intakeId,
    )
    if (finalInvalidation !== "invalidated") {
      logger.error(
        "Could not reconcile latest high-stakes session after CAS exhaustion",
        { intakeId, sessionId: paymentState.payment_id, source },
        new Error(`Final safety invalidation result: ${finalInvalidation}`),
      )
      return finalInvalidation
    }
  }

  logger.error(
    "High-stakes payment state kept changing during invalidation",
    { intakeId, source },
    new Error("Safety invalidation exceeded retry limit"),
  )
  return "unresolved"
}
