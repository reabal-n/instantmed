import { describe, expect, it } from "vitest"

import {
  type ParchmentWebhookIntakeCandidate,
  selectParchmentWebhookIntake,
} from "@/lib/parchment/webhook-matching"

const candidates: ParchmentWebhookIntakeCandidate[] = [
  {
    id: "newest-duplicate-profile",
    category: "prescription",
    subtype: null,
    claimed_by: "doctor-other",
    reviewing_doctor_id: null,
    reviewed_by: null,
    created_at: "2026-04-30T06:00:00.000Z",
    service: { type: "repeat_rx" },
  },
  {
    id: "matching-claimed-doctor",
    category: "prescription",
    subtype: null,
    claimed_by: "doctor-linked",
    reviewing_doctor_id: null,
    reviewed_by: null,
    created_at: "2026-04-30T05:00:00.000Z",
    service: { type: "repeat_rx" },
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
        category: "consult",
        subtype: "ed",
        claimed_by: null,
        reviewing_doctor_id: "doctor-linked",
        reviewed_by: null,
        created_at: "2026-04-30T05:00:00.000Z",
        service: { type: "consult" },
      },
    ], ["doctor-linked"])?.id).toBe("reviewing-doctor-match")
  })

  it("matches launched women's health prescribing consults", () => {
    expect(selectParchmentWebhookIntake([
      {
        id: "womens-health-match",
        category: "consult",
        subtype: "womens_health",
        claimed_by: "doctor-linked",
        reviewing_doctor_id: null,
        reviewed_by: null,
        created_at: "2026-06-15T05:00:00.000Z",
        service: { type: "consult" },
      },
    ], ["doctor-linked"])?.id).toBe("womens-health-match")
  })

  it("supports legacy duplicate local profiles linked to the same Parchment sandbox user", () => {
    expect(selectParchmentWebhookIntake(candidates, ["doctor-other", "doctor-linked"])?.id).toBe("newest-duplicate-profile")
  })

  it("refuses to auto-complete when one prescriber has multiple active prescribing candidates for the patient", () => {
    expect(selectParchmentWebhookIntake([
      {
        id: "newest-active-prescription",
        category: "prescription",
        subtype: null,
        claimed_by: "doctor-linked",
        reviewing_doctor_id: null,
        reviewed_by: null,
        created_at: "2026-04-30T06:00:00.000Z",
        service: { type: "repeat_rx" },
      },
      {
        id: "older-active-prescription",
        category: "consult",
        subtype: "ed",
        claimed_by: null,
        reviewing_doctor_id: "doctor-linked",
        reviewed_by: null,
        created_at: "2026-04-30T05:00:00.000Z",
        service: { type: "consult" },
      },
    ], ["doctor-linked"])).toBeNull()
  })

  it("refuses to auto-complete when the Parchment user is not linked to a local prescriber", () => {
    expect(selectParchmentWebhookIntake(candidates, null)).toBeNull()
  })

  it("does not claim a non-prescribing active intake for the same patient and doctor", () => {
    expect(selectParchmentWebhookIntake([
      {
        id: "med-cert",
        category: "medical_certificate",
        subtype: null,
        claimed_by: "doctor-linked",
        reviewing_doctor_id: null,
        reviewed_by: null,
        created_at: "2026-04-30T06:00:00.000Z",
        service: { type: "med_certs" },
      },
      ...candidates,
    ], ["doctor-linked"])?.id).toBe("matching-claimed-doctor")
  })
})
