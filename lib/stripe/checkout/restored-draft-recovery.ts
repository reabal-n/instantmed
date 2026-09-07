import type { SupabaseClient } from "@supabase/supabase-js"
import type Stripe from "stripe"

import { CONTACT_EMAIL } from "@/lib/constants"
import { reportCheckoutPersistenceFailure, reportCheckoutProviderFailure } from "@/lib/observability/checkout-persistence-diagnostics"
import { createLogger } from "@/lib/observability/logger"
import type { CheckoutResult } from "@/lib/stripe/checkout/types"
import { checkoutFailure } from "@/lib/stripe/checkout-failure"
import { stripe } from "@/lib/stripe/client"
import { isTerminalPaidPaymentStatus, validateCheckoutSessionIntakeMatch } from "@/lib/stripe/payment-integrity"
import { HIGH_STAKES_PAYMENT_LOCK } from "@/lib/stripe/payment-safety-lock"

const logger = createLogger("restored-draft-checkout")

export interface RestoredCheckoutIntake {
  id: string
  status: string | null
  payment_status: string | null
  payment_id: string | null
  checkout_error: string | null
}

/** Call only after owner/bearer verification. Never turn a terminal row payable. */
export async function reconcileTerminalDraftCheckout({
  supabase, intake, patientId, existingUrl,
}: {
  supabase: SupabaseClient
  intake: RestoredCheckoutIntake
  patientId: string
  existingUrl: string
}): Promise<CheckoutResult> {
  const existing = (): CheckoutResult => ({ success: true, intakeId: intake.id, checkoutUrl: existingUrl })
  const blocked = (reason: string): CheckoutResult => {
    logger.warn("Restored checkout needs payment recovery", { reason })
    return checkoutFailure("payment_provider", `We need to confirm the payment status of your previous request. Contact ${CONTACT_EMAIL} before starting another payment.`, { requiresSupport: true })
  }
  if (isTerminalPaidPaymentStatus(intake.payment_status)) return existing()
  if (intake.status !== "cancelled" && intake.status !== "expired") return blocked("request_not_terminal")
  if (intake.checkout_error === HIGH_STAKES_PAYMENT_LOCK) {
    return checkoutFailure("clinical_or_input_validation", "This request cannot be completed online. Please contact support or arrange an in-person assessment.", { requiresSupport: true })
  }
  if (!intake.payment_id) return blocked("missing_provider_reference")
  if (!["pending", "unpaid", "failed", "expired"].includes(intake.payment_status ?? "")) return blocked("unknown_database_payment_state")

  const inspect = async (): Promise<Stripe.Checkout.Session | null> => {
    try {
      const session = await stripe.checkout.sessions.retrieve(intake.payment_id!, { expand: ["payment_intent"] })
      if (session.id !== intake.payment_id || !validateCheckoutSessionIntakeMatch({
        intakeId: intake.id, session, storedPaymentId: intake.payment_id,
      }).valid) return null
      const intent = session.payment_intent
      // An unexpanded or omitted intent is uncertain; a foreign intent is never ours to expire.
      if (intent === undefined || typeof intent === "string") return null
      if (intent && (intent.metadata?.intake_id || intent.metadata?.request_id)
        && (intent.metadata.intake_id || intent.metadata.request_id) !== intake.id) return null
      return session
    } catch {
      reportCheckoutProviderFailure("restored_session_inspect")
      return null
    }
  }
  let session = await inspect()
  if (!session) return blocked("provider_lookup_unresolved")
  const paid = () => session?.payment_status === "paid" || (typeof session?.payment_intent === "object" && session?.payment_intent?.status === "succeeded")
  if (paid()) return existing()
  const inFlight = () => typeof session?.payment_intent === "object" && ["processing", "requires_capture"].includes(session?.payment_intent?.status ?? "")
  if (inFlight() || session.status === "complete") return blocked("payment_in_flight")
  if (session.status === "open" && session.payment_status === "unpaid") {
    const intent = session.payment_intent
    if (intent && (typeof intent !== "object" || !["requires_payment_method", "requires_confirmation", "requires_action", "canceled"].includes(intent.status))) {
      return blocked("unknown_provider_intent_state")
    }
    // The expanded inspection above owns the exact Session/intent proof.
    // Keep this bounded to one expire attempt and never forward Stripe's raw
    // exception through the generic session-safety logger.
    let expirationFailed = false
    try {
      await stripe.checkout.sessions.expire(intake.payment_id)
    } catch {
      expirationFailed = true
    }
    // Even a successful expire response is not read-back proof.
    session = await inspect()
    if (paid()) return existing()
    if (expirationFailed) reportCheckoutProviderFailure("restored_session_expire")
    if (!session) return blocked("invalidation_unconfirmed")
  }
  if (!session || session.status !== "expired" || session.payment_status !== "unpaid"
    || (session.payment_intent !== null && (typeof session.payment_intent !== "object" || session.payment_intent.status !== "canceled"))) {
    return blocked("provider_not_terminal_unpaid")
  }

  // Reassert every stored payment/cancellation field after provider IO. A
  // changed row or lost response blocks recovery. The terminal row stays
  // terminal, so existing attach/retry guards cannot create another session.
  let query = supabase.from("intakes").update({ updated_at: new Date().toISOString() })
    .eq("id", intake.id).eq("patient_id", patientId).eq("status", intake.status)
    .eq("payment_id", intake.payment_id).eq("payment_status", intake.payment_status!)
  query = intake.checkout_error === null ? query.is("checkout_error", null) : query.eq("checkout_error", intake.checkout_error)
  const { data, error } = await query.select("id")
  if (error) {
    reportCheckoutPersistenceFailure("terminal_recovery_compare_and_set", error.code)
    return blocked("reconciliation_write_failed")
  }
  if (!data || data.length !== 1) return blocked("payment_state_changed")
  logger.info("Restored terminal checkout verified unpayable", { reason: "provider_expired_unpaid" })
  return checkoutFailure("auth_or_session", "Your previous request is closed and its payment session has expired. Start this request over and complete the form again to continue.", { requiresFreshRequest: true })
}
