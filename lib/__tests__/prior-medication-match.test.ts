import { describe, expect, it } from "vitest"

import { findPriorMedicationMatch } from "@/lib/clinical/prior-medication-match"

describe("prior medication matching", () => {
  it("removes strength, form, and regimen noise before comparison", () => {
    expect(findPriorMedicationMatch(
      "Sertraline 100 mg tablet once daily",
      ["Sertraline"],
    )).toEqual({ medicationName: "Sertraline", kind: "exact" })
  })

  it.each([
    ["Sertralne 100 mg", "Sertraline"],
    ["Atorvastain", "Atorvastatin"],
    ["Venlafaxnie XR", "Venlafaxine"],
    ["Zolft", "Zoloft"],
  ])("matches a conservative likely typo: %s", (patientEntry, medicationName) => {
    expect(findPriorMedicationMatch(patientEntry, [medicationName])).toEqual({
      medicationName,
      kind: "likely_typo",
    })
  })

  it("returns the newest exact history row after normalisation", () => {
    expect(findPriorMedicationMatch(
      "Metformin 500mg tablet",
      ["Metformin", "metformin 500 mg"],
    )).toEqual({ medicationName: "Metformin", kind: "exact" })
  })

  it.each([
    ["Crest", ["Crestor"]],
    ["Lasix", ["Losec"]],
    ["x", ["Xanax"]],
    ["Sertraline", ["Venlafaxine"]],
  ])("rejects a weak or clinically unsafe-looking match: %s", (patientEntry, history) => {
    expect(findPriorMedicationMatch(patientEntry, history)).toBeNull()
  })

  it("fails closed when two prior medicines are similarly close", () => {
    expect(findPriorMedicationMatch(
      "abcdefgj",
      ["abcdefgh", "abcdefgi"],
    )).toBeNull()
  })
})
