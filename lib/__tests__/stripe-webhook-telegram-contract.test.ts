import { describe, expect, it } from "vitest"

import { shouldSendPaidRequestTelegramNotification } from "@/app/api/stripe/webhook/handlers/checkout-session-completed"

describe("Stripe webhook Telegram contract", () => {
  it("requires a Telegram notification for every paid request, including fully discounted requests", () => {
    expect(shouldSendPaidRequestTelegramNotification({
      intakeId: "12345678-1234-1234-1234-123456789abc",
      paymentStatus: "paid",
      amountTotal: 0,
    })).toBe(true)
  })

  it("does not require a Telegram notification before payment is confirmed", () => {
    expect(shouldSendPaidRequestTelegramNotification({
      intakeId: "12345678-1234-1234-1234-123456789abc",
      paymentStatus: "unpaid",
      amountTotal: 2995,
    })).toBe(false)
  })
})
