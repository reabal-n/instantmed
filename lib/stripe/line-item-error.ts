type CheckoutLineItem = {
  price?: string | null
}

export type StripeLineItemFailureRole = "base_service" | "priority_fee" | "unknown"

export function inferStripeLineItemFailureRole(
  errorMessage: string,
  lineItems: CheckoutLineItem[] | undefined,
): StripeLineItemFailureRole {
  if (!errorMessage.includes("No such price") || !lineItems?.length) {
    return "unknown"
  }

  const failedIndex = lineItems.findIndex((item) => item.price && errorMessage.includes(item.price))
  if (failedIndex === 0) return "base_service"
  if (failedIndex > 0) return "priority_fee"
  return "unknown"
}

export function stripePriceErrorUserMessage(role: StripeLineItemFailureRole): string {
  if (role === "priority_fee") {
    return "Priority review is temporarily unavailable. Please try again without it or contact support."
  }

  return "This service is temporarily unavailable. Please try again later."
}
