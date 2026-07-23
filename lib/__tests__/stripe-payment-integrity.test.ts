import { describe, expect, it } from "vitest"

import {
  buildPaymentIntentMetadata,
  canCancelUnpaidCheckoutIntake,
  canRetryPaymentForIntake,
  resolveCompleteAccountPaymentState,
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
      checkoutUrl: "https://instantmed.example/auth/complete-account?intake_id=intake-2&session_id=cs_paid",
      intakeId: "intake-2",
      success: true,
    })
  })

  it("gives the terminal recovery fallback a support exit instead of promising a retry", () => {
    // Reached when the intake is payable but there is no live checkout URL and
    // no rebuilt one. Sometimes transient, sometimes not — the caller can't
    // tell. The old copy ("wait a few seconds and try again") read as
    // guaranteed-transient: one patient retried it 9 times with no way out.
    const result = resolveGuestDuplicateCheckoutRecovery({
      baseUrl: "https://instantmed.example",
      checkoutUrl: null,
      intake: {
        id: "intake-3",
        payment_id: "cs_limbo",
        payment_status: "pending",
        status: "pending_payment",
      },
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain("support@instantmed.com.au")
      expect(result.error).toMatch(/already paid/i)
      expect(result.error).not.toMatch(/few seconds/i)
    }
  })

  it("keeps complete-but-unpaid guest payments in processing until payment is confirmed", () => {
    expect(resolveCompleteAccountPaymentState({
      intakePaymentStatus: "pending",
      sessionMatches: true,
      sessionState: "payment_in_flight",
    })).toBe("processing")

    expect(resolveCompleteAccountPaymentState({
      intakePaymentStatus: "pending",
      sessionMatches: true,
      sessionState: "paid",
    })).toBe("paid")

    expect(resolveCompleteAccountPaymentState({
      intakePaymentStatus: "paid",
      sessionMatches: false,
      sessionState: null,
    })).toBe("unconfirmed")
  })

  it("does not confirm a Stripe payment when the requested session is not stored", () => {
    expect(resolveCompleteAccountPaymentState({
      intakePaymentStatus: "pending",
      sessionMatches: false,
      sessionState: "paid",
    })).toBe("unconfirmed")
  })

})
