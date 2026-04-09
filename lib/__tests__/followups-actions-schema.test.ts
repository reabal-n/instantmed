import { describe, it, expect } from "vitest"
import { submitFollowupSchema } from "@/lib/validation/followup-schema"

describe("submitFollowupSchema", () => {
  it("accepts valid payload", () => {
    const r = submitFollowupSchema.safeParse({
      followupId: "11111111-1111-1111-1111-111111111111",
      effectivenessRating: 4,
      sideEffectsReported: false,
      sideEffectsNotes: "",
      adherenceDaysPerWeek: 7,
      patientNotes: "Going well.",
    })
    expect(r.success).toBe(true)
  })

  it("rejects out-of-range rating", () => {
    const r = submitFollowupSchema.safeParse({
      followupId: "11111111-1111-1111-1111-111111111111",
      effectivenessRating: 6,
      sideEffectsReported: false,
      sideEffectsNotes: "",
      adherenceDaysPerWeek: 7,
      patientNotes: "",
    })
    expect(r.success).toBe(false)
  })

  it("requires sideEffectsNotes when sideEffectsReported is true", () => {
    const r = submitFollowupSchema.safeParse({
      followupId: "11111111-1111-1111-1111-111111111111",
      effectivenessRating: 3,
      sideEffectsReported: true,
      sideEffectsNotes: "",
      adherenceDaysPerWeek: 4,
      patientNotes: "",
    })
    expect(r.success).toBe(false)
  })

  it("rejects invalid UUID", () => {
    const r = submitFollowupSchema.safeParse({
      followupId: "not-a-uuid",
      effectivenessRating: 3,
      sideEffectsReported: false,
      sideEffectsNotes: "",
      adherenceDaysPerWeek: 4,
      patientNotes: "",
    })
    expect(r.success).toBe(false)
  })
})
