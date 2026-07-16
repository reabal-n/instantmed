import { describe, expect, it } from "vitest"

import { GOOGLE_REVIEWS, SOCIAL_PROOF } from "@/lib/social-proof"

// Deleted 2026-07-16 (audit finding): unverifiable outcome and identity
// claims that regulated-health advertising rules ban from ever rendering —
// a 98% employer-acceptance promise, a 97% approval rate, a fabricated
// patient-return rate, a doctor count, and a numeric review rating.
// advertising-compliance-guard.test.ts blocks RENDERING them on public
// surfaces; this contract pins that the values themselves stay deleted so
// there is nothing for a future component to render.
const BANNED_SOCIAL_PROOF_KEYS = [
  "averageRating",
  "certApprovalPercent",
  "doctorCount",
  "employerAcceptancePercent",
  "patientReturnPercent",
  "sameDayDeliveryPercent",
  "scriptFulfillmentPercent",
] as const

describe("banned social-proof metrics stay deleted", () => {
  it.each(BANNED_SOCIAL_PROOF_KEYS)("SOCIAL_PROOF.%s is not defined", (key) => {
    expect(SOCIAL_PROOF).not.toHaveProperty(key)
  })

  it("keeps the Google badge config stars-only (no review counts)", () => {
    expect(Object.keys(GOOGLE_REVIEWS).sort()).toEqual([
      "enabled",
      "placeId",
      "rating",
      "reviewsUrl",
    ])
  })
})
