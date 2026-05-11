import { describe, expect, it } from "vitest"

import {
  normalizeMedicationEntriesAnswer,
  normalizeMedicationProductAnswer,
  stringAnswer,
  stringArrayAnswer,
} from "@/lib/request/intake-answer-normalizers"

describe("intake answer normalizers", () => {
  it("keeps scalar string answers from leaking objects into controlled inputs", () => {
    expect(stringAnswer("routine")).toBe("routine")
    expect(stringAnswer({ bad: true })).toBe("")
    expect(stringAnswer(["routine"])).toBe("")
    expect(stringAnswer(null)).toBe("")
  })

  it("accepts only string arrays for checkbox style answers", () => {
    expect(stringArrayAnswer(["none", "chest_pain", 42, null])).toEqual(["none", "chest_pain"])
    expect(stringArrayAnswer("none")).toEqual([])
    expect(stringArrayAnswer({ 0: "none" })).toEqual([])
  })

  it("drops malformed medication arrays instead of preserving crashy legacy values", () => {
    expect(normalizeMedicationEntriesAnswer("legacy-not-array")).toEqual([])
    expect(
      normalizeMedicationEntriesAnswer([
        "bad-row",
        { product: "bad-product", name: { bad: true }, strength: ["10 mg"], form: null },
      ]),
    ).toEqual([])
  })

  it("normalizes manual and PBS medication answers for review and checkout", () => {
    expect(
      normalizeMedicationEntriesAnswer([
        { name: "Ventolin", strength: "100 mcg", form: "inhaler", pbsCode: "MANUAL" },
        {
          product: {
            drug_name: "Atorvastatin",
            strength: "20 mg",
            form: "tablet",
            pbs_code: "1234X",
            extra: "preserved",
          },
          name: "",
        },
      ]),
    ).toEqual([
      { product: null, name: "Ventolin", strength: "100 mcg", form: "inhaler", pbsCode: "MANUAL" },
      {
        product: {
          drug_name: "Atorvastatin",
          strength: "20 mg",
          form: "tablet",
          pbs_code: "1234X",
          extra: "preserved",
        },
        name: "Atorvastatin",
        strength: "20 mg",
        form: "tablet",
        pbsCode: "1234X",
      },
    ])
  })

  it("rejects selected medication products without a PBS drug name", () => {
    expect(normalizeMedicationProductAnswer("bad")).toBeNull()
    expect(normalizeMedicationProductAnswer({ strength: "20 mg" })).toBeNull()
    expect(normalizeMedicationProductAnswer({ drug_name: "Metformin", strength: "500 mg" })).toEqual({
      drug_name: "Metformin",
      strength: "500 mg",
    })
  })

  it("strips malformed nested PBS product fields", () => {
    expect(
      normalizeMedicationProductAnswer({
        drug_name: "Rosuvastatin",
        strength: 20,
        form: ["tablet"],
        pbs_code: 12345,
      }),
    ).toEqual({
      drug_name: "Rosuvastatin",
    })
  })
})
