import { describe, expect, it } from "vitest"

import { buildNoneApplyMedicalHistoryAnswers } from "@/components/request/steps/medical-history-step"
import { transformAnswersForUnifiedCheckout } from "@/lib/request/unified-checkout"

describe("medical-history bundled negative answer", () => {
  it("explicitly clears every prescribing-history answer", () => {
    expect(buildNoneApplyMedicalHistoryAnswers(true)).toEqual({
      hasAllergies: false,
      allergies: "",
      hasAdverseMedicationReactions: false,
      hasConditions: false,
      conditions: "",
      hasOtherMedications: false,
      otherMedications: "",
      isPregnantOrBreastfeeding: false,
    })
  })

  it("does not overwrite aliases owned by specialty consult screens", () => {
    const answers = buildNoneApplyMedicalHistoryAnswers(true)

    expect(answers).not.toHaveProperty("takes_medications")
    expect(answers).not.toHaveProperty("has_allergies")
    expect(answers).not.toHaveProperty("has_conditions")
    expect(answers).not.toHaveProperty("known_allergies")
    expect(answers).not.toHaveProperty("existing_conditions")
    expect(answers).not.toHaveProperty("current_medications")
  })

  it("lets checkout derive canonical aliases from the live generic answers", () => {
    const answers = {
      ...buildNoneApplyMedicalHistoryAnswers(true),
      hasAllergies: true,
      allergies: "Penicillin",
    }
    const transformed = transformAnswersForUnifiedCheckout("repeat-script", answers)

    expect(transformed).toMatchObject({
      has_allergies: true,
      allergies: "Penicillin",
      has_conditions: false,
      has_other_medications: false,
      has_adverse_medication_reactions: false,
      is_pregnant_or_breastfeeding: false,
    })
    expect(transformed).not.toHaveProperty("takes_medications")
    expect(transformed).not.toHaveProperty("known_allergies")
    expect(transformed).not.toHaveProperty("existing_conditions")
    expect(transformed).not.toHaveProperty("current_medications")
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
