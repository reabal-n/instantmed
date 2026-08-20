import { describe, expect, it } from "vitest"

import { isClinicalHistoryIntake } from "@/lib/data/intakes/clinical-history"

describe("clinical history boundary", () => {
  it("excludes checkout-only rows while retaining genuine clinical episodes", () => {
    expect(isClinicalHistoryIntake({ payment_status: "unpaid", paid_at: null })).toBe(false)
    expect(isClinicalHistoryIntake({ payment_status: "pending", paid_at: null })).toBe(false)
    expect(isClinicalHistoryIntake({ payment_status: "failed", paid_at: null })).toBe(false)
    expect(isClinicalHistoryIntake({ payment_status: "expired", paid_at: null })).toBe(false)

    for (const paymentStatus of [
      "paid",
      "partially_refunded",
      "refunded",
      "refund_processing",
      "refund_failed",
      "disputed",
    ]) {
      expect(
        isClinicalHistoryIntake({ payment_status: paymentStatus, paid_at: null }),
      ).toBe(true)
    }
    expect(
      isClinicalHistoryIntake({
        payment_status: "unpaid",
        paid_at: "2026-08-20T01:00:00.000Z",
      }),
    ).toBe(true)
  })
})
