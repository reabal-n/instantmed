"use server"

import { requireRoleOrNull } from "@/lib/auth/helpers"
import { getAppUrl } from "@/lib/config/env"
import { buildCheckoutPaymentRecoveryUrl } from "@/lib/email/recovery-links"
import { resolvePaymentRecoveryCanonicality } from "@/lib/stripe/canonical-payment-recovery"
import {
  HIGH_STAKES_PAYMENT_LOCK,
  inspectCheckoutSession,
} from "@/lib/stripe/checkout/checkout-session-safety"
import { canRetryPaymentForIntake } from "@/lib/stripe/payment-integrity"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type PaymentRescueResult =
  | {
      success: true
      data: { clipboardText: string; recoveryUrl: string }
    }
  | { success: false; error: string }

export async function buildPaymentRescueAction(
  intakeId: string,
): Promise<PaymentRescueResult> {
  if (!UUID_REGEX.test(intakeId)) {
    return { success: false, error: "Invalid request" }
  }

  const auth = await requireRoleOrNull(["admin", "support"])
  if (!auth) {
    return { success: false, error: "Unauthorized" }
  }

  const supabase = createServiceRoleClient()
  const { data: intake, error } = await supabase
    .from("intakes")
    .select(`
      id,
      category,
      created_at,
      status,
      payment_status,
      payment_id,
      checkout_error,
      guest_email,
      patient_id,
      subtype,
      patient:profiles!patient_id(auth_user_id, email, normalized_email)
    `)
    .eq("id", intakeId)
    .maybeSingle<{
      category: string | null
      checkout_error: string | null
      created_at: string
      guest_email: string | null
      id: string
      patient_id: string | null
      payment_id: string | null
      payment_status: string | null
      patient:
        | { auth_user_id: string | null; email: string | null; normalized_email: string | null }
        | { auth_user_id: string | null; email: string | null; normalized_email: string | null }[]
        | null
      status: string | null
      subtype: string | null
    }>()

  if (error || !intake) {
    return { success: false, error: "Request not found" }
  }
  if (intake.checkout_error === HIGH_STAKES_PAYMENT_LOCK) {
    return {
      success: false,
      error: "This request cannot be resumed safely. Check its status before replying.",
    }
  }
  if (!canRetryPaymentForIntake(intake.status, intake.payment_status)) {
    return {
      success: false,
      error: "This request is already paid or is no longer awaiting payment.",
    }
  }

  const patient = Array.isArray(intake.patient) ? intake.patient[0] : intake.patient
  const canonicality = await resolvePaymentRecoveryCanonicality(supabase, {
    category: intake.category,
    createdAt: intake.created_at,
    email: intake.guest_email || patient?.normalized_email || patient?.email,
    id: intake.id,
    patientId: intake.patient_id,
    subtype: intake.subtype,
  })
  if (canonicality.kind === "unresolved") {
    return {
      success: false,
      error: "Could not confirm the latest saved request. Refresh the ledger and try again.",
    }
  }
  if (canonicality.kind === "superseded") {
    return {
      success: false,
      error: "This is an older duplicate. Use the newest request in this service lane.",
    }
  }

  if (intake.payment_id) {
    const inspection = await inspectCheckoutSession(intake.payment_id, intake.id, {
      intakeStatus: intake.status,
      paymentStatus: intake.payment_status,
      storedPaymentId: intake.payment_id,
    })
    if (inspection.state === "paid" || inspection.state === "payment_in_flight") {
      return {
        success: false,
        error: "Payment is already complete or processing. Refresh the ledger before sending anything.",
      }
    }
    if (inspection.state === "unresolved") {
      return {
        success: false,
        error: "Payment status could not be confirmed. Check Stripe before sending anything.",
      }
    }
  }

  const recoveryUrl = buildCheckoutPaymentRecoveryUrl({
    appUrl: getAppUrl(),
    campaign: "support_payment_recovery",
    intakeId: intake.id,
    isGuest: Boolean(intake.guest_email) || patient?.auth_user_id == null,
  })

  return {
    success: true,
    data: {
      clipboardText:
        `We can't see a completed payment yet, but your request is saved. Use this link to finish payment: ${recoveryUrl}\n\n` +
        "If it still doesn't work, reply here and we'll sort it out.",
      recoveryUrl,
    },
  }
}
