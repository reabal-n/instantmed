import { after, NextResponse } from "next/server"
import type Stripe from "stripe"

import { runGoogleAdsConversionAdjustment } from "@/lib/analytics/google-ads-conversion-adjustments"
import { sendRefundEmail } from "@/lib/email/template-sender"
import { createLogger } from "@/lib/observability/logger"
import { stripe } from "@/lib/stripe/client"
import {
  persistStripeRefundEventEvidence,
  reconcilePersistedStripeRefundState,
  reportStripeRefundEvidenceFailure,
} from "@/lib/stripe/refund-event-persistence"

import type { HandlerResult, WebhookContext } from "./types"
import { addToDeadLetterQueue, tryClaimEvent } from "./utils"

const log = createLogger("stripe-webhook:charge-refunded")

/**
 * Greet the patient by their first name with safe capitalisation. The
 * `profiles.full_name` column stores whatever the patient typed at signup,
 * which often has lower-case surnames or odd capitalisation. Splitting to
 * the first token and Title-casing it avoids "Hi sarah roberts," in
 * automated refund emails. Falls back to "there" when no name is on file.
 */
function greetingFirstName(name: string | null | undefined): string {
  if (!name) return "there"
  const first = name.trim().split(/\s+/)[0]
  if (!first) return "there"
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase()
}

function latestRefund(refunds: Stripe.Refund[]): Stripe.Refund | null {
  const cashRefunds = refunds.filter((refund) =>
    refund.status === "succeeded" &&
    !refund.failure_balance_transaction &&
    typeof refund.balance_transaction === "object" &&
    refund.balance_transaction?.object === "balance_transaction",
  )
  if (!cashRefunds.length) return null

  return cashRefunds.reduce((latest, refund) => {
    if (!latest) return refund
    return refundCashEpochSeconds(refund) > refundCashEpochSeconds(latest)
      ? refund
      : latest
  }, null as Stripe.Refund | null)
}

function refundCashEpochSeconds(refund: Stripe.Refund): number {
  return typeof refund.balance_transaction === "object"
    ? refund.balance_transaction?.created ?? 0
    : 0
}

function outstandingRefundCents(refunds: Stripe.Refund[]): number {
  return refunds.reduce((sum, refund) =>
    refund.status === "succeeded" &&
    !refund.failure_balance_transaction &&
    refundCashEpochSeconds(refund) > 0
      ? sum + refund.amount
      : sum,
  0)
}

