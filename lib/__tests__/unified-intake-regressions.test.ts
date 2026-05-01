import { describe, expect, it } from "vitest"

import { isConsultServiceType, isKnownDoctorServiceType } from "@/lib/doctor/service-types"
import {
  getConsultDraftResumeHref,
  getConsultSubtypeFirstStep,
  getConsultSubtypeResetKeys,
  normalizeConsultSubtypeParam,
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
  hasOtherMedications: false,
  isPregnantOrBreastfeeding: false,
  hasAdverseMedicationReactions: false,
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

  it("does not skip prescription details unless prescribing sex is already on profile", () => {
    const baseContext: StepContext = {
      isAuthenticated: true,
      hasProfile: true,
      hasCompleteIdentity: true,
      hasMedicare: true,
      hasAddress: true,
      hasPhone: true,
      serviceType: "repeat-script",
      answers: {},
    }

    expect(getStepsForService("repeat-script", baseContext).map((step) => step.id)).toContain("details")
    expect(getStepsForService("repeat-script", { ...baseContext, hasSex: true }).map((step) => step.id)).not.toContain("details")
  })

  it("combines repeat prescription review and payment into the final review step", () => {
    const context: StepContext = {
      isAuthenticated: false,
      hasProfile: false,
      hasCompleteIdentity: false,
      hasMedicare: false,
      hasAddress: false,
      serviceType: "repeat-script",
      answers: {},
    }

    const steps = getStepsForService("repeat-script", context).map((step) => step.id)

    expect(steps).not.toContain("checkout")
    expect(steps.at(-1)).toBe("review")
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
    expect(normalizeConsultSubtypeParam("womens-health")).toBe("womens_health")
    expect(normalizeConsultSubtypeParam("weight-loss")).toBe("weight_loss")
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

  it("normalizes prescription identity answers for checkout, fraud checks, and prescribing", () => {
    const transformed = transformAnswersForUnifiedCheckout("repeat-script", {
      medicationName: "Budesonide + formoterol",
      medicationStrength: "100/3 micrograms",
      pbsCode: "MANUAL",
      prescribedBefore: true,
      doseChanged: false,
      currentDose: "2 puffs twice daily",
      medicareNumber: "1111111111",
      medicareIrn: "2",
      medicareExpiry: "2029-05-01",
      addressLine1: "12 Manual Entry Road",
      suburb: "Sydney",
      state: "NSW",
      postcode: "2000",
      sex: "M",
    })

    expect(transformed.medicare_number).toBe("1111111111")
    expect(transformed.medicare_irn).toBe("2")
    expect(transformed.medicare_expiry).toBe("2029-05-01")
    expect(transformed.current_dose).toBe("2 puffs twice daily")
    expect(transformed.dosage_instructions).toBe("2 puffs twice daily")
    expect(transformed.address_line1).toBe("12 Manual Entry Road")
    expect(transformed.suburb).toBe("Sydney")
    expect(transformed.state).toBe("NSW")
    expect(transformed.postcode).toBe("2000")
    expect(transformed.sex).toBe("M")
  })

  it("blocks prescription checkout when manual address is missing suburb state or postcode", () => {
    const validPrescriptionAnswers = {
      medicationName: "Budesonide + formoterol",
      medicationStrength: "100/3 micrograms",
      medicationForm: "inhaler",
      prescriptionHistory: "6 to 12 months",
      currentDose: "2 puffs twice daily",
      ...sharedMedicalHistory,
      medicareNumber: "1111111111",
      medicareIrn: "2",
      addressLine1: "12 Manual Entry Road",
      sex: "M",
    }

    expect(
      validateAnswersServerSide("repeat-script", validPrescriptionAnswers, identity),
    ).toContain("suburb")

    expect(validateAnswersServerSide("repeat-script", {
      ...validPrescriptionAnswers,
      suburb: "Sydney",
      state: "NSW",
      postcode: "2000",
    }, identity)).toBeNull()
  })

  it("blocks prescription checkout when Medicare IRN is missing but does not require card expiry", () => {
    const validPrescriptionAnswers = {
      medicationName: "Budesonide + formoterol",
      medicationStrength: "100/3 micrograms",
      medicationForm: "inhaler",
      prescriptionHistory: "6 to 12 months",
      currentDose: "2 puffs twice daily",
      ...sharedMedicalHistory,
      medicareNumber: "1111111111",
      addressLine1: "12 Manual Entry Road",
      suburb: "Sydney",
      state: "NSW",
      postcode: "2000",
      sex: "M",
    }

    expect(
      validateAnswersServerSide("repeat-script", validPrescriptionAnswers, identity),
    ).toContain("IRN")

    expect(validateAnswersServerSide("repeat-script", {
      ...validPrescriptionAnswers,
      medicareIrn: "2",
    }, identity)).toBeNull()
  })

  it("requires the patient-reported dose for repeat medication requests", () => {
    expect(validateAnswersServerSide("repeat-script", {
      medicationName: "Budesonide + formoterol",
      medicationStrength: "100/3 micrograms",
      medicationForm: "inhaler",
      prescriptionHistory: "6 to 12 months",
      ...sharedMedicalHistory,
      medicareNumber: "1111111111",
      medicareIrn: "2",
      addressLine1: "12 Manual Entry Road",
      suburb: "Sydney",
      state: "NSW",
      postcode: "2000",
      sex: "M",
    }, identity)).toContain("dose")

    expect(validateAnswersServerSide("repeat-script", {
      medicationName: "Budesonide + formoterol",
      medicationStrength: "100/3 micrograms",
      medicationForm: "inhaler",
      prescriptionHistory: "6 to 12 months",
      currentDose: "2 puffs twice daily",
      ...sharedMedicalHistory,
      medicareNumber: "1111111111",
      medicareIrn: "2",
      addressLine1: "12 Manual Entry Road",
      suburb: "Sydney",
      state: "NSW",
      postcode: "2000",
      sex: "M",
    }, identity)).toBeNull()
  })

  it("rejects repeat medication requests when the patient says it was never prescribed", () => {
    const answers = {
      medicationName: "Rosuvastatin",
      medicationStrength: "10 mg",
      medicationForm: "tablet",
      pbsCode: "MANUAL",
      prescriptionHistory: "never",
      currentDose: "10 mg nightly",
      ...sharedMedicalHistory,
      medicareNumber: "1111111111",
      medicareIrn: "2",
      addressLine1: "12 Manual Entry Road",
      suburb: "Sydney",
      state: "NSW",
      postcode: "2000",
      sex: "M",
    }

    expect(String(validateAnswersServerSide("repeat-script", answers, identity))).toMatch(/repeat prescription/i)

    const transformed = transformAnswersForUnifiedCheckout("repeat-script", answers)
    expect(transformed.prescribed_before).toBe(false)
  })

  it("rejects unknown or incomplete repeat prescription medication details", () => {
    const baseAnswers = {
      prescriptionHistory: "6 to 12 months",
      currentDose: "2 puffs twice daily",
      ...sharedMedicalHistory,
      medicareNumber: "1111111111",
      medicareIrn: "2",
      addressLine1: "12 Manual Entry Road",
      suburb: "Sydney",
      state: "NSW",
      postcode: "2000",
      sex: "M",
    }

    expect(validateAnswersServerSide("repeat-script", {
      ...baseAnswers,
      medicationName: "Unknown - doctor will confirm",
      pbsCode: "UNKNOWN",
    }, identity)).toMatch(/medication/i)

    expect(validateAnswersServerSide("repeat-script", {
      ...baseAnswers,
      medicationName: "Budesonide + formoterol",
      pbsCode: "MANUAL",
    }, identity)).toMatch(/strength/i)

    expect(validateAnswersServerSide("repeat-script", {
      ...baseAnswers,
      medicationName: "Budesonide + formoterol",
      medicationStrength: "100/3 micrograms",
      pbsCode: "MANUAL",
    }, identity)).toMatch(/form/i)

    expect(validateAnswersServerSide("repeat-script", {
      ...baseAnswers,
      medicationName: "Budesonide + formoterol",
      medicationStrength: "100/3 micrograms",
      medicationForm: "inhaler",
      pbsCode: "MANUAL",
    }, identity)).toBeNull()
  })

  it("validates every active medication in a repeat prescription payload", () => {
    const baseAnswers = {
      medicationName: "Rosuvastatin",
      medicationStrength: "10 mg",
      medicationForm: "tablet",
      pbsCode: "MANUAL",
      prescriptionHistory: "6 to 12 months",
      currentDose: "10 mg nightly",
      ...sharedMedicalHistory,
      medicareNumber: "1111111111",
      medicareIrn: "2",
      addressLine1: "12 Manual Entry Road",
      suburb: "Sydney",
      state: "NSW",
      postcode: "2000",
      sex: "M",
    }

    expect(String(validateAnswersServerSide("repeat-script", {
      ...baseAnswers,
      medications: [
        { name: "Rosuvastatin", strength: "10 mg", form: "tablet", pbsCode: "MANUAL" },
        { name: "Metformin", strength: "500 mg", pbsCode: "MANUAL" },
      ],
    }, identity))).toMatch(/form/i)
  })

  it("requires repeat prescription medication safety questions before checkout", () => {
    const validPrescriptionAnswers = {
      medicationName: "Budesonide + formoterol",
      medicationStrength: "100/3 micrograms",
      medicationForm: "inhaler",
      prescriptionHistory: "6 to 12 months",
      currentDose: "2 puffs twice daily",
      hasAllergies: false,
      hasConditions: false,
      medicareNumber: "1111111111",
      medicareIrn: "2",
      addressLine1: "12 Manual Entry Road",
      suburb: "Sydney",
      state: "NSW",
      postcode: "2000",
      sex: "M",
    }

    expect(validateAnswersServerSide("repeat-script", validPrescriptionAnswers, identity)).toContain("other medications")

    expect(validateAnswersServerSide("repeat-script", {
      ...validPrescriptionAnswers,
      hasOtherMedications: false,
    }, identity)).toContain("pregnant")

    expect(validateAnswersServerSide("repeat-script", {
      ...validPrescriptionAnswers,
      hasOtherMedications: false,
      isPregnantOrBreastfeeding: false,
    }, identity)).toContain("adverse")

    expect(validateAnswersServerSide("repeat-script", {
      ...validPrescriptionAnswers,
      ...sharedMedicalHistory,
    }, identity)).toBeNull()
  })
})
