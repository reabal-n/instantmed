import * as Sentry from "@sentry/nextjs"
import type Stripe from "stripe"

import { createLogger } from "@/lib/observability/logger"

import type { HandlerResult, WebhookContext } from "./types"

const log = createLogger("stripe-webhook:invoice-payment-failed")

/**
 * Handles invoice.payment_failed.
 *
 * Fires when a subscription renewal card declines. Marks the subscription
 * as past_due, zeroes remaining credits, and emails the patient.
 */
export async function handleInvoicePaymentFailed(ctx: WebhookContext): Promise<HandlerResult> {
  const { event, supabase } = ctx
  const invoice = event.data.object as Stripe.Invoice

  // Extract the subscription ID from the invoice (may be string or expanded object)
  const invoiceRecord = invoice as unknown as Record<string, unknown>
  const subscriptionField = invoiceRecord.subscription as string | { id: string } | null
  const subscriptionId =
    typeof subscriptionField === "string"
      ? subscriptionField
      : subscriptionField?.id ?? null

  if (!subscriptionId) {
    log.info("Skipping invoice.payment_failed without subscription", { invoiceId: invoice.id })
    return
  }

  log.info("Processing subscription payment failure", {
    invoiceId: invoice.id,
    subscriptionId,
  })

  // Find the subscription + profile in one query
  const { data: subscription, error: fetchError } = await supabase
    .from("subscriptions")
    .select("id, profile_id")
    .eq("stripe_subscription_id", subscriptionId)
    .maybeSingle()

  if (fetchError) {
    log.error("Failed to fetch subscription", { subscriptionId }, fetchError)
    Sentry.captureException(fetchError, {
      tags: { source: "stripe-webhook", event_type: event.type },
      extra: { subscriptionId, invoiceId: invoice.id },
    })
  }

  if (!subscription) {
    Sentry.captureMessage("invoice.payment_failed: subscription not found in DB", {
      level: "warning",
      tags: { source: "stripe-webhook", event_type: event.type },
      extra: { subscriptionId, invoiceId: invoice.id },
    })
    log.warn("Subscription not found for failed invoice", { subscriptionId })
    return
  }

  // Mark subscription as past_due and zero out credits
  const { error: updateError } = await supabase
    .from("subscriptions")
    .update({
      status: "past_due",
      credits_remaining: 0,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscriptionId)

  if (updateError) {
    log.error("Failed to mark subscription as past_due", { subscriptionId }, updateError)
    Sentry.captureException(updateError, {
      tags: { source: "stripe-webhook", event_type: event.type },
      extra: { subscriptionId, invoiceId: invoice.id },
    })
  } else {
    log.info("Subscription marked as past_due", { subscriptionId })
  }

  // Fetch patient profile for email
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("email, full_name")
    .eq("id", subscription.profile_id)
    .maybeSingle()

  if (profileError || !profile) {
    Sentry.captureMessage("invoice.payment_failed: patient profile not found", {
      level: "warning",
      tags: { source: "stripe-webhook", event_type: event.type },
      extra: { subscriptionId, profileId: subscription.profile_id, invoiceId: invoice.id },
    })
    log.warn("Patient profile not found for subscription payment failure", {
      subscriptionId,
      profileId: subscription.profile_id,
    })
    return
  }

  // Send payment failed email (non-blocking, non-critical)
  try {
    const React = await import("react")
    const { sendEmail } = await import("@/lib/email/send-email")
    const { PaymentFailedEmail, paymentFailedSubject } = await import(
      "@/lib/email/components/templates/payment-failed"
    )

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au"

    await sendEmail({
      to: profile.email,
      toName: profile.full_name || undefined,
      subject: paymentFailedSubject("Repeat Rx Subscription"),
      template: React.createElement(PaymentFailedEmail, {
        patientName: profile.full_name || "there",
        serviceName: "Repeat Rx Subscription",
        failureReason: "Your card was declined when we attempted to renew your subscription.",
        retryUrl: `${appUrl}/patient`,
      }),
      emailType: "payment_failed",
      patientId: subscription.profile_id,
    })

    log.info("Subscription payment failed email sent", {
      subscriptionId,
      email: profile.email,
    })
  } catch (emailErr) {
    log.error("Failed to send subscription payment failed email (non-fatal)", { subscriptionId }, emailErr)
  }
}
