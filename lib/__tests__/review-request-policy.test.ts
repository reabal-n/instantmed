import { describe, expect, it } from "vitest"

import {
  classifyReviewRequestPolicy,
  hasReviewRequestCooldownReservation,
} from "@/lib/email/review-request-policy"

type ReviewRequestPolicyFacts = Parameters<
  typeof classifyReviewRequestPolicy
>[0]

const SYDNEY_TEN = new Date("2026-07-20T00:15:00.000Z")

function eligibleFacts(
  overrides: Partial<ReviewRequestPolicyFacts> = {},
): ReviewRequestPolicyFacts {
  return {
    now: SYDNEY_TEN,
    intake: {
      id: "intake-1",
      patient_id: "patient-1",
      category: "medical_certificate",
      status: "completed",
      payment_status: "paid",
      document_sent_at: "2026-07-17T00:00:00.000Z",
      script_sent_at: null,
      review_email_sent_at: null,
      review_email_suppressed_at: null,
      patient: {
        email: "patient@example.com",
        email_bounced: false,
        first_name: "Patient",
      },
    },
    bounceDecision: { kind: "allowed" },
    addressDecision: { kind: "allowed" },
    preferenceDecision: { kind: "allowed" },
    cooldown: { active: false },
    readErrors: {},
    ...overrides,
  }
}

describe("classifyReviewRequestPolicy", () => {
  it("allows a currently eligible, consented, unsuppressed request", () => {
    expect(classifyReviewRequestPolicy(eligibleFacts())).toEqual({
      kind: "allowed",
    })
  })

  it.each([
    {
      name: "outside the Sydney send hour",
      facts: eligibleFacts({ now: new Date("2026-07-20T02:00:00.000Z") }),
      kind: "transiently_blocked",
      reason: "outside_sydney_send_hour",
    },
    {
      name: "during the patient cooldown",
      facts: eligibleFacts({ cooldown: { active: true } }),
      kind: "transiently_blocked",
      reason: "patient_cooldown",
    },
    {
      name: "after the inclusive 120-day window",
      facts: eligibleFacts({
        intake: {
          ...eligibleFacts().intake!,
          document_sent_at: "2026-03-21T00:14:59.999Z",
        },
      }),
      kind: "policy_suppressed",
      reason: "fulfilment_expired",
    },
    {
      name: "after a decline",
      facts: eligibleFacts({
        intake: { ...eligibleFacts().intake!, status: "declined" },
      }),
      kind: "policy_suppressed",
      reason: "invalid_request_state",
    },
    {
      name: "after a refund",
      facts: eligibleFacts({
        intake: {
          ...eligibleFacts().intake!,
          payment_status: "refunded",
        },
      }),
      kind: "policy_suppressed",
      reason: "invalid_payment_state",
    },
    {
      name: "after a recipient change",
      facts: eligibleFacts({
        expectedRecipient: "old@example.com",
      }),
      kind: "policy_suppressed",
      reason: "recipient_changed",
    },
    {
      name: "after an explicit opt-out",
      facts: eligibleFacts({
        preferenceDecision: { kind: "policy_suppressed" },
      }),
      kind: "policy_suppressed",
      reason: "marketing_opt_out",
    },
  ])("$name", ({ facts, kind, reason }) => {
    expect(classifyReviewRequestPolicy(facts)).toMatchObject({ kind, reason })
  })

  it("keeps 48 hours minus one millisecond transient", () => {
    expect(classifyReviewRequestPolicy(eligibleFacts({
      intake: {
        ...eligibleFacts().intake!,
        document_sent_at: new Date(
          SYDNEY_TEN.getTime() - 48 * 60 * 60 * 1000 + 1,
        ).toISOString(),
      },
    }))).toMatchObject({
      kind: "transiently_blocked",
      reason: "fulfilment_not_old_enough",
    })
  })

  it.each([
    ["intake", eligibleFacts({ readErrors: { intake: "db unavailable" } })],
    [
      "cooldown outbox",
      eligibleFacts({ readErrors: { cooldownOutbox: "db unavailable" } }),
    ],
    [
      "cooldown marker",
      eligibleFacts({ readErrors: { cooldownMarker: "db unavailable" } }),
    ],
    [
      "bounce lookup",
      eligibleFacts({
        bounceDecision: {
          kind: "transiently_blocked",
          reason: "lookup_failed",
        },
      }),
    ],
    [
      "address lookup",
      eligibleFacts({
        addressDecision: { kind: "transiently_blocked" },
      }),
    ],
    [
      "preference lookup",
      eligibleFacts({
        preferenceDecision: { kind: "transiently_blocked" },
      }),
    ],
  ])("keeps a %s read error retryable", (_name, facts) => {
    expect(classifyReviewRequestPolicy(facts)).toMatchObject({
      kind: "transiently_blocked",
    })
  })
})

describe("hasReviewRequestCooldownReservation", () => {
  const rows = [
    {
      id: "outbox-a",
      intake_id: "intake-a",
      created_at: "2026-07-19T00:00:00.000Z",
    },
    {
      id: "outbox-b",
      intake_id: "intake-b",
      created_at: "2026-07-19T00:00:00.000Z",
    },
  ]

  it("does not let the earliest reservation block itself", () => {
    expect(hasReviewRequestCooldownReservation({
      activeRows: rows,
      currentIntakeId: "intake-a",
      currentOutboxId: "outbox-a",
      hasOtherSentMarker: false,
    })).toBe(false)
  })

  it("blocks the later different-intake reservation deterministically", () => {
    expect(hasReviewRequestCooldownReservation({
      activeRows: rows,
      currentIntakeId: "intake-b",
      currentOutboxId: "outbox-b",
      hasOtherSentMarker: false,
    })).toBe(true)
  })

  it("does not count a reservation at the exact 30-day boundary", () => {
    const now = new Date("2026-08-18T00:00:00.000Z")
    const exactBoundary = {
      id: "outbox-boundary",
      intake_id: "intake-other",
      created_at: new Date(
        now.getTime() - 30 * 24 * 60 * 60 * 1000,
      ).toISOString(),
    }

    expect(hasReviewRequestCooldownReservation({
      activeRows: [exactBoundary],
      currentIntakeId: "intake-current",
      hasOtherSentMarker: false,
      now,
    })).toBe(false)
  })
})
