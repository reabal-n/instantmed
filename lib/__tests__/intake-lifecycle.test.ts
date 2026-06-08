import { describe, expect, it } from "vitest"

import { validateIntakeStatusTransition } from "@/lib/data/intake-lifecycle"

describe("validateIntakeStatusTransition", () => {
  it("allows an in-review prescribing case to move to awaiting script", () => {
    expect(validateIntakeStatusTransition("in_review", "awaiting_script", "paid")).toMatchObject({
      valid: true,
    })
  })

  // Regression guard: 2026-06-09 incident — customer paid after a failed Stripe
  // session, webhook rejected checkout_failed→paid, intake stuck 10 days.
  it("allows checkout_failed → paid (customer retried payment and Stripe confirmed)", () => {
    expect(validateIntakeStatusTransition("checkout_failed", "paid", "paid")).toMatchObject({
      valid: true,
    })
  })

  it("blocks checkout_failed from moving directly to in_review (must go paid first)", () => {
    expect(validateIntakeStatusTransition("checkout_failed", "in_review", "paid")).toMatchObject({
      valid: false,
    })
  })

  it("blocks checkout_failed from moving to terminal states other than cancelled", () => {
    expect(validateIntakeStatusTransition("checkout_failed", "declined", "failed")).toMatchObject({
      valid: false,
    })
    expect(validateIntakeStatusTransition("checkout_failed", "completed", "failed")).toMatchObject({
      valid: false,
    })
  })

  it("allows checkout_failed → pending_payment (retry flow)", () => {
    expect(validateIntakeStatusTransition("checkout_failed", "pending_payment", "pending")).toMatchObject({
      valid: true,
    })
  })
})
