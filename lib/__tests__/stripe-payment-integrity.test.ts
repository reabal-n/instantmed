import { describe, expect, it } from "vitest"

import {
  buildPaymentIntentMetadata,
  canCancelUnpaidCheckoutIntake,
  canRetryPaymentForIntake,
  resolveGuestDuplicateCheckoutRecovery,
  validateCheckoutSessionIntakeMatch,
} from "@/lib/stripe/payment-integrity"

describe("Stripe payment integrity helpers", () => {
  it("copies checkout metadata onto PaymentIntents without undefined values", () => {
    expect(buildPaymentIntentMetadata({
      intake_id: "intake-1",
      patient_id: "patient-1",
      category: "medical_certificate",
      subtype: undefined,
    })).toEqual({
      intake_id: "intake-1",
      patient_id: "patient-1",
      category: "medical_certificate",
    })
  })

  it("allows retrying only unpaid checkout states", () => {
    expect(canRetryPaymentForIntake("pending_payment", "pending")).toBe(true)
    expect(canRetryPaymentForIntake("checkout_failed", "pending")).toBe(true)
    expect(canRetryPaymentForIntake("expired", "expired")).toBe(false)
    expect(canRetryPaymentForIntake("paid", "paid")).toBe(false)
  })

  it("allows cancelling failed unpaid checkouts to match the patient UI", () => {
    expect(canCancelUnpaidCheckoutIntake("draft", "unpaid")).toBe(true)
    expect(canCancelUnpaidCheckoutIntake("pending_payment", "pending")).toBe(true)
    expect(canCancelUnpaidCheckoutIntake("checkout_failed", "pending")).toBe(true)
    expect(canCancelUnpaidCheckoutIntake("checkout_failed", "paid")).toBe(false)
  })

  it("requires fallback verification sessions to match the intake metadata", () => {
    expect(validateCheckoutSessionIntakeMatch({
      intakeId: "intake-1",
      session: {
        id: "cs_paid",
        metadata: { intake_id: "intake-1" },
      },
      storedPaymentId: "cs_other",
    })).toEqual({ valid: true })

    expect(validateCheckoutSessionIntakeMatch({
      intakeId: "intake-1",
      session: {
        id: "cs_paid",
        metadata: { intake_id: "other-intake" },
      },
      storedPaymentId: "cs_paid",
    })).toEqual({
      reason: "metadata_intake_mismatch",
      valid: false,
    })
  })

  it("recovers duplicate guest checkout attempts without creating a second intake", () => {
    expect(resolveGuestDuplicateCheckoutRecovery({
      baseUrl: "https://instantmed.example",
      checkoutUrl: "https://checkout.stripe.com/c/pay/cs_existing",
      intake: {
        id: "intake-1",
        payment_id: "cs_existing",
        payment_status: "pending",
        status: "pending_payment",
      },
    })).toEqual({
      checkoutUrl: "https://checkout.stripe.com/c/pay/cs_existing",
      intakeId: "intake-1",
      success: true,
    })

    expect(resolveGuestDuplicateCheckoutRecovery({
      baseUrl: "https://instantmed.example",
      checkoutUrl: null,
      intake: {
        id: "intake-2",
        payment_id: "cs_paid",
        payment_status: "paid",
        status: "paid",
      },
    })).toEqual({
      checkoutUrl: "https://instantmed.example/auth/complete-account?intake_id=intake-2",
      intakeId: "intake-2",
      success: true,
    })
  })
})
