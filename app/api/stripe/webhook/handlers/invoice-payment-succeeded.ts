import type Stripe from "stripe"

import { createLogger } from "@/lib/observability/logger"

import type { HandlerResult,WebhookContext } from "./types"

const log = createLogger("stripe-webhook:invoice-payment-succeeded")

/**
 * Handles invoice.payment_succeeded for subscription billing.
 *
 * When a recurring subscription invoice is paid successfully:
 * 1. Reset subscription credits to 1 (one script per billing cycle)
 * 2. Update current_period_start/end from the invoice period
 *
 * First-invoice events (subscription creation) are handled in the
 * checkout.session.completed handler, so we skip those here.
 */
export async function handleInvoicePaymentSucceeded(ctx: WebhookContext): Promise<HandlerResult> {
  const { event, supabase } = ctx
  const invoice = event.data.object as Stripe.Invoice

  // Stripe Invoice.subscription can be a string ID or expanded Subscription object.
  // Stripe v22 types may omit the property depending on API version; access via
  // record index to avoid TS2339 without reintroducing `as any`.
  // Stripe v22 Invoice type may not expose .subscription directly
  const invoiceRecord = invoice as unknown as Record<string, unknown>
  const subscriptionField = invoiceRecord.subscription as string | { id: string } | null
  const subscriptionId = typeof subscriptionField === "string"
    ? subscriptionField
    : subscriptionField?.id ?? null

  if (!subscriptionId) {
    log.info("Skipping invoice without subscription", { invoiceId: invoice.id })
    return
  }

  // Skip the first invoice (handled at checkout.session.completed)
  if (invoice.billing_reason === "subscription_create") {
    log.info("Skipping subscription_create invoice", { subscriptionId })
    return
  }

  log.info("Processing subscription renewal", {
    invoiceId: invoice.id,
    subscriptionId,
    amount: invoice.amount_paid,
  })

  // Reset credits and update period
  const { error } = await supabase
    .from("subscriptions")
    .update({
      credits_remaining: 1,
      status: "active",
      current_period_start: invoice.period_start
        ? new Date(invoice.period_start * 1000).toISOString()
        : null,
      current_period_end: invoice.period_end
        ? new Date(invoice.period_end * 1000).toISOString()
        : null,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscriptionId)

  if (error) {
    log.error("Failed to reset subscription credits", { subscriptionId }, error)
  } else {
    log.info("Subscription credits reset", { subscriptionId })
  }
}
