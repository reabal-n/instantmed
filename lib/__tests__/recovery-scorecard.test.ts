import { describe, expect, it } from "vitest"

import { buildRecoveryScorecard } from "@/lib/data/recovery-scorecard"

describe("recovery scorecard", () => {
  it("summarizes partial intake recovery and recovered paid revenue", () => {
    const scorecard = buildRecoveryScorecard({
      abandonedCheckoutEmailRows: [
        { delivery_status: "clicked", email_type: "abandoned_checkout", status: "sent" },
        { delivery_status: null, email_type: "abandoned_checkout_followup", status: "failed" },
      ],
      partialIntakeRows: [
        {
          converted_to_intake_id: "intake-1",
          email: "patient@example.com",
          recovery_email_sent_at: "2026-06-05T00:00:00.000Z",
          service_type: "med-cert",
        },
        {
          converted_to_intake_id: null,
          email: "second@example.com",
          recovery_email_sent_at: null,
          service_type: "prescription",
        },
        {
          converted_to_intake_id: null,
          email: null,
          recovery_email_sent_at: null,
          service_type: "consult",
        },
      ],
      recoveredPaidRows: [
        { amount_cents: 2995, refund_amount_cents: 0, utm_campaign: "partial_intake_recovery" },
        { amount_cents: 4995, refund_amount_cents: 4995, utm_campaign: "abandoned_checkout" },
      ],
    })

    expect(scorecard).toMatchObject({
      captured: 3,
      converted: 1,
      emailed: 1,
      emailCaptured: 2,
      emailClickCount: 1,
      measurementWarnings: [],
      partialRecoveryPaidCount: 1,
      partialRecoveryPaidRate: 100,
      recoveredNetRevenueCents: 2995,
    })
    expect(scorecard.emailCaptureRate).toBe(66.7)
    expect(scorecard.recoveryEmailCoverageRate).toBe(50)
    expect(scorecard.recoveredPaidCount).toBe(2)
  })

  it("warns when recovery-attributed paid orders exist but partial draft markers are zero", () => {
    const scorecard = buildRecoveryScorecard({
      abandonedCheckoutEmailRows: [
        { delivery_status: null, email_type: "partial_intake_recovery", status: "sent" },
      ],
      partialIntakeRows: [
        {
          converted_to_intake_id: null,
          email: "patient@example.com",
          recovery_email_sent_at: "2026-06-05T00:00:00.000Z",
          service_type: "med-cert",
        },
      ],
      recoveredPaidRows: [
        { amount_cents: 2995, refund_amount_cents: 0, utm_campaign: "partial_intake_recovery" },
      ],
    })

    expect(scorecard).toMatchObject({
      converted: 0,
      partialRecoveryPaidCount: 1,
      partialRecoveryPaidRate: 100,
      recoveredPaidCount: 1,
    })
    expect(scorecard.measurementWarnings).toContain(
      "Recovery-attributed paid orders exist but no partial drafts are marked converted.",
    )
  })
})
