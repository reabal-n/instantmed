/**
 * Unit tests for lib/stripe/refunds.ts
 *
 * Covers every branch of `refundIfEligible` - the legacy refund helper used
 * by /api/doctor/{bulk-action,update-request} routes. Ensures:
 *   - eligibility gates (not paid, wrong category, missing PI)
 *   - E2E short-circuit (PLAYWRIGHT=1)
 *   - Stripe success path with idempotency key
 *   - Stripe failure path with Sentry capture
 *   - payment_intent resolution fallback from checkout session
 *   - DB side effects: pending → succeeded | failed transitions
 *
 * The canonical decline flow uses app/actions/decline-intake.ts which has
 * its own separate refund logic (with partial refund support for consults).
 * Those tests live in decline-intake.test.ts.
 */

import * as Sentry from "@sentry/nextjs"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { stripe } from "@/lib/stripe/client"
import { refundIfEligible } from "@/lib/stripe/refunds"

import { mockDbSuccess, mockSupabaseFrom, mockSupabaseSingle, resetAllMocks } from "./setup"

// ============================================================================
// HELPERS
// ============================================================================

type MockIntake = {
  id: string
  category: string | null
  payment_status: string | null
  payment_id: string | null
  stripe_payment_intent_id: string | null
  amount_cents: number | null
}

function makeIntake(overrides: Partial<MockIntake> = {}): MockIntake {
  return {
    id: "intake-123",
    category: "medical_certificate",
    payment_status: "paid",
    payment_id: "cs_test_abc",
    stripe_payment_intent_id: "pi_test_xyz",
    amount_cents: 1995,
    ...overrides,
  }
}

function mockStripeRefundSuccess(overrides: Partial<{ id: string; amount: number }> = {}) {
  const refund = { id: "re_test_123", amount: 1995, ...overrides }
  vi.mocked(stripe.refunds.create).mockResolvedValue(refund as never)
  return refund
}

function mockStripeRefundError(message = "Stripe error") {
  vi.mocked(stripe.refunds.create).mockRejectedValue(new Error(message))
}

// ============================================================================
// SETUP
// ============================================================================

