import { describe, expect, it } from "vitest"

import { buildNoneApplyMedicalHistoryAnswers } from "@/components/request/steps/medical-history-step"

describe("medical-history bundled negative answer", () => {
  it("explicitly clears every prescribing-history answer", () => {
    expect(buildNoneApplyMedicalHistoryAnswers(true)).toEqual({
      hasAllergies: false,
      has_allergies: false,
      allergies: "",
      known_allergies: "",
      hasAdverseMedicationReactions: false,
      has_adverse_medication_reactions: false,
      hasConditions: false,
      has_conditions: false,
      conditions: "",
      existing_conditions: "",
      hasOtherMedications: false,
      has_other_medications: false,
      takes_medications: false,
      otherMedications: "",
      other_medications: "",
      current_medications: "",
      isPregnantOrBreastfeeding: false,
      is_pregnant_or_breastfeeding: false,
    })
  })

  it("does not create prescribing-only answers for non-prescribing services", () => {
    const answers = buildNoneApplyMedicalHistoryAnswers(false)

    expect(answers).not.toHaveProperty("hasAdverseMedicationReactions")
    expect(answers).not.toHaveProperty("isPregnantOrBreastfeeding")
    expect(answers).toMatchObject({
      hasAllergies: false,
      hasConditions: false,
      hasOtherMedications: false,
    })
  })
})
