import { describe, expect, it } from "vitest"

import { parseSoapDraft, replaceSoapSection } from "@/lib/doctor/soap-note"

describe("lossless SOAP editing", () => {
  it("preserves typing spaces, blank lines and every untouched byte", () => {
    const note = "S: Patient reports symptoms  \n\nO:\tRecorded answers\nA: Review pending\nP: Review required\n\n"
    const parsed = parseSoapDraft(note)!
    expect(parsed.S.value).toBe("Patient reports symptoms  \n")
    expect(replaceSoapSection(note, parsed.S, "Patient reports symptoms  \n\nNext word ")).toBe(
      "S: Patient reports symptoms  \n\nNext word \nO:\tRecorded answers\nA: Review pending\nP: Review required\n\n",
    )
    expect(replaceSoapSection(note, parsed.P, parsed.P.value)).toBe(note)
  })
  it.each([
    "S: First\nO: Observed\nA: Assessment\nP: Plan\nS: Quoted marker-like line",
    "Preface\nS: First\nO: Observed\nA: Assessment\nP: Plan",
    "S: First\nA: Assessment\nO: Observed\nP: Plan",
  ])("falls back to the complete plain note for ambiguous structure", (note) => {
    expect(parseSoapDraft(note)).toBeNull()
  })
  it("retains marker-like text inserted inside a section", () => {
    const note = "S: First\nO: Observed\nA: Assessment\nP: Plan"
    const edited = replaceSoapSection(note, parseSoapDraft(note)!.S, "First\nP: quoted text\nStill subjective ")
    expect(edited).toBe("S: First\nP: quoted text\nStill subjective \nO: Observed\nA: Assessment\nP: Plan")
    expect(parseSoapDraft(edited)).toBeNull()
  })
})

describe("editing an embedded marker without changing editor fields", () => {
  it("keeps section boundaries stable for continued typing after a marker line", async () => {
    const { editSoapSection } = await import("@/lib/doctor/soap-note")
    const original = "S: First\nO: Observed\nA: Assessment\nP: Plan"
    const first = editSoapSection(original, parseSoapDraft(original)!, "S", "First\nP:")
    const next = editSoapSection(first.note, first.sections, "S", "First\nP: quoted line\nStill subjective ")
    expect(next.note).toBe("S: First\nP: quoted line\nStill subjective \nO: Observed\nA: Assessment\nP: Plan")
    expect(next.sections.P.value).toBe("Plan")
    expect(editSoapSection(next.note, next.sections, "P", "Actual plan ").note).toBe("S: First\nP: quoted line\nStill subjective \nO: Observed\nA: Assessment\nP: Actual plan ")
  })
})
