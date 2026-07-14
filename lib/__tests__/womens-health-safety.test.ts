import { describe, expect, it } from "vitest"

import { checkSafetyForServer, validateSafetyFieldsPresent } from "@/lib/safety/evaluate"

const utiBase = {
  consultSubtype: "womens_health",
  womensHealthOption: "uti",
  utiSymptoms: ["burning"],
  emergency_symptoms: [] as string[],
}

describe("women's health — UTI server safety (keep-list, server-enforced)", () => {
  it("declines a UTI with red flags (possible kidney infection)", () => {
    const result = checkSafetyForServer("consult", { ...utiBase, utiRedFlags: "yes", utiPregnant: "no" })
    expect(result.outcome).toBe("DECLINE")
    expect(result.isAllowed).toBe(false)
  })

  it("declines a UTI when pregnant or unsure", () => {
    expect(checkSafetyForServer("consult", { ...utiBase, utiRedFlags: "no", utiPregnant: "yes" }).outcome).toBe("DECLINE")
    expect(checkSafetyForServer("consult", { ...utiBase, utiRedFlags: "no", utiPregnant: "not_sure" }).outcome).toBe("DECLINE")
  })

  it("allows a clean uncomplicated UTI", () => {
    const result = checkSafetyForServer("consult", { ...utiBase, utiRedFlags: "no", utiPregnant: "no" })
    expect(result.isAllowed).toBe(true)
  })
})

describe("women's health — OCP contraindications are flag-not-block (REQUIRES_CALL)", () => {
  const ocpBase = {
    consultSubtype: "womens_health",
    womensHealthOption: "ocp_new",
    contraceptionType: "start",
    pregnancyStatus: "no",
    emergency_symptoms: [] as string[],
  }

  it("requires a call (not a decline) for migraine-aura / clot / smoker", () => {
    for (const field of ["womens_migraine_aura", "womens_blood_clot_history", "womens_smoker"]) {
      const result = checkSafetyForServer("consult", { ...ocpBase, [field]: "yes" })
      expect(result.outcome, field).toBe("REQUIRES_CALL")
    }
  })

  it("allows a clean new-pill request", () => {
    const result = checkSafetyForServer("consult", {
      ...ocpBase,
      womens_migraine_aura: "no",
      womens_blood_clot_history: "no",
      womens_smoker: "no",
    })
    expect(result.isAllowed).toBe(true)
  })
})

describe("women's health — new/switch pill pregnancy is server-blocked", () => {
  // Regression: the legacy womens_pregnancy_hormonal rule keyed on
  // pregnancyStatus === 'pregnant', a value the live intake never emits, so a
  // pregnant new-pill request silently passed safety as ALLOW. The live guard
  // is the ocp_pregnancy_* rules, scoped to womensHealthOption === 'ocp_new'.
  const ocpBase = {
    consultSubtype: "womens_health",
    womensHealthOption: "ocp_new",
    contraceptionType: "start",
    womens_migraine_aura: "no",
    womens_blood_clot_history: "no",
    womens_smoker: "no",
    emergency_symptoms: [] as string[],
  }

  it("declines a confirmed-pregnant new/switch pill request", () => {
    const result = checkSafetyForServer("consult", { ...ocpBase, pregnancyStatus: "yes" })
    expect(result.outcome).toBe("DECLINE")
    expect(result.isAllowed).toBe(false)
  })

  it("requires a call when pregnancy is not ruled out", () => {
    const result = checkSafetyForServer("consult", { ...ocpBase, pregnancyStatus: "not_sure" })
    expect(result.outcome).toBe("REQUIRES_CALL")
    expect(result.requiresCall).toBe(true)
    expect(result.isAllowed).toBe(false)
  })

  it("still allows a not-pregnant new-pill request", () => {
    const result = checkSafetyForServer("consult", { ...ocpBase, pregnancyStatus: "no" })
    expect(result.isAllowed).toBe(true)
  })
})

describe("women's health — required safety fields", () => {
  it("requires the UTI red-flag + pregnancy fields", () => {
    const result = validateSafetyFieldsPresent("consult", {
      consultSubtype: "womens_health",
      womensHealthOption: "uti",
      emergency_symptoms: [],
    })
    expect(result.valid).toBe(false)
    expect(result.missingFields).toEqual(expect.arrayContaining(["utiRedFlags", "utiPregnant"]))
  })

  it("requires the OCP safety-screen fields for a new pill", () => {
    const result = validateSafetyFieldsPresent("consult", {
      consultSubtype: "womens_health",
      womensHealthOption: "ocp_new",
      emergency_symptoms: [],
    })
    expect(result.valid).toBe(false)
    expect(result.missingFields).toEqual(
      expect.arrayContaining(["womens_migraine_aura", "womens_blood_clot_history", "womens_smoker", "pregnancyStatus"]),
    )
  })

  it.each([
    ["pregnancyStatus", "pregnant"],
    ["womens_migraine_aura", "unknown"],
    ["womens_blood_clot_history", true],
    ["womens_smoker", "sometimes"],
  ])("fails closed when the OCP %s safety answer is invalid", (field, invalidValue) => {
    const result = validateSafetyFieldsPresent("consult", {
      consultSubtype: "womens_health",
      womensHealthOption: "ocp_new",
      pregnancyStatus: "no",
      womens_migraine_aura: "no",
      womens_blood_clot_history: "no",
      womens_smoker: "no",
      emergency_symptoms: [],
      [field]: invalidValue,
    })

    expect(result.valid).toBe(false)
    expect(result.missingFields).toContain(field)
  })
})
