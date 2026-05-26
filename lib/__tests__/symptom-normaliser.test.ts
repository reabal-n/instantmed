import { describe, expect, it } from "vitest"

import { normaliseSymptomText } from "@/lib/clinical/symptom-normaliser"

describe("normaliseSymptomText", () => {
  it("returns empty string for empty input", () => {
    expect(normaliseSymptomText("")).toBe("")
    expect(normaliseSymptomText(null as unknown as string)).toBe("")
    expect(normaliseSymptomText(undefined as unknown as string)).toBe("")
  })

  it("preserves clinical symptom text unchanged", () => {
    expect(normaliseSymptomText("Sore throat, runny nose, mild cough since yesterday."))
      .toBe("Sore throat, runny nose, mild cough since yesterday.")
  })

  it("cleans the canonical bad example", () => {
    // "Tuki Tkt requests a work. fever nose full get cold"
    // The "requests a work" prefix is added by the note template, not the symptom text.
    // The normaliser only sees "fever nose full get cold".
    expect(normaliseSymptomText("fever nose full get cold"))
      .toBe("Fever, nasal congestion, cold symptoms.")
  })

  it("normalises common patient-speak", () => {
    expect(normaliseSymptomText("nose full")).toBe("Nasal congestion.")
    expect(normaliseSymptomText("get cold")).toBe("Cold symptoms.")
    expect(normaliseSymptomText("got the flu")).toBe("Flu symptoms.")
    expect(normaliseSymptomText("tummy hurts")).toBe("Abdominal pain.")
    expect(normaliseSymptomText("throwing up")).toBe("Vomiting.")
    expect(normaliseSymptomText("can't sleep")).toBe("Insomnia.")
  })

  it("collapses adjacent whitespace and trims", () => {
    expect(normaliseSymptomText("  fever  \n  cough  ")).toBe("Fever, cough.")
  })

  it("capitalises the first letter and ends with a period", () => {
    expect(normaliseSymptomText("fever")).toBe("Fever.")
    expect(normaliseSymptomText("FEVER")).toBe("Fever.")
  })

  it("preserves an existing trailing period", () => {
    expect(normaliseSymptomText("Fever and cough.")).toBe("Fever and cough.")
  })

  it("joins symptom fragments without filler verbs", () => {
    // "fever nose full get cold" should become "Fever, nasal congestion, cold symptoms."
    // The space-separated fragments are inferred as a symptom list when no
    // commas / periods / clinical phrasing is present.
    expect(normaliseSymptomText("fever sore throat cough"))
      .toBe("Fever, sore throat, cough.")
  })

  it("does not double up symptoms already in clinical phrasing", () => {
    expect(normaliseSymptomText("fever, runny nose, cough x 2 days"))
      .toBe("Fever, runny nose, cough x 2 days.")
  })
})
