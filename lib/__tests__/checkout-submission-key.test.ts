import { describe, expect, it } from "vitest"

import {
  buildAuthenticatedCheckoutSubmissionKey,
  buildGuestCheckoutSubmissionKey,
} from "@/lib/stripe/checkout-submission-key"

const DRAFT_ID = "11111111-1111-4111-8111-111111111111"

describe("checkout submission key", () => {
  it("uses one stable key for the same saved draft across guest and authenticated checkout", () => {
    const authenticated = buildAuthenticatedCheckoutSubmissionKey({
      answers: { medicationName: "Example" },
      category: "prescription",
      now: 1_000,
      patientId: "patient-1",
      serverDraftSessionId: DRAFT_ID,
      serviceType: "repeat-script",
      subtype: "repeat",
    })
    const guest = buildGuestCheckoutSubmissionKey({
      answers: { medicationName: "Example" },
      category: "prescription",
      email: "patient@example.com",
      now: 999_999_999,
      serverDraftSessionId: DRAFT_ID,
      subtype: "repeat",
    })

    expect(authenticated).toBe(guest)
    expect(authenticated).toMatch(/^draft-/)
  })

  it("falls back to the existing ten-minute identity buckets without a valid draft id", () => {
    const first = buildGuestCheckoutSubmissionKey({
      answers: { consent: true },
      category: "medical_certificate",
      email: " Patient@Example.com ",
      now: 599_999,
      serverDraftSessionId: "not-a-draft-id",
      subtype: "work",
    })
    const sameBucket = buildGuestCheckoutSubmissionKey({
      answers: { consent: true },
      category: "medical_certificate",
      email: "patient@example.com",
      now: 1,
      subtype: "work",
    })
    const nextBucket = buildGuestCheckoutSubmissionKey({
      answers: { consent: true },
      category: "medical_certificate",
      email: "patient@example.com",
      now: 600_000,
      subtype: "work",
    })

    expect(first).toBe(sameBucket)
    expect(nextBucket).not.toBe(first)
    expect(first).toMatch(/^guest-/)
  })
})
