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
import { checkSafetyForServer } from "@/lib/safety"

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

const sharedPrescribingIdentity = {
  medicareNumber: "1111111111",
  medicareIrn: "2",
  addressLine1: "12 Manual Entry Road",
  suburb: "Sydney",
  state: "NSW",
  postcode: "2000",
  sex: "M",
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
      edAlphaBlockers: false,
      edRecentHeartEvent: false,
      edSevereHeart: false,
      takes_medications: "no",
      has_allergies: "no",
      has_conditions: "no",
      previousEdMeds: false,
      edPreference: "doctor_recommendation",
      ...sharedPrescribingIdentity,
    }

    expect(validateAnswersServerSide("consult", answers, identity)).toBeNull()
    expect(resolveCheckoutSubtype("consult", answers, "")).toBe("ed")
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
      ...sharedPrescribingIdentity,
    }

    expect(validateAnswersServerSide("consult", answers, identity)).toBeNull()
    expect(resolveCheckoutSubtype("consult", answers, "")).toBe("hair_loss")
  })

  it("does not ask ED and hair loss patients for duplicate generic medical history", () => {
    const baseContext: StepContext = {
      isAuthenticated: false,
      hasProfile: false,
      hasCompleteIdentity: false,
      hasMedicare: false,
      hasAddress: false,
      hasPhone: false,
      serviceType: "consult",
      answers: {},
    }

    const edSteps = getStepsForService("consult", {
      ...baseContext,
      answers: { consultSubtype: "ed" },
    }).map((step) => step.id)
    const hairLossSteps = getStepsForService("consult", {
      ...baseContext,
      answers: { consultSubtype: "hair_loss" },
    }).map((step) => step.id)

    // ED + hair loss collect medical history inside their subtype-specific
    // health screens, so the generic medical-history step should NOT appear.
    expect(edSteps).not.toContain("medical-history")
    expect(hairLossSteps).not.toContain("medical-history")
  })

  it("requires phone for authenticated consult step skipping", () => {
    // Per the 2026-05-21 operator rule, every non-medcert service requires the
    // full structured identity bundle (address + Medicare + sex + phone), not
    // just prescribing subtypes. The test still pins phone-as-required by
    // toggling only the phone flag while keeping every other identity bit
    // satisfied.
    const baseContext: StepContext = {
      isAuthenticated: true,
      hasProfile: true,
      hasCompleteIdentity: true,
      hasMedicare: true,
      hasAddress: true,
      hasSex: true,
      serviceType: "consult",
      answers: {
        // Use any active specialty subtype — this test is about the phone
        // requirement, not the subtype. ED is the most common live consult.
        consultSubtype: "ed",
      },
    }

    const withoutPhone = getStepsForService("consult", baseContext).map((step) => step.id)
    const withPhone = getStepsForService("consult", { ...baseContext, hasPhone: true }).map((step) => step.id)

    expect(withoutPhone).toContain("details")
    expect(withPhone).not.toContain("details")
    expect(validateAnswersServerSide("consult", {}, { ...identity, phone: undefined })).toContain("Phone number is required")
  })

  it("does not skip ED or hair loss details unless prescribing identity is complete", () => {
    const baseContext: StepContext = {
      isAuthenticated: true,
      hasProfile: true,
      hasCompleteIdentity: true,
      hasMedicare: true,
      hasAddress: false,
      hasPhone: true,
      hasSex: false,
      serviceType: "consult",
      answers: {
        consultSubtype: "ed",
      },
    }

    expect(getStepsForService("consult", baseContext).map((step) => step.id)).toContain("details")
    expect(getStepsForService("consult", {
      ...baseContext,
      hasAddress: true,
      hasSex: true,
    }).map((step) => step.id)).not.toContain("details")
  })

  it("blocks prescribing consult checkout when prescribing identity is incomplete", () => {
    const edAnswers = {
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
      edAlphaBlockers: false,
      edRecentHeartEvent: false,
      edSevereHeart: false,
      takes_medications: "no",
      has_allergies: "no",
      has_conditions: "no",
      previousEdMeds: false,
      edPreference: "doctor_recommendation",
      medicareNumber: "1111111111",
      addressLine1: "12 Manual Entry Road",
      suburb: "Sydney",
      state: "NSW",
      postcode: "2000",
      sex: "M",
    }

    expect(validateAnswersServerSide("consult", edAnswers, identity)).toContain("IRN")
    expect(validateAnswersServerSide("consult", {
      ...edAnswers,
      medicareIrn: "2",
    }, identity)).toBeNull()
  })

  it("blocks ED checkout when Medicare is missing or a placeholder", () => {
    const edAnswers = {
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
      edAlphaBlockers: false,
      edRecentHeartEvent: false,
      edSevereHeart: false,
      takes_medications: "no",
      has_allergies: "no",
      has_conditions: "no",
      previousEdMeds: false,
      edPreference: "doctor_recommendation",
      medicareIrn: "2",
      addressLine1: "12 Manual Entry Road",
      suburb: "Sydney",
      state: "NSW",
      postcode: "2000",
      sex: "M",
    }

    expect(validateAnswersServerSide("consult", edAnswers, identity)).toBe(
      "Medicare number or IHI is required for prescribing consults.",
    )
    expect(validateAnswersServerSide("consult", {
      ...edAnswers,
      medicareNumber: "0000000000",
    }, identity)).toBe("Enter a valid Medicare number or provide a valid IHI.")
  })

  it("allows prescription consult checkout with a valid IHI instead of Medicare", () => {
    const edAnswers = {
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
      edAlphaBlockers: false,
      edRecentHeartEvent: false,
      edSevereHeart: false,
      takes_medications: "no",
      has_allergies: "no",
      has_conditions: "no",
      previousEdMeds: false,
      edPreference: "doctor_recommendation",
      ihiNumber: "8003600000000000",
      addressLine1: "12 Manual Entry Road",
      suburb: "Sydney",
      state: "NSW",
      postcode: "2000",
      sex: "M",
    }

    expect(validateAnswersServerSide("consult", edAnswers, identity)).toBeNull()
    expect(transformAnswersForUnifiedCheckout("consult", edAnswers).ihi_number).toBe("8003600000000000")
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

  it("maps medical certificate emergency free text into server safety rules", () => {
    const transformed = transformAnswersForUnifiedCheckout("med-cert", {
      certType: "work",
      duration: "1",
      startDate: new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Sydney" }),
      symptoms: ["cold_flu"],
      symptomDetails: "I have crushing chest pain and feel unwell today.",
      symptomDuration: "today",
    })

    expect(transformed.emergency_symptoms).toContain("chest_pain")

    const result = checkSafetyForServer("medical-certificate", transformed)
    expect(result.isAllowed).toBe(false)
    expect(result.outcome).toBe("DECLINE")
    expect(result.triggeredRuleIds).toContain("emergency_chest_pain")

    const genericEmergency = transformAnswersForUnifiedCheckout("med-cert", {
      certType: "work",
      duration: "1",
      startDate: new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Sydney" }),
      symptoms: ["cold_flu"],
      symptomDetails: "I had a seizure and cannot safely manage this at home.",
      symptomDuration: "today",
    })

    expect(genericEmergency.emergency_symptoms).toContain("emergency_free_text")
    expect(checkSafetyForServer("medical-certificate", genericEmergency).triggeredRuleIds).toContain(
      "emergency_free_text",
    )
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

  it("server-blocks future consult subtypes even if the client route is bypassed", () => {
    expect(
      validateAnswersServerSide("consult", {
        consultSubtype: "weight_loss",
      }, identity),
    ).toContain("not currently available")

    expect(
      validateAnswersServerSide("consult", {
        consultSubtype: "womens_health",
      }, identity),
    ).toContain("not currently available")
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

  it("blocks prescription checkout when Medicare is an all-zero placeholder", () => {
    const validPrescriptionAnswers = {
      medicationName: "Budesonide + formoterol",
      medicationStrength: "100/3 micrograms",
      medicationForm: "inhaler",
      prescriptionHistory: "6 to 12 months",
      currentDose: "2 puffs twice daily",
      ...sharedMedicalHistory,
      medicareNumber: "0000000000",
      medicareIrn: "2",
      addressLine1: "12 Manual Entry Road",
      suburb: "Sydney",
      state: "NSW",
      postcode: "2000",
      sex: "M",
    }

    expect(
      validateAnswersServerSide("repeat-script", validPrescriptionAnswers, identity),
    ).toBe("Enter a valid Medicare number or provide a valid IHI.")
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

    // A3 softening: a missing strength or form no longer blocks the step. The
    // patient proceeds and the doctor sees medication_strength_missing /
    // medication_form_missing flags. (Unknown-med above still hard-blocks.)
    expect(validateAnswersServerSide("repeat-script", {
      ...baseAnswers,
      medicationName: "Budesonide + formoterol",
      medicationForm: "inhaler",
      pbsCode: "MANUAL",
    }, identity)).toBeNull()

    expect(validateAnswersServerSide("repeat-script", {
      ...baseAnswers,
      medicationName: "Budesonide + formoterol",
      medicationStrength: "100/3 micrograms",
      pbsCode: "MANUAL",
    }, identity)).toBeNull()

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

    // A3 softening: a secondary medication missing its form no longer blocks at
    // the step — it proceeds and the doctor sees a medication_form_missing flag.
    // (Controlled-substance hard-blocking is a checkout-layer concern, covered by
    // repeat-script-schema.test.ts, not this step-level validator.)
    expect(validateAnswersServerSide("repeat-script", {
      ...baseAnswers,
      medications: [
        { name: "Rosuvastatin", strength: "10 mg", form: "tablet", pbsCode: "MANUAL" },
        { name: "Metformin", strength: "500 mg", pbsCode: "MANUAL" },
      ],
    }, identity)).toBeNull()
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
