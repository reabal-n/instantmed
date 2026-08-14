import * as Sentry from "@sentry/nextjs"
import { NextResponse } from "next/server"
import type Stripe from "stripe"

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

  // Find the intake associated with this charge
  let intakeId: string | undefined
  try {
    let paymentIntentId = typeof dispute.payment_intent === "string"
      ? dispute.payment_intent
      : dispute.payment_intent?.id
    if (!paymentIntentId && chargeId) {
      const charge = await stripe.charges.retrieve(chargeId)
      paymentIntentId = typeof charge.payment_intent === "string"
        ? charge.payment_intent
        : charge.payment_intent?.id
    }

    if (paymentIntentId) {
      const { data: intake } = await supabase
        .from("intakes")
        .select("id")
        .eq("stripe_payment_intent_id", paymentIntentId)
        .maybeSingle()

      intakeId = intake?.id
    }
  } catch {
    // Intake lookup failed - continue with alerting
  }

  // Record dispute in database (upsert to handle duplicates)
  const { error: snapshotError } = await supabase.from("stripe_disputes").upsert({
    dispute_id: dispute.id,
    charge_id: chargeId,
    intake_id: intakeId || null,
    amount: dispute.amount,
    currency: dispute.currency,
    reason: dispute.reason,
    status: dispute.status,
    created_at: new Date(dispute.created * 1000).toISOString(),
  }, { onConflict: "dispute_id", ignoreDuplicates: true })
  if (snapshotError) {
    log.error("Failed to persist dispute snapshot", {
      disputeId: dispute.id,
      eventId: event.id,
    }, snapshotError)
    Sentry.captureMessage("Stripe dispute snapshot write failed", {
      level: "error",
      extra: { disputeId: dispute.id, eventId: event.id },
    })
    return NextResponse.json({ error: "Dispute snapshot unavailable" }, { status: 500 })
  }

  if (intakeId) {
    const { error: linkError } = await supabase
      .from("stripe_disputes")
      .update({ intake_id: intakeId })
      .eq("dispute_id", dispute.id)
      .is("intake_id", null)
    if (linkError) {
      log.error("Failed to link dispute snapshot to intake", {
        disputeId: dispute.id,
        eventId: event.id,
        intakeId,
      }, linkError)
      return NextResponse.json({ error: "Dispute snapshot unavailable" }, { status: 500 })
    }
  }

  // Claim only after the durable snapshot. A transient ledger failure must stay
  // retryable instead of permanently skipping the Stripe event on redelivery.
  const shouldProcess = ctx.adminReplay || await tryClaimEvent(
    supabase,
    event.id,
    event.type,
    intakeId,
    chargeId,
  )
  if (!shouldProcess) {
    return NextResponse.json({ received: true, skipped: true })
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
