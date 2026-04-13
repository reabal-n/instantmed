import { handleChargeDisputeCreated } from "./charge-dispute-created"
import { handleChargeRefunded } from "./charge-refunded"
import { handleAsyncPaymentFailed } from "./checkout-session-async-payment-failed"
import { handleAsyncPaymentSucceeded } from "./checkout-session-async-payment-succeeded"
import { handleCheckoutSessionCompleted } from "./checkout-session-completed"
import { handleCheckoutSessionExpired } from "./checkout-session-expired"
import { handleCustomerSubscriptionDeleted } from "./customer-subscription-deleted"
import { handleInvoicePaymentSucceeded } from "./invoice-payment-succeeded"
import { handlePaymentIntentFailed } from "./payment-intent-payment-failed"
import type { HandlerResult,WebhookContext } from "./types"

export type { HandlerResult,WebhookContext }

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
