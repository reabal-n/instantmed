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

  it("does not apply stale UTI red flags to the new-pill pathway", () => {
    const result = checkSafetyForServer("consult", {
      consultSubtype: "womens_health",
      womensHealthOption: "ocp_new",
      pregnancyStatus: "no",
      womens_migraine_aura: "no",
      womens_blood_clot_history: "no",
      womens_smoker: "no",
      utiRedFlags: "yes",
      utiPregnant: "not_sure",
      emergency_symptoms: [],
    })

    expect(result.isAllowed).toBe(true)
    expect(result.triggeredRuleIds).not.toEqual(
      expect.arrayContaining(["uti_red_flags_decline", "uti_pregnancy_decline"]),
    )
  })
})

describe("women's health — OCP redirects are blocked before payment", () => {
  const ocpBase = {
    consultSubtype: "womens_health",
    womensHealthOption: "ocp_new",
    contraceptionType: "start",
    pregnancyStatus: "no",
    emergency_symptoms: [] as string[],
  }

  it.each([
    ["womens_migraine_aura", "Some contraceptive pills may be unsafe if you have migraines with aura"],
    ["womens_blood_clot_history", "Some contraceptive pills may be unsafe if you or a close family member have had a blood clot"],
    ["womens_smoker", "Smoking changes which contraceptive pills may be safe, especially from age 35"],
  ])("declines %s without promising contact or a replacement treatment", (field, expectedMessage) => {
    const result = checkSafetyForServer("consult", { ...ocpBase, [field]: "yes" })

    expect(result.outcome).toBe("DECLINE")
    expect(result.requiresCall).toBe(false)
    expect(result.isAllowed).toBe(false)
    expect(result.blockReason).toContain(expectedMessage)
    expect(result.blockReason).toMatch(/GP or sexual health clinic/i)
    expect(result.blockReason).not.toMatch(/call|contact|progestogen|mini-pill|implant|IUD/i)
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

  it("declines when pregnancy is not ruled out without promising contact", () => {
    const result = checkSafetyForServer("consult", { ...ocpBase, pregnancyStatus: "not_sure" })
    expect(result.outcome).toBe("DECLINE")
    expect(result.requiresCall).toBe(false)
    expect(result.isAllowed).toBe(false)
    expect(result.blockReason).toContain("Pregnancy needs to be ruled out before starting or switching the pill")
    expect(result.blockReason).toMatch(/pregnancy test|GP or sexual health clinic/i)
    expect(result.blockReason).not.toMatch(/call|contact/i)
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
