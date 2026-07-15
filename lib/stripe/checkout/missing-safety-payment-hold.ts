import { createLogger } from "@/lib/observability/logger"
import type { createServiceRoleClient } from "@/lib/supabase/service-role"

import { canRetryPaymentForIntake } from "../payment-integrity"
import {
  HIGH_STAKES_PAYMENT_LOCK_EXCLUSION_FILTER,
  isMissingSafetyInformationPaymentLock,
  MISSING_SAFETY_INFORMATION_PAYMENT_LOCK,
} from "../payment-safety-lock"
import { invalidateCheckoutSessionForSafety } from "./checkout-session-safety"

const logger = createLogger("missing-safety-payment-hold")

export type MissingSafetyPaymentHoldResult =
  | "held"
  | "payment_in_flight"
  | "state_changed"
  | "unresolved"

interface StoredPaymentState {
  checkout_error: string | null
  payment_id: string | null
  payment_status: string | null
  status: string | null
}

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

export async function holdCheckoutForMissingSafetyInformation({
  intakeId,
  missingFields,
  patientId,
  source,
  supabase,
}: {
  intakeId: string
  missingFields: string[]
  patientId?: string
  source: "guest_resume" | "retry_payment"
  supabase: ReturnType<typeof createServiceRoleClient>
}): Promise<MissingSafetyPaymentHoldResult> {
  const readCurrentState = async (): Promise<{
    error: Error | null
    state: StoredPaymentState | null
  }> => {
    let query = supabase
      .from("intakes")
      .select("id, status, payment_status, payment_id, checkout_error")
      .eq("id", intakeId)
    if (patientId) query = query.eq("patient_id", patientId)

    const { data, error } = await query.maybeSingle()
    return {
      error: error ? toError(error, "Payment hold state read failed") : null,
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

  const timestamp = new Date().toISOString()
  let holdQuery = supabase
    .from("intakes")
    .update({
      checkout_error: MISSING_SAFETY_INFORMATION_PAYMENT_LOCK,
      live_consult_reason: "Required medical information is missing.",
      requires_live_consult: false,
      status: "checkout_failed",
      triage_reasons: ["missing_safety_fields"],
      triage_result: "request_more_info",
      updated_at: timestamp,
    })
    .eq("id", intakeId)
    .in("status", ["pending_payment", "checkout_failed"])
    .in("payment_status", ["pending", "unpaid", "failed"])
    .or(HIGH_STAKES_PAYMENT_LOCK_EXCLUSION_FILTER)
  if (patientId) holdQuery = holdQuery.eq("patient_id", patientId)

  const { data: heldRows, error: holdError } = await holdQuery.select(
    "id, status, payment_status, payment_id, checkout_error",
  )

  let capturedState: StoredPaymentState | null = heldRows?.[0]
    ? {
        checkout_error: MISSING_SAFETY_INFORMATION_PAYMENT_LOCK,
        payment_id: heldRows[0].payment_id,
        payment_status: heldRows[0].payment_status,
        status: heldRows[0].status,
      }
    : null

  if (holdError || !capturedState) {
    const refreshed = await readCurrentState()
    if (refreshed.error) {
      logger.error(
        "Failed to apply or reconcile missing-information payment hold",
        { intakeId, missingFields, source },
        refreshed.error,
      )
      return "unresolved"
    }
    if (!refreshed.state) return "state_changed"

    if (
      refreshed.state.payment_status === "paid" ||
      refreshed.state.status === "paid"
    ) {
      return "payment_in_flight"
    }

    if (
      !isMissingSafetyInformationPaymentLock(refreshed.state.checkout_error) ||
      !canRetryPaymentForIntake(
        refreshed.state.status,
        refreshed.state.payment_status,
      )
    ) {
      return "state_changed"
    }

    capturedState = refreshed.state
  }

  if (!capturedState.payment_id) {
    logger.info("Held checkout for missing safety information", {
      intakeId,
      missingFields,
      sessionState: "none",
      source,
    })
    return "held"
  }

  const invalidation = await invalidateCheckoutSessionForSafety(
    capturedState.payment_id,
    intakeId,
    {
      intakeStatus: capturedState.status,
      paymentStatus: capturedState.payment_status,
      storedPaymentId: capturedState.payment_id,
    },
  )

  if (invalidation === "invalidated") {
    logger.info("Held checkout and invalidated its current Session", {
      intakeId,
      missingFields,
      sessionId: capturedState.payment_id,
      source,
    })
    return "held"
  }

  if (invalidation === "payment_in_flight") {
    logger.warn("Held checkout while exact-current payment is in flight", {
      intakeId,
      missingFields,
      sessionId: capturedState.payment_id,
      source,
    })
    return "payment_in_flight"
  }

  logger.error(
    "Missing-information payment hold retained with unresolved Session invalidation",
    {
      intakeId,
      missingFields,
      sessionId: capturedState.payment_id,
      source,
    },
    new Error("Stripe Checkout Session invalidation unresolved"),
  )
  return "unresolved"
}
