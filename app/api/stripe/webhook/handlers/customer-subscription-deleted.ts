import * as Sentry from "@sentry/nextjs"
import type Stripe from "stripe"

import { createLogger } from "@/lib/observability/logger"

import type { HandlerResult, WebhookContext } from "./types"

const log = createLogger("stripe-webhook:subscription-deleted")

/**
 * Handles customer.subscription.deleted.
 *
 * When a subscription is cancelled (either by customer via Stripe portal
 * or by admin), mark the subscription record as cancelled and email
 * the patient a cancellation confirmation.
 */
export async function handleCustomerSubscriptionDeleted(ctx: WebhookContext): Promise<HandlerResult> {
  const { event, supabase } = ctx
  const subscription = event.data.object as Stripe.Subscription

  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id

  log.info("Processing subscription cancellation", {
    subscriptionId: subscription.id,
    customerId,
  })

  // Find the subscription record (needed for profile_id and period end date)
  const { data: subscriptionRecord, error: fetchError } = await supabase
    .from("subscriptions")
    .select("id, profile_id, current_period_end")
    .eq("stripe_subscription_id", subscription.id)
    .maybeSingle()

  if (fetchError) {
    log.error("Failed to fetch subscription record", { subscriptionId: subscription.id }, fetchError)
    Sentry.captureException(fetchError, {
      tags: { source: "stripe-webhook", event_type: event.type },
      extra: { subscriptionId: subscription.id },
    })
  }

  if (!subscriptionRecord) {
    Sentry.captureMessage("customer.subscription.deleted: subscription not found in DB", {
      level: "warning",
      tags: { source: "stripe-webhook", event_type: event.type },
      extra: { subscriptionId: subscription.id },
    })
    log.warn("Subscription not found — skipping DB update and email", {
      subscriptionId: subscription.id,
    })
    return
  }

  // Mark as cancelled
  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id)

  if (error) {
    log.error("Failed to mark subscription as cancelled", { subscriptionId: subscription.id }, error)
  } else {
    log.info("Subscription marked as cancelled", { subscriptionId: subscription.id })
  }

  // Send cancellation confirmation email (non-blocking)
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", subscriptionRecord.profile_id)
      .maybeSingle()

    if (profile?.email) {
      const React = await import("react")
      const { sendEmail } = await import("@/lib/email/send-email")
      const { SubscriptionCancelledEmail, subscriptionCancelledSubject } = await import(
        "@/lib/email/components/templates/subscription-cancelled"
      )

      // Format the period end date for display (e.g. "30 April 2026")
      // Use DB-stored value — current_period_end was removed from Stripe.Subscription in v22+
      const periodEndDate = subscriptionRecord.current_period_end
        ? new Date(subscriptionRecord.current_period_end).toLocaleDateString("en-AU", {
            timeZone: "Australia/Sydney",
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        : "the end of your current billing period"

      await sendEmail({
        to: profile.email,
        toName: profile.full_name || undefined,
        subject: subscriptionCancelledSubject,
        template: React.createElement(SubscriptionCancelledEmail, {
          patientName: profile.full_name || "there",
          currentPeriodEnd: periodEndDate,
        }),
        emailType: "subscription_cancelled",
        patientId: subscriptionRecord.profile_id,
      })

      log.info("Subscription cancellation email sent", {
        subscriptionId: subscription.id,
      })
    }
  } catch (emailErr) {
    log.error("Failed to send subscription cancellation email (non-fatal)", {
      subscriptionId: subscription.id,
    }, emailErr)
  }
}
