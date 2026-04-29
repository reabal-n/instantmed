import { describe, expect, it } from "vitest"

import { isConsultServiceType, isKnownDoctorServiceType } from "@/lib/doctor/service-types"
import {
  getConsultDraftResumeHref,
  getConsultSubtypeFirstStep,
  getConsultSubtypeResetKeys,
} from "@/lib/request/consult-flow"
import { getStepsForService, type StepContext } from "@/lib/request/step-registry"
import {
  resolveCheckoutSubtype,
  transformAnswersForUnifiedCheckout,
  validateAnswersServerSide,
} from "@/lib/request/unified-checkout"
import { validateConsultReasonStep } from "@/lib/request/validation"
import { evaluateSafety } from "@/lib/safety"

const identity = {
  email: "patient@example.com",
  fullName: "Pat Example",
  dateOfBirth: "1985-04-01",
  phone: "0412345678",
}

const sharedMedicalHistory = {
  hasAllergies: false,
  hasConditions: false,
}

describe("unified intake regressions", () => {
  it("validates ED consults against ED fields instead of general consult fields", () => {
    const answers = {
      consultSubtype: "ed",
      edGoal: "improve_erections",
      edDuration: "months",
      edAgeConfirmed: true,
      iief1: 3,
      iief2: 3,
      iief3: 3,
      iief4: 3,
      iief5: 3,
      edNitrates: false,
      edRecentHeartEvent: false,
      edSevereHeart: false,
      edPreference: "doctor_recommendation",
      ...sharedMedicalHistory,
    }

    expect(validateAnswersServerSide("consult", answers, identity)).toBeNull()
    expect(resolveCheckoutSubtype("consult", answers, "general")).toBe("ed")
  })

  it("validates hair loss consults against hair loss fields instead of general consult fields", () => {
    const answers = {
      consultSubtype: "hair_loss",
      hairGoal: "slow_loss",
      hairOnset: "1_2_years",
      hairPattern: "temples",
      hairFamilyHistory: "yes",
      hairReproductive: "no",
      scalpNone: true,
      hairLowBP: false,
      hairHeartConditions: false,
      has_allergies: "no",
      has_conditions: "no",
      takes_medications: "no",
      hairMedicationPreference: "doctor_recommendation",
      ...sharedMedicalHistory,
    }

    expect(validateAnswersServerSide("consult", answers, identity)).toBeNull()
    expect(resolveCheckoutSubtype("consult", answers, "general")).toBe("hair_loss")
  })

  it("requires phone for authenticated consult step skipping", () => {
    const baseContext: StepContext = {
      isAuthenticated: true,
      hasProfile: true,
      hasCompleteIdentity: true,
      hasMedicare: true,
      hasAddress: true,
      serviceType: "consult",
      answers: {
        consultSubtype: "general",
      },
    }

    const withoutPhone = getStepsForService("consult", baseContext).map((step) => step.id)
    const withPhone = getStepsForService("consult", { ...baseContext, hasPhone: true }).map((step) => step.id)

    expect(withoutPhone).toContain("details")
    expect(withPhone).not.toContain("details")
    expect(validateAnswersServerSide("consult", {}, { ...identity, phone: undefined })).toContain("Phone number is required")
  })

  it("requires structured general consult red flags and maps them to emergency safety rules", () => {
    expect(
      validateConsultReasonStep({
        consultSubtype: "general",
        consultCategory: "general",
        consultDetails: "I have chest pain and feel unwell today.",
        consultUrgency: "soon",
      }).isValid,
    ).toBe(false)

    const transformed = transformAnswersForUnifiedCheckout("consult", {
      consultSubtype: "general",
      consultCategory: "general",
      consultDetails: "I have chest pain and feel unwell today.",
      consultUrgency: "soon",
      general_associated_symptoms: ["chest_pain"],
    })

    expect(transformed.emergency_symptoms).toContain("chest_pain")

    const result = evaluateSafety("consult", transformed)
    expect(result.outcome).toBe("DECLINE")
    expect(result.triggeredRules.some((rule) => rule.ruleId === "emergency_chest_pain")).toBe(true)
  })

  it("resumes consult drafts with their saved subtype and resets stale subtype answers", () => {
    expect(
      getConsultDraftResumeHref({
        serviceType: "consult",
        currentStepId: "medical-history",
        answers: { consultSubtype: "hair_loss" },
        lastSavedAt: "2026-04-29T00:00:00.000Z",
      }),
    ).toBe("/request?service=consult&subtype=hair_loss")

    expect(getConsultSubtypeFirstStep("ed")).toBe("ed-goals")
    expect(getConsultSubtypeFirstStep("hair_loss")).toBe("hair-loss-goals")
    expect(getConsultSubtypeResetKeys()).toEqual(
      expect.arrayContaining(["consultDetails", "edGoal", "hairPattern", "hairMedicationPreference"]),
    )
  })

  it("normalizes legacy and current consult service types for doctor actions", () => {
    expect(isConsultServiceType("consult")).toBe(true)
    expect(isConsultServiceType("consults")).toBe(true)
    expect(isKnownDoctorServiceType("consult")).toBe(true)
    expect(isKnownDoctorServiceType("consults")).toBe(true)
  })
})
