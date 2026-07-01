import { describe, expect, it } from "vitest"

import {
  getPaymentRecoveryIndicator,
  type PaymentRecoveryIndicatorInput,
} from "@/lib/operator/cases/payment-recovery-indicator"

function row(overrides: Partial<PaymentRecoveryIndicatorInput>): PaymentRecoveryIndicatorInput {
  return {
    status: "paid",
    paymentStatus: "paid",
    ...overrides,
  }
}

describe("payment recovery indicator", () => {
  it("marks checkout_failed intakes as patient retry work", () => {
    expect(getPaymentRecoveryIndicator(row({
      status: "checkout_failed",
      paymentStatus: "failed",
    }))).toBe("payment_retry")
  })

  it("marks pending unpaid checkout as awaiting payment without treating it as a failure", () => {
    expect(getPaymentRecoveryIndicator(row({
      status: "pending_payment",
      paymentStatus: "pending",
    }))).toBe("payment_pending")
  })

  it("marks paid cancelled intakes as reconciliation work", () => {
    expect(getPaymentRecoveryIndicator(row({
      status: "cancelled",
      paymentStatus: "paid",
    }))).toBe("paid_cancelled")
  })

  it("does not show payment recovery work for refunded or completed rows", () => {
    expect(getPaymentRecoveryIndicator(row({
      status: "cancelled",
      paymentStatus: "refunded",
    }))).toBeNull()
    expect(getPaymentRecoveryIndicator(row({
      status: "completed",
      paymentStatus: "paid",
    }))).toBeNull()
  })
})
