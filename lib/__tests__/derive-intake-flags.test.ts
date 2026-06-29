import { describe, expect, it } from "vitest"

import { deriveIntakeFlags } from "@/lib/clinical/derive-intake-flags"

const repeatBase = {
  category: "prescription",
  subtype: "repeat",
}

function codes(flags: { code: string }[]): string[] {
  return flags.map((f) => f.code).sort()
}

describe("deriveIntakeFlags — repeat script", () => {
  it("flags a missing strength as an attention flag (no longer a hard block)", () => {
    const flags = deriveIntakeFlags({
      ...repeatBase,
      answers: {
        medications: [{ name: "Atorvastatin", form: "tablet", pbsCode: "1234" }],
        current_dose: "one daily",
        prescribed_before: true,
        dose_changed: false,
      },
    })
    expect(codes(flags)).toEqual(["medication_strength_missing"])
    expect(flags[0].severity).toBe("attention")
  })

  it("flags a missing form", () => {
    const flags = deriveIntakeFlags({
      ...repeatBase,
      answers: {
        medications: [{ name: "Atorvastatin", strength: "20 mg", pbsCode: "1234" }],
        current_dose: "one daily",
      },
    })
    expect(codes(flags)).toEqual(["medication_form_missing"])
  })

  it("flags an unknown medication with the description as detail, and does NOT also flag strength/form", () => {
    const flags = deriveIntakeFlags({
      ...repeatBase,
      answers: {
        medications: [
          { name: "Unknown - doctor will confirm", pbsCode: "UNKNOWN", description: "small white blood pressure tablet from Dr Smith" },
        ],
        current_dose: "one daily",
      },
    })
    expect(codes(flags)).toEqual(["medication_needs_identification"])
    expect(flags[0].detail).toBe("small white blood pressure tablet from Dr Smith")
  })

  it("flags a missing current dose", () => {
    const flags = deriveIntakeFlags({
      ...repeatBase,
      answers: {
        medications: [{ name: "Atorvastatin", strength: "20 mg", form: "tablet", pbsCode: "1234" }],
      },
    })
    expect(codes(flags)).toEqual(["dose_not_stated"])
  })

  it("flags legacy multi-medication payloads as an info flag", () => {
    const medications = Array.from({ length: 2 }, (_, i) => ({
      name: `Med${i}`,
      strength: "10 mg",
      form: "tablet",
      pbsCode: `code-${i}`,
    }))
    const flags = deriveIntakeFlags({
      ...repeatBase,
      answers: { medications, current_dose: "as directed" },
    })
    expect(codes(flags)).toEqual(["medication_count_high"])
    expect(flags[0].severity).toBe("info")
  })

  it("emits no flags for a complete, in-scope repeat", () => {
    const flags = deriveIntakeFlags({
      ...repeatBase,
      answers: {
        medications: [{ name: "Atorvastatin", strength: "20 mg", form: "tablet", pbsCode: "1234" }],
        current_dose: "one daily",
        prescribed_before: true,
        dose_changed: false,
      },
    })
    expect(flags).toEqual([])
  })

  it("does NOT turn new-medicine or dose-change into a flag (these stay hard blocks)", () => {
    const flags = deriveIntakeFlags({
      ...repeatBase,
      answers: {
        medications: [{ name: "Atorvastatin", strength: "20 mg", form: "tablet", pbsCode: "1234" }],
        current_dose: "one daily",
        prescribed_before: false,
        dose_changed: true,
      },
    })
    expect(flags).toEqual([])
  })
})

describe("deriveIntakeFlags — non-repeat", () => {
  it("emits no repeat flags for a medical certificate", () => {
    const flags = deriveIntakeFlags({
      category: "medical_certificate",
      answers: { symptoms_description: "sick" },
    })
    expect(flags).toEqual([])
  })
})
