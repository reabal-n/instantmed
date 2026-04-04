import type Stripe from "stripe"
import { createLogger } from "@/lib/observability/logger"
import type { WebhookContext, HandlerResult } from "./types"

const log = createLogger("stripe-webhook:subscription-deleted")

/**
 * Handles customer.subscription.deleted.
 *
 * When a subscription is cancelled (either by customer via Stripe portal
 * or by admin), mark the subscription record as cancelled.
 */
export async function handleCustomerSubscriptionDeleted(ctx: WebhookContext): Promise<HandlerResult> {
  const { event, supabase } = ctx
  const subscription = event.data.object as Stripe.Subscription

  log.info("Processing subscription cancellation", {
    subscriptionId: subscription.id,
    customerId: typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id,
  })

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
}
