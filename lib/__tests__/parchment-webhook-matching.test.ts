import { describe, expect, it } from "vitest"

import {
  type ParchmentWebhookIntakeCandidate,
  selectParchmentWebhookIntake,
} from "@/lib/parchment/webhook-matching"

const candidates: ParchmentWebhookIntakeCandidate[] = [
  {
    id: "newest-duplicate-profile",
    claimed_by: "doctor-other",
    reviewing_doctor_id: null,
    reviewed_by: null,
    created_at: "2026-04-30T06:00:00.000Z",
  },
  {
    id: "matching-claimed-doctor",
    claimed_by: "doctor-linked",
    reviewing_doctor_id: null,
    reviewed_by: null,
    created_at: "2026-04-30T05:00:00.000Z",
  },
]

describe("selectParchmentWebhookIntake", () => {
  it("does not claim the newest patient intake when it belongs to a different doctor", () => {
    expect(selectParchmentWebhookIntake(candidates, ["doctor-linked"])?.id).toBe("matching-claimed-doctor")
  })

  it("matches review ownership fields used by the doctor workflow", () => {
    expect(selectParchmentWebhookIntake([
      {
        id: "reviewing-doctor-match",
        claimed_by: null,
        reviewing_doctor_id: "doctor-linked",
        reviewed_by: null,
        created_at: "2026-04-30T05:00:00.000Z",
      },
    ], ["doctor-linked"])?.id).toBe("reviewing-doctor-match")
  })

  it("supports legacy duplicate local profiles linked to the same Parchment sandbox user", () => {
    expect(selectParchmentWebhookIntake(candidates, ["doctor-other", "doctor-linked"])?.id).toBe("newest-duplicate-profile")
  })

  it("refuses to auto-complete when the Parchment user is not linked to a local prescriber", () => {
    expect(selectParchmentWebhookIntake(candidates, null)).toBeNull()
  })
})
