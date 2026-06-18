import type { SupabaseClient } from "@supabase/supabase-js"

import { createLogger } from "@/lib/observability/logger"

const log = createLogger("stripe-webhook:payment-failure-recovery")

export type PaymentFailureIntakeEmailContext = {
  category?: string | null
  guest_email?: string | null
  patient?: { email?: string | null; full_name?: string | null } | Array<{ email?: string | null; full_name?: string | null }> | null
}

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

export async function markCheckoutRecoveryNudgeSent(
  supabase: SupabaseClient,
  intakeId: string,
  source: "checkout.session.async_payment_failed" | "payment_intent.payment_failed",
): Promise<void> {
  const { error } = await supabase
    .from("intakes")
    .update({ abandoned_email_sent_at: new Date().toISOString() })
    .eq("id", intakeId)
    .is("abandoned_email_sent_at", null)

  if (error) {
    log.warn("Failed to mark payment failure recovery as first checkout nudge", {
      intakeId,
      source,
      error: error.message,
    })
  }
}
