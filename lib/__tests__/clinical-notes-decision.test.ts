import { describe, expect, it } from "vitest"

import {
  MIN_CLINICAL_NOTES_LENGTH,
  resolveClinicalDecisionNote,
} from "@/lib/doctor/clinical-notes"

describe("resolveClinicalDecisionNote", () => {
  it("keeps any non-empty doctor-authored note", () => {
    const doctorNotes = "Reviewed."
    const fallbackDraftNote = "Fallback clinical case summary. ".repeat(3)

    expect(resolveClinicalDecisionNote({ doctorNotes, fallbackDraftNote })).toBe(
      doctorNotes.trim(),
    )
  })

  it("uses the case summary draft when doctor notes are empty", () => {
    const fallbackDraftNote = "Repeat prescription clinically reviewed. ".repeat(2)

    expect(
      resolveClinicalDecisionNote({
        doctorNotes: "   ",
        fallbackDraftNote,
      }),
    ).toBe(fallbackDraftNote.trim())
  })

  it("returns null when neither source has note content", () => {
    expect(
      resolveClinicalDecisionNote({
        doctorNotes: "   ",
        fallbackDraftNote: "",
      }),
    ).toBeNull()
  })

  it("keeps the shared threshold at non-empty documentation only", () => {
    expect(MIN_CLINICAL_NOTES_LENGTH).toBe(1)
  })
})
