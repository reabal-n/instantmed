import type Stripe from "stripe"

import { createLogger } from "@/lib/observability/logger"

import type { HandlerResult, WebhookContext } from "./types"

const log = createLogger("stripe-webhook:subscription-updated")

/**
 * Handles customer.subscription.updated.
 *
 * Fires whenever a subscription's status changes (e.g. active → past_due,
 * past_due → active on recovery, active → cancelled, etc.).
 * Keeps the DB status column in sync with Stripe's source of truth.
 *
 * Email notifications for payment outcomes are handled by the dedicated
 * invoice.payment_failed / invoice.payment_succeeded handlers.
 */
export async function handleCustomerSubscriptionUpdated(ctx: WebhookContext): Promise<HandlerResult> {
  const { event, supabase } = ctx
  const subscription = event.data.object as Stripe.Subscription

  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id

  log.info("Processing subscription update", {
    subscriptionId: subscription.id,
    newStatus: subscription.status,
    customerId,
  })

  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: subscription.status,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id)

  if (error) {
    log.error("Failed to update subscription status", { subscriptionId: subscription.id }, error)
  } else {
    log.info("Subscription status synced", {
      subscriptionId: subscription.id,
      status: subscription.status,
    })
  }
}
