import type { WebhookContext, HandlerResult } from "./types"
import { handleCheckoutSessionCompleted } from "./checkout-session-completed"
import { handleCheckoutSessionExpired } from "./checkout-session-expired"
import { handleAsyncPaymentSucceeded } from "./checkout-session-async-payment-succeeded"
import { handleAsyncPaymentFailed } from "./checkout-session-async-payment-failed"
import { handleChargeRefunded } from "./charge-refunded"
import { handlePaymentIntentFailed } from "./payment-intent-payment-failed"
import { handleChargeDisputeCreated } from "./charge-dispute-created"
import { handleInvoicePaymentSucceeded } from "./invoice-payment-succeeded"
import { handleCustomerSubscriptionDeleted } from "./customer-subscription-deleted"

export type { WebhookContext, HandlerResult }

type WebhookHandler = (ctx: WebhookContext) => Promise<HandlerResult>

/**
 * Map of Stripe event types to their handler functions.
 * Adding a new handler is a single line here + a new handler file.
 */
export const handlers: ReadonlyMap<string, WebhookHandler> = new Map([
  ["checkout.session.completed", handleCheckoutSessionCompleted],
  ["checkout.session.expired", handleCheckoutSessionExpired],
  ["checkout.session.async_payment_succeeded", handleAsyncPaymentSucceeded],
  ["checkout.session.async_payment_failed", handleAsyncPaymentFailed],
  ["charge.refunded", handleChargeRefunded],
  ["payment_intent.payment_failed", handlePaymentIntentFailed],
  ["charge.dispute.created", handleChargeDisputeCreated],
  ["invoice.payment_succeeded", handleInvoicePaymentSucceeded],
  ["customer.subscription.deleted", handleCustomerSubscriptionDeleted],
])
