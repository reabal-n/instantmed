import { describe, expect, it } from "vitest"

import {
  inferStripeLineItemFailureRole,
  stripePriceErrorUserMessage,
} from "@/lib/stripe/line-item-error"

describe("Stripe line item error helpers", () => {
  it("classifies base-service and priority-fee price failures by line-item position", () => {
    const lineItems = [
      { price: "price_med_cert", quantity: 1 },
      { price: "price_priority", quantity: 1 },
    ]

    expect(inferStripeLineItemFailureRole("No such price: price_med_cert", lineItems)).toBe("base_service")
    expect(inferStripeLineItemFailureRole("No such price: price_priority", lineItems)).toBe("priority_fee")
  })

  it("uses a separate patient recovery message for priority fee failures", () => {
    expect(stripePriceErrorUserMessage("priority_fee")).toBe(
      "Express Review is temporarily unavailable. Please try again without Express Review or contact support.",
    )
    expect(stripePriceErrorUserMessage("base_service")).toBe(
      "This service is temporarily unavailable. Please try again later.",
    )
  })
})
