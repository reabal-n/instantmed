import { describe, expect, it } from "vitest"

import {
  canDoctorApprove,
  getStatusLabel,
  IntakeLifecycleError,
  isIntakePaid,
  isValidIntakeStatus,
  logTransitionAttempt,
  logTransitionFailure,
  logTransitionSuccess,
  validateIntakeStatusTransition,
} from "@/lib/data/intake-lifecycle"

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

  it("rejects an unknown current status", () => {
    expect(validateIntakeStatusTransition("nonsense" as never, "paid", "paid")).toMatchObject({
      valid: false,
      code: "INVALID_STATUS",
    })
  })

  it("rejects an unknown target status", () => {
    expect(validateIntakeStatusTransition("paid", "nonsense" as never, "paid")).toMatchObject({
      valid: false,
      code: "INVALID_STATUS",
    })
  })

  it("blocks any transition out of a terminal state", () => {
    expect(validateIntakeStatusTransition("completed", "paid", "paid")).toMatchObject({
      valid: false,
      code: "TERMINAL_STATE",
    })
  })

  it("blocks an otherwise-valid transition when payment is not settled", () => {
    expect(validateIntakeStatusTransition("paid", "approved", "unpaid")).toMatchObject({
      valid: false,
      code: "PAYMENT_REQUIRED",
    })
  })

  it("allows draft → cancelled without payment", () => {
    expect(validateIntakeStatusTransition("draft", "cancelled", "unpaid")).toMatchObject({ valid: true })
  })
})

describe("isIntakePaid", () => {
  it("is true only for the paid payment_status", () => {
    expect(isIntakePaid("paid")).toBe(true)
    expect(isIntakePaid("unpaid")).toBe(false)
    expect(isIntakePaid("refunded")).toBe(false)
  })
})

describe("canDoctorApprove", () => {
  it("refuses to approve an unpaid intake", () => {
    expect(canDoctorApprove("paid", "unpaid")).toMatchObject({ valid: false, code: "PAYMENT_REQUIRED" })
  })

  it("refuses to approve a terminal intake", () => {
    expect(canDoctorApprove("declined", "paid")).toMatchObject({ valid: false, code: "TERMINAL_STATE" })
  })

  it("refuses to approve from a non-reviewable status", () => {
    expect(canDoctorApprove("draft", "paid")).toMatchObject({ valid: false, code: "INVALID_TRANSITION" })
  })

  it("allows approval from paid / in_review / pending_info / escalated / awaiting_script", () => {
    for (const status of ["paid", "in_review", "pending_info", "escalated", "awaiting_script"] as const) {
      expect(canDoctorApprove(status, "paid")).toMatchObject({ valid: true })
    }
  })
})

describe("isValidIntakeStatus", () => {
  it("accepts every known status and rejects unknowns", () => {
    expect(isValidIntakeStatus("awaiting_script")).toBe(true)
    expect(isValidIntakeStatus("checkout_failed")).toBe(true)
    expect(isValidIntakeStatus("totally-made-up")).toBe(false)
  })
})

describe("getStatusLabel", () => {
  it("maps a known status to a human label", () => {
    expect(getStatusLabel("paid")).toBe("In queue")
    expect(getStatusLabel("awaiting_script")).toBe("Awaiting Script")
  })

  it("falls back to the raw value for an unmapped status", () => {
    expect(getStatusLabel("mystery" as never)).toBe("mystery")
  })
})

describe("IntakeLifecycleError", () => {
  it("carries the code and transition context", () => {
    const err = new IntakeLifecycleError("nope", "INVALID_TRANSITION", {
      currentStatus: "paid",
      attemptedStatus: "completed",
      paymentStatus: "paid",
    })
    expect(err).toBeInstanceOf(Error)
    expect(err.name).toBe("IntakeLifecycleError")
    expect(err.code).toBe("INVALID_TRANSITION")
    expect(err.currentStatus).toBe("paid")
    expect(err.attemptedStatus).toBe("completed")
  })
})

describe("transition logging helpers", () => {
  it("run without throwing for each actor role", () => {
    expect(() => logTransitionAttempt("i1", "paid", "in_review", "paid", "doc-1", "doctor")).not.toThrow()
    expect(() => logTransitionSuccess("i1", "paid", "in_review", "doc-1")).not.toThrow()
    expect(() => logTransitionFailure("i1", "paid", "completed", "invalid", "doc-1")).not.toThrow()
  })
})
