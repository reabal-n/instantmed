import type { SupabaseClient } from "@supabase/supabase-js"

import { createLogger } from "@/lib/observability/logger"
import {
  isPaymentSafetyLock,
  PAYMENT_SAFETY_LOCK_EXCLUSION_FILTER,
  PAYMENT_SAFETY_LOCKS,
  type PaymentSafetyLock,
} from "@/lib/stripe/payment-safety-lock"

const log = createLogger("stripe-webhook:payment-failure-recovery")

const RETRYABLE_INTAKE_STATUSES = ["pending_payment", "checkout_failed"] as const
const RETRYABLE_PAYMENT_STATUSES = ["pending", "unpaid", "failed"] as const

export type PaymentFailureUpdateResult =
  | { outcome: "ordinary_failure" }
  | { marker: PaymentSafetyLock; outcome: "locked_failure" }
  | { outcome: "state_changed" }
  | {
      error: unknown
      outcome: "database_error"
      stage: "locked_fallback" | "ordinary"
    }

export async function recordExactCurrentPaymentFailure({
  checkoutSessionId,
  intakeId,
  ordinaryError,
  source,
  supabase,
}: {
  checkoutSessionId: string
  intakeId: string
  ordinaryError: string
  source: "checkout.session.async_payment_failed" | "payment_intent.payment_failed"
  supabase: SupabaseClient
}): Promise<PaymentFailureUpdateResult> {
  const updatedAt = new Date().toISOString()
  const { data: ordinaryFailure, error: ordinaryErrorResult } = await supabase
    .from("intakes")
    .update({
      checkout_error: ordinaryError,
      payment_status: "failed",
      status: "checkout_failed",
      updated_at: updatedAt,
    })
    .eq("id", intakeId)
    .eq("payment_id", checkoutSessionId)
    .in("status", [...RETRYABLE_INTAKE_STATUSES])
    .in("payment_status", [...RETRYABLE_PAYMENT_STATUSES])
    .or(PAYMENT_SAFETY_LOCK_EXCLUSION_FILTER)
    .select("id, checkout_error")
    .maybeSingle()

  if (ordinaryErrorResult) {
    return {
      error: ordinaryErrorResult,
      outcome: "database_error",
      stage: "ordinary",
    }
  }
  if (ordinaryFailure) return { outcome: "ordinary_failure" }

  const { data: lockedFailure, error: lockedError } = await supabase
    .from("intakes")
    .update({
      payment_status: "failed",
      status: "checkout_failed",
      updated_at: updatedAt,
    })
    .eq("id", intakeId)
    .eq("payment_id", checkoutSessionId)
    .in("status", [...RETRYABLE_INTAKE_STATUSES])
    .in("payment_status", [...RETRYABLE_PAYMENT_STATUSES])
    .in("checkout_error", [...PAYMENT_SAFETY_LOCKS])
    .select("id, checkout_error")
    .maybeSingle()

  if (lockedError) {
    return {
      error: lockedError,
      outcome: "database_error",
      stage: "locked_fallback",
    }
  }
  if (
    lockedFailure &&
    isPaymentSafetyLock(lockedFailure.checkout_error)
  ) {
    return {
      marker: lockedFailure.checkout_error as PaymentSafetyLock,
      outcome: "locked_failure",
    }
  }

  log.info("Payment failure update matched no current retryable intake", {
    checkoutSessionId,
    intakeId,
    source,
  })
  return { outcome: "state_changed" }
}

export type PaymentFailureIntakeEmailContext = {
  category?: string | null
  guest_email?: string | null
  patient?: { email?: string | null; full_name?: string | null } | Array<{ email?: string | null; full_name?: string | null }> | null
}

type ExactCurrentPaymentFailureEmailContext =
  PaymentFailureIntakeEmailContext & {
    abandoned_email_sent_at: null
    checkout_error: string | null
    id: string
    payment_id: string
    payment_status: "failed"
    status: "checkout_failed"
  }

export type PaymentFailureEmailEligibilityResult =
  | { context: ExactCurrentPaymentFailureEmailContext; outcome: "eligible" }
  | { outcome: "ineligible" }
  | { error: unknown; outcome: "database_error" }

export function resolvePaymentFailureRecipient(intake: PaymentFailureIntakeEmailContext | null): {
  email: string | null
  name: string
} {
  const patient = Array.isArray(intake?.patient)
    ? intake.patient[0]
    : intake?.patient

  return {
    email: patient?.email ?? intake?.guest_email ?? null,
    name: patient?.full_name || "there",
  }
}

export async function readExactCurrentPaymentFailureEmailContext({
  checkoutSessionId,
  intakeId,
  supabase,
}: {
  checkoutSessionId: string
  intakeId: string
  supabase: SupabaseClient
}): Promise<PaymentFailureEmailEligibilityResult> {
  const { data, error } = await supabase
    .from("intakes")
    .select(`
      id,
      status,
      payment_status,
      payment_id,
      abandoned_email_sent_at,
      checkout_error,
      category,
      guest_email,
      patient:profiles!intakes_patient_id_fkey(email, full_name)
    `)
    .eq("id", intakeId)
    .eq("payment_id", checkoutSessionId)
    .eq("status", "checkout_failed")
    .eq("payment_status", "failed")
    .is("abandoned_email_sent_at", null)
    .or(PAYMENT_SAFETY_LOCK_EXCLUSION_FILTER)
    .maybeSingle()

  if (error) return { error, outcome: "database_error" }
  if (!data) return { outcome: "ineligible" }
  return {
    context: data as unknown as ExactCurrentPaymentFailureEmailContext,
    outcome: "eligible",
  }
}

export async function markCheckoutRecoveryNudgeSent(
  supabase: SupabaseClient,
  intakeId: string,
  checkoutSessionId: string,
  source: "checkout.session.async_payment_failed" | "payment_intent.payment_failed",
): Promise<boolean> {
  const { data, error } = await supabase
    .from("intakes")
    .update({ abandoned_email_sent_at: new Date().toISOString() })
    .eq("id", intakeId)
    .eq("payment_id", checkoutSessionId)
    .eq("status", "checkout_failed")
    .eq("payment_status", "failed")
    .is("abandoned_email_sent_at", null)
    .or(PAYMENT_SAFETY_LOCK_EXCLUSION_FILTER)
    .select("id")
    .maybeSingle()

  if (error) {
    log.warn("Failed to mark payment failure recovery as first checkout nudge", {
      checkoutSessionId,
      intakeId,
      source,
      errorCode: error.code,
    })
    return false
  }
  return Boolean(data)
}
