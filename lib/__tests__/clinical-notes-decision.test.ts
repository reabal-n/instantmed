import { describe, expect, it } from "vitest"

import {
  MIN_CLINICAL_NOTES_LENGTH,
  resolveClinicalDecisionNote,
} from "@/lib/doctor/clinical-notes"

describe("resolveClinicalDecisionNote", () => {
  it("keeps sufficient doctor-authored notes", () => {
    const doctorNotes = "Doctor reviewed repeat prescription request. ".repeat(2)
    const fallbackDraftNote = "Fallback clinical case summary. ".repeat(3)

    expect(resolveClinicalDecisionNote({ doctorNotes, fallbackDraftNote })).toBe(
      doctorNotes.trim(),
    )
  })

  it("uses the case summary draft when doctor notes are too short", () => {
    const fallbackDraftNote = "Repeat prescription clinically reviewed. ".repeat(2)

    expect(
      resolveClinicalDecisionNote({
        doctorNotes: "ok",
        fallbackDraftNote,
      }),
    ).toBe(fallbackDraftNote.trim())
  })

  it("returns null when neither source meets the clinical note threshold", () => {
    expect(
      resolveClinicalDecisionNote({
        doctorNotes: "short",
        fallbackDraftNote: "also short",
      }),
    ).toBeNull()
  })

  it("keeps the shared threshold at the server-enforced minimum", () => {
    expect(MIN_CLINICAL_NOTES_LENGTH).toBe(50)
  })
})
