import { describe, expect, it } from "vitest"

import { PILL_PREGNANCY_DECLINE_REASON } from "@/lib/clinical/womens-health-pill"
import { validateAnswersServerSide } from "@/lib/request/unified-checkout"

const identity = {
  email: "patient@example.com",
  fullName: "Pat Example",
  dateOfBirth: "1985-04-01",
  phone: "0412345678",
}

const validNewPillAnswers = {
  consultSubtype: "womens_health",
  womensHealthOption: "ocp_new",
  contraceptionType: "start",
  contraceptionCurrent: "none",
  pregnancyStatus: "no",
  womens_migraine_aura: "no",
  womens_blood_clot_history: "no",
  womens_smoker: "no",
  hasAllergies: false,
  hasConditions: false,
  hasOtherMedications: false,
  isPregnantOrBreastfeeding: false,
  hasAdverseMedicationReactions: false,
  medicareNumber: "1111111111",
  medicareIrn: "2",
  addressLine1: "12 Manual Entry Road",
  suburb: "Sydney",
  state: "NSW",
  postcode: "2000",
  sex: "F",
}

describe("women's-health new-pill unified checkout validation", () => {
  it("accepts a complete exact-enum payload", () => {
    expect(validateAnswersServerSide("consult", validNewPillAnswers, identity)).toBeNull()
  })

  it("rejects confirmed pregnancy with the canonical in-person guidance", () => {
    expect(validateAnswersServerSide("consult", {
      ...validNewPillAnswers,
      pregnancyStatus: "yes",
    }, identity)).toBe(PILL_PREGNANCY_DECLINE_REASON)
  })

  it.each([
    ["contraceptionType", "continue"],
    ["contraceptionCurrent", "legacy-method"],
    ["pregnancyStatus", "pregnant"],
    ["womens_migraine_aura", "unknown"],
    ["womens_blood_clot_history", true],
    ["womens_smoker", "sometimes"],
  ])("rejects a stale or crafted %s value", (field, invalidValue) => {
    expect(validateAnswersServerSide("consult", {
      ...validNewPillAnswers,
      [field]: invalidValue,
    }, identity)).not.toBeNull()
  })
})