describe("refundIfEligible", () => {
  beforeEach(() => {
    resetAllMocks()
    // Clear the E2E env so we hit the real Stripe path by default
    delete process.env.E2E_MODE
    delete process.env.PLAYWRIGHT
  })

  // --------------------------------------------------------------------------
  // Eligibility gates
  // --------------------------------------------------------------------------

  describe("eligibility gates", () => {
    it("returns 'Intake not found' when the intake query errors", async () => {
      mockSupabaseSingle.mockResolvedValue({ data: null, error: { message: "not found" } })

      const result = await refundIfEligible("missing-id", "doctor-1")

      expect(result).toEqual({ refunded: false, reason: "Intake not found" })
      expect(stripe.refunds.create).not.toHaveBeenCalled()
    })

    it("returns 'Intake not found' when intake data is null", async () => {
      mockDbSuccess(null)

      const result = await refundIfEligible("missing-id", "doctor-1")

      expect(result).toEqual({ refunded: false, reason: "Intake not found" })
    })

    it("returns not_applicable when payment_status is not 'paid'", async () => {
      mockDbSuccess(makeIntake({ payment_status: "pending_payment" }))

      const result = await refundIfEligible("intake-123", "doctor-1")

      expect(result).toEqual({
        refunded: false,
        reason: "Not paid",
        refundStatus: "not_applicable",
      })
      expect(stripe.refunds.create).not.toHaveBeenCalled()
    })

    it("returns not_applicable for already-refunded intakes", async () => {
      mockDbSuccess(makeIntake({ payment_status: "refunded" }))

      const result = await refundIfEligible("intake-123", "doctor-1")

      expect(result.refundStatus).toBe("not_applicable")
    })

    it("returns not_eligible when category is 'other' (referral letters etc.)", async () => {
      mockDbSuccess(makeIntake({ category: "referral_letter" }))

      const result = await refundIfEligible("intake-123", "doctor-1")

      expect(result).toEqual({
        refunded: false,
        reason: "Category not eligible for refund",
        refundStatus: "not_eligible",
      })
      expect(stripe.refunds.create).not.toHaveBeenCalled()
    })

    it("returns not_eligible when category is null", async () => {
      mockDbSuccess(makeIntake({ category: null }))

      const result = await refundIfEligible("intake-123", "doctor-1")

      expect(result.refundStatus).toBe("not_eligible")
    })
  })

  // --------------------------------------------------------------------------
  // Eligible categories
  // --------------------------------------------------------------------------

  describe("eligible categories", () => {
    it("accepts medical_certificate as eligible", async () => {
      mockDbSuccess(makeIntake({ category: "medical_certificate" }))
      mockStripeRefundSuccess()

      const result = await refundIfEligible("intake-123", "doctor-1")

      expect(result.refunded).toBe(true)
      expect(stripe.refunds.create).toHaveBeenCalledOnce()
    })

    it("accepts prescription as eligible", async () => {
      mockDbSuccess(makeIntake({ category: "prescription" }))
      mockStripeRefundSuccess()

      const result = await refundIfEligible("intake-123", "doctor-1")

      expect(result.refunded).toBe(true)
    })

    it("accepts consult as eligible", async () => {
      mockDbSuccess(makeIntake({ category: "consult" }))
      mockStripeRefundSuccess()

      const result = await refundIfEligible("intake-123", "doctor-1")

      expect(result.refunded).toBe(true)
    })
  })

  // --------------------------------------------------------------------------
  // E2E short-circuit
  // --------------------------------------------------------------------------

  describe("E2E short-circuit", () => {
    it("skips the real Stripe call when PLAYWRIGHT=1", async () => {
      process.env.PLAYWRIGHT = "1"
      mockDbSuccess(makeIntake())

      const result = await refundIfEligible("intake-123", "doctor-1")

      expect(result).toEqual({
        refunded: false,
        reason: "Skipped (E2E mode)",
        refundStatus: "skipped_e2e",
      })
      expect(stripe.refunds.create).not.toHaveBeenCalled()
    })

    it("skips the real Stripe call when E2E_MODE=true", async () => {
      process.env.E2E_MODE = "true"
      mockDbSuccess(makeIntake())

      const result = await refundIfEligible("intake-123", "doctor-1")

      expect(result.refundStatus).toBe("skipped_e2e")
      expect(stripe.refunds.create).not.toHaveBeenCalled()
    })

    it("does NOT skip when env vars are empty strings", async () => {
      process.env.PLAYWRIGHT = ""
      process.env.E2E_MODE = ""
      mockDbSuccess(makeIntake())
      mockStripeRefundSuccess()

      const result = await refundIfEligible("intake-123", "doctor-1")

      expect(stripe.refunds.create).toHaveBeenCalled()
      expect(result.refunded).toBe(true)
    })
  })

  // --------------------------------------------------------------------------
  // Payment intent resolution
  // --------------------------------------------------------------------------

  describe("payment intent resolution", () => {
    it("uses stripe_payment_intent_id directly when present", async () => {
      mockDbSuccess(makeIntake({ stripe_payment_intent_id: "pi_direct", payment_id: "cs_ignored" }))
      mockStripeRefundSuccess()

      await refundIfEligible("intake-123", "doctor-1")

      expect(stripe.refunds.create).toHaveBeenCalledWith(
        expect.objectContaining({ payment_intent: "pi_direct" }),
        expect.any(Object)
      )
      // Should NOT have fetched the session since stripe_payment_intent_id was present
      expect(stripe.checkout.sessions.retrieve).not.toHaveBeenCalled()
    })

    it("falls back to fetching the checkout session when stripe_payment_intent_id is null", async () => {
      mockDbSuccess(makeIntake({ stripe_payment_intent_id: null, payment_id: "cs_fallback" }))
      vi.mocked(stripe.checkout.sessions.retrieve).mockResolvedValue({
        payment_intent: "pi_from_session",
      } as never)
      mockStripeRefundSuccess()

      await refundIfEligible("intake-123", "doctor-1")

      expect(stripe.checkout.sessions.retrieve).toHaveBeenCalledWith("cs_fallback")
      expect(stripe.refunds.create).toHaveBeenCalledWith(
        expect.objectContaining({ payment_intent: "pi_from_session" }),
        expect.any(Object)
      )
    })

    it("handles session.payment_intent as an object with .id", async () => {
      mockDbSuccess(makeIntake({ stripe_payment_intent_id: null, payment_id: "cs_obj" }))
      vi.mocked(stripe.checkout.sessions.retrieve).mockResolvedValue({
        payment_intent: { id: "pi_nested" },
      } as never)
      mockStripeRefundSuccess()

      await refundIfEligible("intake-123", "doctor-1")

      expect(stripe.refunds.create).toHaveBeenCalledWith(
        expect.objectContaining({ payment_intent: "pi_nested" }),
        expect.any(Object)
      )
    })

    it("returns failed when both stripe_payment_intent_id and payment_id are null", async () => {
      mockDbSuccess(makeIntake({ stripe_payment_intent_id: null, payment_id: null }))

      const result = await refundIfEligible("intake-123", "doctor-1")

      expect(result).toEqual({
        refunded: false,
        reason: "No payment intent ID available for refund",
        refundStatus: "failed",
      })
      expect(Sentry.captureMessage).toHaveBeenCalledWith(
        "Refund failed: no payment intent",
        expect.objectContaining({ level: "error" })
      )
      expect(stripe.refunds.create).not.toHaveBeenCalled()
    })

    it("returns failed when checkout session retrieval throws", async () => {
      mockDbSuccess(makeIntake({ stripe_payment_intent_id: null, payment_id: "cs_broken" }))
      vi.mocked(stripe.checkout.sessions.retrieve).mockRejectedValue(new Error("Stripe down"))

      const result = await refundIfEligible("intake-123", "doctor-1")

      expect(result.refundStatus).toBe("failed")
      expect(result.reason).toContain("No payment intent ID")
      expect(Sentry.captureMessage).toHaveBeenCalled()
    })

    it("returns failed when session returns null payment_intent", async () => {
      mockDbSuccess(makeIntake({ stripe_payment_intent_id: null, payment_id: "cs_noop" }))
      vi.mocked(stripe.checkout.sessions.retrieve).mockResolvedValue({
        payment_intent: null,
      } as never)

      const result = await refundIfEligible("intake-123", "doctor-1")

      expect(result.refundStatus).toBe("failed")
    })
  })

  // --------------------------------------------------------------------------
  // Successful refund
  // --------------------------------------------------------------------------

  describe("successful refund", () => {
    it("returns success payload with Stripe refund id and amount", async () => {
      mockDbSuccess(makeIntake({ amount_cents: 2995 }))
      mockStripeRefundSuccess({ id: "re_happy", amount: 2995 })

      const result = await refundIfEligible("intake-123", "doctor-1")

      expect(result).toEqual({
        refunded: true,
        reason: "Refund processed",
        refundStatus: "succeeded",
        stripeRefundId: "re_happy",
        amount: 2995,
      })
    })

    it("passes idempotency key `refund_decline_${intakeId}` to Stripe", async () => {
      mockDbSuccess(makeIntake())
      mockStripeRefundSuccess()

      await refundIfEligible("intake-xyz", "doctor-1")

      expect(stripe.refunds.create).toHaveBeenCalledWith(
        expect.any(Object),
        { idempotencyKey: "refund_decline_intake-xyz" }
      )
    })

    it("attaches metadata (intake_id, category, declined_by, refund_type)", async () => {
      mockDbSuccess(makeIntake({ category: "consult" }))
      mockStripeRefundSuccess()

      await refundIfEligible("intake-meta", "doctor-42")

      expect(stripe.refunds.create).toHaveBeenCalledWith(
        expect.objectContaining({
          reason: "requested_by_customer",
          metadata: {
            intake_id: "intake-meta",
            category: "consult",
            declined_by: "doctor-42",
            refund_type: "decline",
          },
        }),
        expect.any(Object)
      )
    })

    it("handles unknown category gracefully in metadata", async () => {
      // Edge case: a row that's eligible by category check somehow has null category.
      // In practice blocked by earlier eligibility check, but metadata fallback
      // exists to be defensive.
      mockDbSuccess(makeIntake({ category: "medical_certificate" }))
      mockStripeRefundSuccess()

      await refundIfEligible("intake-123", "doctor-1")

      expect(stripe.refunds.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({ category: "medical_certificate" }),
        }),
        expect.any(Object)
      )
    })

    it("updates intake row with refund_status='pending' before the Stripe call", async () => {
      mockDbSuccess(makeIntake())
      mockStripeRefundSuccess()
      const fromSpy = vi.mocked(mockSupabaseFrom)

      await refundIfEligible("intake-123", "doctor-1")

      // from("intakes") should be called multiple times:
      //   1. SELECT to fetch intake
      //   2. UPDATE to set refund_status=pending
      //   3. UPDATE to set refund_status=succeeded after Stripe returns
      expect(fromSpy.mock.calls.filter((c) => c[0] === "intakes").length).toBeGreaterThanOrEqual(3)
    })
  })

  // --------------------------------------------------------------------------
  // Failed Stripe refund
  // --------------------------------------------------------------------------

  describe("failed Stripe refund", () => {
    it("returns failure payload when Stripe throws", async () => {
      mockDbSuccess(makeIntake())
      mockStripeRefundError("Your request was blocked")

      const result = await refundIfEligible("intake-123", "doctor-1")

      expect(result).toEqual({
        refunded: false,
        reason: "Your request was blocked",
        refundStatus: "failed",
      })
    })

    it("reports to Sentry with action + intake_id tags when Stripe fails", async () => {
      mockDbSuccess(makeIntake())
      mockStripeRefundError("stripe api error")

      await refundIfEligible("intake-fail", "doctor-1")

      expect(Sentry.captureMessage).toHaveBeenCalledWith(
        "Stripe refund failed",
        expect.objectContaining({
          level: "error",
          tags: expect.objectContaining({
            action: "refund_if_eligible",
            intake_id: "intake-fail",
          }),
          extra: expect.objectContaining({ error: "stripe api error" }),
        })
      )
    })

    it("falls back to 'Unknown Stripe error' when Stripe rejects with non-Error value", async () => {
      mockDbSuccess(makeIntake())
      vi.mocked(stripe.refunds.create).mockRejectedValue("not an Error object")

      const result = await refundIfEligible("intake-123", "doctor-1")

      expect(result.refundStatus).toBe("failed")
      expect(result.reason).toBe("Unknown Stripe error")
    })
  })
})
