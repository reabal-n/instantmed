import * as Sentry from "@sentry/nextjs"
import { after, NextResponse } from "next/server"
import type Stripe from "stripe"

import { runGoogleAdsConversionAdjustment } from "@/lib/analytics/google-ads-conversion-adjustments"
import { sendDisputeAlertEmail } from "@/lib/email/template-sender"
import { createLogger } from "@/lib/observability/logger"
import { stripe } from "@/lib/stripe/client"

import type { HandlerResult, WebhookContext } from "./types"
import { tryClaimEvent } from "./utils"

const log = createLogger("stripe-webhook:dispute-created")

export async function handleChargeDisputeCreated(ctx: WebhookContext): Promise<HandlerResult> {
  const { event, supabase } = ctx
  const dispute = event.data.object as Stripe.Dispute
  const chargeId = typeof dispute.charge === "string" ? dispute.charge : dispute.charge?.id

  log.error("DISPUTE CREATED - Immediate attention required", {
    eventId: event.id,
    disputeId: dispute.id,
    chargeId,
    amount: dispute.amount,
    reason: dispute.reason,
    status: dispute.status,
  })

  const shouldProcess = ctx.adminReplay || await tryClaimEvent(supabase, event.id, event.type, undefined, chargeId)
  if (!shouldProcess) {
    return NextResponse.json({ received: true, skipped: true })
  }

  // Find the intake associated with this charge
  let adjustmentAmountCents: number | null = null
  let adjustmentRefundAmountCents: number | null = null
  let intakeId: string | undefined
  try {
    if (chargeId) {
      const charge = await stripe.charges.retrieve(chargeId)
      const paymentIntentId = typeof charge.payment_intent === "string"
        ? charge.payment_intent
        : charge.payment_intent?.id

      if (paymentIntentId) {
        const { data: intake } = await supabase
          .from("intakes")
          .select("id, amount_cents, refund_amount_cents")
          .eq("stripe_payment_intent_id", paymentIntentId)
          .single()

        intakeId = intake?.id
        adjustmentAmountCents = (intake as { amount_cents?: number | null } | null)?.amount_cents ?? dispute.amount
        adjustmentRefundAmountCents =
          (intake as { refund_amount_cents?: number | null } | null)?.refund_amount_cents ?? 0
      }
    }
  } catch {
    // Intake lookup failed - continue with alerting
  }

  // Record dispute in database (upsert to handle duplicates)
  await supabase.from("stripe_disputes").upsert({
    dispute_id: dispute.id,
    charge_id: chargeId,
    intake_id: intakeId || null,
    amount: dispute.amount,
    currency: dispute.currency,
    reason: dispute.reason,
    status: dispute.status,
    created_at: new Date(dispute.created * 1000).toISOString(),
  }, { onConflict: "dispute_id", ignoreDuplicates: true })

  // Update intake if found
  if (intakeId) {
    await supabase
      .from("intakes")
      .update({
        payment_status: "disputed",
        dispute_id: dispute.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", intakeId)

    const disputedIntakeId = intakeId
    after(async () => {
      await runGoogleAdsConversionAdjustment({
        adjustmentDateTime: new Date(dispute.created * 1000),
        amountCents: adjustmentAmountCents ?? dispute.amount,
        intakeId: disputedIntakeId,
        paymentStatus: "disputed",
        refundAmountCents: adjustmentRefundAmountCents,
        requestPath: "/api/stripe/webhook",
        source: "stripe_charge_dispute_created",
        supabase,
      })
    })
  }

  // Alert admin team via Sentry and email
  Sentry.captureMessage(`Stripe Dispute Created: ${dispute.id}`, {
    level: "error",
    extra: {
      disputeId: dispute.id,
      chargeId,
      intakeId,
      amount: dispute.amount,
      reason: dispute.reason,
    },
  })

  // Send alert email to admin (non-blocking to respect Stripe 3s timeout).
  sendDisputeAlertEmail({
    disputeId: dispute.id,
    chargeId: chargeId || "unknown",
    intakeId,
    amount: (dispute.amount / 100).toFixed(2),
    currency: dispute.currency.toUpperCase(),
    reason: dispute.reason,
    evidenceDueBy: dispute.evidence_details?.due_by
      ? new Date(dispute.evidence_details.due_by * 1000).toISOString()
      : undefined,
  }).catch((emailError) => {
    log.error("Failed to send dispute alert email", { disputeId: dispute.id }, emailError)
  })
}