export async function handleChargeRefunded(ctx: WebhookContext): Promise<HandlerResult> {
  const { event, supabase } = ctx
  const charge = event.data.object as Stripe.Charge
  const paymentIntentId = typeof charge.payment_intent === "string"
    ? charge.payment_intent
    : charge.payment_intent?.id

  log.info("charge.refunded received", {
    eventId: event.id,
    chargeId: charge.id,
    paymentIntentId,
    amountRefunded: charge.amount_refunded,
  })

  const evidence = await persistStripeRefundEventEvidence(ctx)
  if (evidence.error) {
    reportStripeRefundEvidenceFailure(ctx.event, evidence.error)
    if (!ctx.adminReplay) {
      await addToDeadLetterQueue(
        supabase,
        event.id,
        event.type,
        charge.id,
        evidence.intakeId,
        evidence.error,
        "REFUND_EVIDENCE_UNAVAILABLE",
        event as unknown as Record<string, unknown>,
      )
    }
    return NextResponse.json({ error: "Refund evidence unavailable" }, { status: 500 })
  }

  const latest = latestRefund(evidence.refunds)
  if (
    !latest ||
    outstandingRefundCents(evidence.refunds) !== charge.amount_refunded
  ) {
    const error = "Stripe refund objects do not reconcile to the charge refund total"
    reportStripeRefundEvidenceFailure(ctx.event, error)
    if (!ctx.adminReplay) {
      await addToDeadLetterQueue(
        supabase,
        event.id,
        event.type,
        charge.id,
        evidence.intakeId,
        error,
        "REFUND_CHARGE_TOTAL_MISMATCH",
        event as unknown as Record<string, unknown>,
      )
    }
    return NextResponse.json({ error: "Refund evidence unavailable" }, { status: 500 })
  }

  const reconciliationError = await reconcilePersistedStripeRefundState({
    intakeId: evidence.intakeId,
    livemode: event.livemode,
    refunds: evidence.refunds,
    supabase,
  })
  if (reconciliationError) {
    reportStripeRefundEvidenceFailure(ctx.event, reconciliationError)
    if (!ctx.adminReplay) {
      await addToDeadLetterQueue(
        supabase,
        event.id,
        event.type,
        charge.id,
        evidence.intakeId,
        reconciliationError,
        "REFUND_STATE_RECONCILIATION_FAILED",
        event as unknown as Record<string, unknown>,
      )
    }
    return NextResponse.json({ error: "Refund evidence unavailable" }, { status: 500 })
  }

  const shouldProcess = ctx.adminReplay || await tryClaimEvent(supabase, event.id, event.type, undefined, charge.id)
  if (!shouldProcess) {
    return NextResponse.json({ received: true, skipped: true })
  }

  if (paymentIntentId) {
    // Update intake payment_status based on refund
    const isFullRefund = charge.amount_refunded === charge.amount
    const timestamp = new Date().toISOString()
    const refundedAt = new Date(refundCashEpochSeconds(latest) * 1000).toISOString()
    const refundStripeId = latest.id
    // Record the amount actually refunded, clamped to the charge as a safe floor
    // against malformed Stripe payloads. intakes.amount_cents is reconciled to
    // session.amount_total on the paid transition (see checkout-session-completed.ts),
    // so it now equals charge.amount — the historical list-price drift this clamp
    // guarded against no longer exists for orders paid after that change.
    const refundAmountCents = Math.min(charge.amount_refunded, charge.amount)
    const intakeRefundUpdate = {
      payment_status: isFullRefund ? "refunded" : "partially_refunded",
      refund_status: "succeeded",
      refund_stripe_id: refundStripeId,
      refund_amount_cents: refundAmountCents,
      refunded_at: refundedAt,
      updated_at: timestamp,
    }

    // First try to find intake by stripe_payment_intent_id if we stored it
    let updateResult = await supabase
      .from("intakes")
      .update(intakeRefundUpdate)
      .eq("stripe_payment_intent_id", paymentIntentId)
      .select("id")

    // If no rows updated, try looking up via Stripe API to get session ID
    if (!updateResult.data?.length) {
      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
        const metadataIntakeId = paymentIntent.metadata?.intake_id || paymentIntent.metadata?.request_id
        const sessionId = paymentIntent.metadata?.checkout_session_id

        if (metadataIntakeId) {
          updateResult = await supabase
            .from("intakes")
            .update(intakeRefundUpdate)
            .eq("id", metadataIntakeId)
            .select("id")
        } else if (sessionId) {
          updateResult = await supabase
            .from("intakes")
            .update(intakeRefundUpdate)
            .eq("payment_id", sessionId)
            .select("id")
        }
      } catch (stripeError) {
        log.warn("Could not retrieve payment intent for refund lookup", {
          paymentIntentId,
          error: stripeError instanceof Error ? stripeError.message : "Unknown error",
        })
      }
    }

    // Also update legacy payments table if it exists
    await supabase
      .from("payments")
      .update({
        status: "refunded",
        refund_status: "refunded",
        refund_amount: charge.amount_refunded,
        stripe_refund_id: refundStripeId,
        refunded_at: refundedAt,
        updated_at: timestamp,
      })
      .eq("stripe_payment_intent_id", paymentIntentId)

    if (updateResult.error) {
      log.error("Error updating intake after refund", { paymentIntentId }, updateResult.error)
    } else if (updateResult.data?.length) {
      const intakeId = updateResult.data[0].id
      log.info("Intake payment status updated after refund", {
        paymentIntentId,
        intakeId,
        isFullRefund,
        amountRefunded: charge.amount_refunded,
      })

      // Send refund notification email (non-blocking to respect Stripe 3s timeout).
      // If this fails, the email-dispatcher cron will retry from the outbox.
      // Uses after() to keep the serverless function alive until email completes.
      const refundIntakeId = intakeId
      const refundAmountCents = charge.amount_refunded
      const refundIsFullRefund = isFullRefund
      const refundPaymentStatus = isFullRefund ? "refunded" : "partially_refunded"
      const paidAmountCents = charge.amount

      after(async () => {
        await runGoogleAdsConversionAdjustment({
          adjustmentDateTime: new Date(refundedAt),
          amountCents: paidAmountCents,
          intakeId: refundIntakeId,
          paymentStatus: refundPaymentStatus,
          refundAmountCents,
          requestPath: "/api/stripe/webhook",
          source: "stripe_charge_refunded",
          supabase,
        })
      })

      after(async () => {
        try {
          const { data: intake } = await supabase
            .from("intakes")
            .select("id, patient_id, priority_fee_refunded_at")
            .eq("id", refundIntakeId)
            .single()

          // A partial refund on a breach-refunded intake is the priority-fee
          // auto-refund echoing back through Stripe — the stale-queue cron
          // already sent the tailored breach email, so the generic "refund
          // processed" notice would be a duplicate. Full refunds (decline
          // top-ups) still notify normally.
          if (!refundIsFullRefund && intake?.priority_fee_refunded_at) {
            log.info("Skipping refund email for priority breach partial", {
              intakeId: refundIntakeId,
            })
            return
          }

          if (intake?.patient_id) {
            const { data: patient } = await supabase
              .from("profiles")
              .select("id, full_name, email")
              .eq("id", intake.patient_id)
              .single()

            if (patient?.email) {
              const amountFormatted = `$${(refundAmountCents / 100).toFixed(2)}`
              const emailResult = await sendRefundEmail({
                to: patient.email,
                patientName: greetingFirstName(patient.full_name),
                amount: amountFormatted,
                refundReason: refundIsFullRefund ? "Your request was declined or cancelled" : "Partial refund processed",
                intakeId: refundIntakeId,
                patientId: patient.id,
              })
              if (emailResult.success) {
                log.info("Refund notification email sent", { intakeId: refundIntakeId })
              } else {
                log.error("Refund notification email failed", {
                  intakeId: refundIntakeId,
                  error: emailResult.error,
                })
              }
            }
          }
        } catch (emailError) {
          log.error("Failed to send refund notification email", { intakeId: refundIntakeId }, emailError)
        }
      })
    } else {
      log.warn("No intake found to update for refund", { paymentIntentId })
    }
  }
}
