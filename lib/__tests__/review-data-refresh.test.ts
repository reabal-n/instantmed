import { describe, expect, it } from "vitest"

import { getPrescriptionRecordedEvidenceKey } from "@/lib/doctor/review-data-refresh"

function reviewSnapshot({
  intakeId = "intake-1",
  scriptSent,
  scriptSentAt = null,
}: {
  intakeId?: string
  scriptSent: boolean | null
  scriptSentAt?: string | null
}) {
  return {
    intake: {
      id: intakeId,
      script_sent: scriptSent,
      script_sent_at: scriptSentAt,
    },
  }
}

describe("targeted doctor review refresh", () => {
  it("announces only a durable false-to-true fulfilment transition for the same request", () => {
    const previous = reviewSnapshot({ scriptSent: false })
    const next = reviewSnapshot({
      scriptSent: true,
      scriptSentAt: "2026-07-14T03:15:00.000Z",
    })

    expect(getPrescriptionRecordedEvidenceKey(previous, next)).toBe(
      "intake-1:2026-07-14T03:15:00.000Z",
    )
  })

  it("does not announce initial, repeated, reversed, or cross-request states", () => {
    const pending = reviewSnapshot({ scriptSent: false })
    const recorded = reviewSnapshot({ scriptSent: true })

    expect(getPrescriptionRecordedEvidenceKey(null, recorded)).toBeNull()
    expect(getPrescriptionRecordedEvidenceKey(recorded, recorded)).toBeNull()
    expect(getPrescriptionRecordedEvidenceKey(recorded, pending)).toBeNull()
    expect(getPrescriptionRecordedEvidenceKey(
      pending,
      reviewSnapshot({ intakeId: "intake-2", scriptSent: true }),
    )).toBeNull()
  })
})
