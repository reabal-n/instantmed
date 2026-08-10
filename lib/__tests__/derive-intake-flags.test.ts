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

describe("deriveIntakeFlags — service routing", () => {
  const complete = {
    strength: "50 mg",
    form: "tablet",
    pbsCode: "1234",
  }

  it("flags a PDE5 inhibitor that reaches a repeat payload", () => {
    const flags = deriveIntakeFlags({
      ...repeatBase,
      answers: {
        medications: [{ name: "Sildenafil", ...complete }],
        current_dose: "as needed",
      },
    })
    const flag = flags.find((f) => f.code === "dedicated_service_medication")
    expect(flag?.detail).toContain("Erectile Dysfunction")
  })

  it("flags a PDE5 inhibitor kept as a repeat via the structured context token", () => {
    const flags = deriveIntakeFlags({
      ...repeatBase,
      answers: {
        medications: [{ name: "Tadalafil", ...complete, strength: "5 mg" }],
        current_dose: "one daily",
        indication: "BPH",
        routing_context: "prostate_bph",
      },
    })
    const flag = flags.find((f) => f.code === "dedicated_service_medication")
    expect(flag?.detail).toContain("patient selected Prostate / BPH")
  })

  it("flags EVERY attestation-based exemption — including the hair classes", () => {
    // Deterministic facts (Proscar, finasteride 5 mg) exempt silently, but a
    // patient's one-tap claim is self-reported and always reaches the doctor.
    const flags = deriveIntakeFlags({
      ...repeatBase,
      answers: {
        medications: [{ name: "Finasteride", ...complete, strength: "1 mg" }],
        current_dose: "one daily",
        indication: "prostate",
        routingContext: "prostate_bph",
      },
    })
    expect(flags.find((f) => f.code === "dedicated_service_medication")?.detail)
      .toContain("patient selected")

    const deterministic = deriveIntakeFlags({
      ...repeatBase,
      answers: {
        medications: [{ name: "Proscar", ...complete, strength: "5 mg" }],
        current_dose: "one daily",
        indication: "prostate",
      },
    })
    expect(deterministic.find((f) => f.code === "dedicated_service_medication")).toBeUndefined()
  })

  it("routes on a service named only in the indication answer", () => {
    const flags = deriveIntakeFlags({
      ...repeatBase,
      answers: {
        medications: [{ name: "Silagra", ...complete }],
        current_dose: "as needed",
        indication: "erectile dysfunction",
      },
    })
    expect(codes(flags)).toContain("dedicated_service_medication")
  })

  it("flags a weight-only out-of-scope medicine without blocking it (D-B)", () => {
    // Phentermine is outside the GLP-1-focused launched service: never steered
    // (pay-to-be-refused churn), always doctor-flagged for a decline-to-GP.
    const flags = deriveIntakeFlags({
      category: "prescription",
      subtype: "repeat",
      answers: {
        medications: [{ name: "Phentermine", pbsCode: "MANUAL", strength: "30 mg", form: "capsule" }],
        current_dose: "one daily",
        indication: "weight",
      },
    })
    const flag = flags.find((f) => f.code === "dedicated_service_medication")
    expect(flag?.severity).toBe("attention")
    expect(flag?.detail).toContain("outside the GLP-1-focused service scope")
  })

  it("derives the same flags for chronic_review as for repeat", () => {
    // Checkout validates both subtypes as repeat scripts
    // (isRepeatPrescriptionSubtype in lib/stripe/checkout/clinical-validation.ts),
    // so both must surface the same doctor flags.
    const answers = {
      medications: [{ name: "Ozempic", ...complete, strength: "1 mg", form: "pen" }],
      current_dose: "weekly",
      indication: "type 2 diabetes",
    }
    const repeat = deriveIntakeFlags({ category: "prescription", subtype: "repeat", answers })
    const chronic = deriveIntakeFlags({ category: "prescription", subtype: "chronic_review", answers })
    expect(codes(chronic)).toEqual(codes(repeat))
    expect(codes(chronic)).toContain("dedicated_service_medication")
  })

  it("does NOT let a past controlled medicine named in the indication become a block signal", () => {
    // The routing scan reads the indication; the controlled-substance scan
    // deliberately does not (see derive-intake-flags.ts).
    const flags = deriveIntakeFlags({
      ...repeatBase,
      answers: {
        medications: [{ name: "Sertraline", ...complete }],
        current_dose: "one daily",
        indication: "anxiety, was on diazepam years ago",
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
