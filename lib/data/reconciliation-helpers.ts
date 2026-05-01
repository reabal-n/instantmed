export function getPaymentTraceabilityIssue({
  payment_id,
  payment_status,
  stripe_payment_intent_id,
}: {
  payment_id: string | null
  payment_status: string | null
  stripe_payment_intent_id: string | null
}): string | null {
  if (payment_status !== "paid" || stripe_payment_intent_id) {
    return null
  }

  if (!payment_id) {
    return "Paid request missing Stripe payment intent and checkout session"
  }

  return "Paid request missing Stripe payment intent"
}
