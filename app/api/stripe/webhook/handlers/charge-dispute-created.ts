import * as Sentry from "@sentry/nextjs"
import { NextResponse } from "next/server"
import type Stripe from "stripe"

import { sendDisputeAlertEmail } from "@/lib/email/template-sender"
import { createLogger } from "@/lib/observability/logger"
import { stripe } from "@/lib/stripe/client"

import type { HandlerResult, WebhookContext } from "./types"
import { addToDeadLetterQueue, tryClaimEvent } from "./utils"

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

  const intakeLookup = await resolveDisputeIntake(ctx, dispute, chargeId)
  if (intakeLookup.error) {
    return failCreatedRetryably(
      ctx,
      dispute.id,
      chargeId,
      null,
      intakeLookup.error,
    )
  }
  const intakeId = intakeLookup.intakeId ?? undefined

  // Record dispute in database (upsert to handle duplicates)
  const { error: snapshotError } = await supabase.from("stripe_disputes").upsert({
    dispute_id: dispute.id,
    charge_id: chargeId,
    intake_id: intakeId || null,
    livemode: event.livemode,
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
    return failCreatedRetryably(
      ctx,
      dispute.id,
      chargeId,
      intakeId ?? null,
      `Stripe dispute snapshot write failed: ${snapshotError.message}`,
    )
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
      return failCreatedRetryably(
        ctx,
        dispute.id,
        chargeId,
        intakeId,
        `Stripe dispute intake link failed: ${linkError.message}`,
      )
    }
  }

  const eventAt = Number.isInteger(event.created) && event.created > 0
    ? new Date(event.created * 1000).toISOString()
    : null
  if (!eventAt) {
    return failCreatedRetryably(
      ctx,
      dispute.id,
      chargeId,
      intakeId ?? null,
      "Stripe dispute creation event has no valid timestamp",
    )
  }
  const { error: statusError } = await supabase.rpc("record_stripe_dispute_status_event", {
    p_dispute_id: dispute.id,
    p_event_at: eventAt,
    p_event_id: event.id,
    p_livemode: event.livemode,
    p_status: dispute.status,
  })
  if (statusError) {
    return failCreatedRetryably(
      ctx,
      dispute.id,
      chargeId,
      intakeId ?? null,
      `Stripe dispute status write failed: ${statusError.message}`,
    )
  }

  const persistedLink = await supabase
    .from("stripe_disputes")
    .select("intake_id, livemode")
    .eq("dispute_id", dispute.id)
    .single()
  if (persistedLink.error) {
    return failCreatedRetryably(
      ctx,
      dispute.id,
      chargeId,
      intakeId ?? null,
      `Stripe dispute persisted link verification failed: ${persistedLink.error.message}`,
    )
  }
  if (
    persistedLink.data?.livemode !== event.livemode ||
    persistedLink.data?.intake_id !== (intakeId ?? null)
  ) {
    return failCreatedRetryably(
      ctx,
      dispute.id,
      chargeId,
      intakeId ?? null,
      "Stripe dispute persisted linkage conflicts with verified PaymentIntent evidence",
    )
  }
  if (event.livemode && !intakeId) {
    return failCreatedRetryably(
      ctx,
      dispute.id,
      chargeId,
      null,
      "Live Stripe dispute is not linked to an intake",
    )
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

async function resolveDisputeIntake(
  ctx: WebhookContext,
  dispute: Stripe.Dispute,
  chargeId: string | null,
): Promise<{ error: string | null; intakeId: string | null }> {
  let paymentIntentId = typeof dispute.payment_intent === "string"
    ? dispute.payment_intent
    : dispute.payment_intent?.id
  if (!paymentIntentId && chargeId) {
    try {
      const charge = await stripe.charges.retrieve(chargeId)
      paymentIntentId = typeof charge.payment_intent === "string"
        ? charge.payment_intent
        : charge.payment_intent?.id
    } catch {
      return { error: "Stripe dispute charge lookup failed", intakeId: null }
    }
  }
  if (!paymentIntentId) return { error: null, intakeId: null }

  const { data, error } = await ctx.supabase
    .from("intakes")
    .select("id")
    .eq("stripe_payment_intent_id", paymentIntentId)
    .maybeSingle()
  if (error) {
    return {
      error: `Stripe dispute intake lookup failed: ${error.message}`,
      intakeId: null,
    }
  }
  if (data?.id) return { error: null, intakeId: data.id }

  let paymentIntent: Stripe.PaymentIntent
  try {
    paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
  } catch {
    return { error: "Stripe dispute PaymentIntent metadata lookup failed", intakeId: null }
  }
  const metadataIntakeId = paymentIntent.metadata?.intake_id ||
    paymentIntent.metadata?.request_id
  if (!metadataIntakeId) return { error: null, intakeId: null }

  const metadataRead = await ctx.supabase
    .from("intakes")
    .select("id, stripe_payment_intent_id")
    .eq("id", metadataIntakeId)
    .maybeSingle()
  if (metadataRead.error) {
    return {
      error: `Stripe dispute metadata intake lookup failed: ${metadataRead.error.message}`,
      intakeId: null,
    }
  }
  if (!metadataRead.data) {
    return { error: "Stripe dispute PaymentIntent metadata intake is missing", intakeId: null }
  }
  if (
    metadataRead.data.stripe_payment_intent_id &&
    metadataRead.data.stripe_payment_intent_id !== paymentIntentId
  ) {
    return { error: "Stripe dispute PaymentIntent metadata conflicts with intake", intakeId: null }
  }
  return { error: null, intakeId: metadataRead.data.id }
}

async function failCreatedRetryably(
  ctx: WebhookContext,
  disputeId: string,
  chargeId: string | null,
  intakeId: string | null,
  message: string,
): Promise<NextResponse> {
  log.error(message, { disputeId, eventId: ctx.event.id, intakeId })
  Sentry.captureMessage("Stripe dispute creation persistence failed", {
    level: "error",
    tags: { source: "stripe-dispute-created" },
    extra: { disputeId, eventId: ctx.event.id, intakeId },
  })
  if (!ctx.adminReplay) {
    await addToDeadLetterQueue(
      ctx.supabase,
      ctx.event.id,
      ctx.event.type,
      chargeId ?? disputeId,
      intakeId,
      message,
      "DISPUTE_CREATED_PERSISTENCE_FAILED",
      ctx.event as unknown as Record<string, unknown>,
    )
  }
  return NextResponse.json({ error: "Dispute snapshot unavailable" }, { status: 500 })
}
