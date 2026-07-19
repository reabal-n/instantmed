/**
 * Request Flow Validation Utilities
 *
 * Zod-powered validation for all step components.
 * Each schema defines the shape + constraints; wrapper functions
 * return the legacy { isValid, errors } shape consumed by step components.
 */

import { z } from "zod"

import { validateSymptomTextQuality } from "@/lib/clinical/symptom-text-quality"
import {
  isExactStringValue,
  PILL_CONTRACEPTION_TYPE_VALUES,
  PILL_CURRENT_CONTRACEPTION_VALUES,
  PILL_PREGNANCY_DECLINE_REASON,
  PILL_PREGNANCY_STATUS_VALUES,
  PILL_YES_NO_VALUES,
} from "@/lib/clinical/womens-health-pill"
import { validateCertificateStartDate } from "@/lib/medical-certificates/date-policy"
import { isWomensHealthOptionLive } from "@/lib/request/consult-subtypes"
import {
  buildRepeatScriptMedicationValidationText,
  extractRepeatScriptMedications,
  isUsefulMedicationDescription,
} from "@/lib/validation/repeat-script-medications"

export interface ValidationResult {
  isValid: boolean
  errors: Record<string, string>
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Run a Zod schema against data and return a ValidationResult. */
function runSchema(schema: z.ZodType, data: unknown): ValidationResult {
  const result = schema.safeParse(data)
  if (result.success) return { isValid: true, errors: {} }

  const errors: Record<string, string> = {}
  for (const issue of result.error.issues) {
    const key = issue.path.join(".")
    if (!errors[key]) errors[key] = issue.message
  }
  return { isValid: false, errors }
}

/** Require a non-empty trimmed string. */
const nonEmptyString = (msg: string) =>
  z.string({ error: msg }).min(1, msg)

// ---------------------------------------------------------------------------
// Field-level validators (used by individual step components)
// ---------------------------------------------------------------------------

// Australian phone regex
const AU_PHONE_REGEX = /^(\+?61|0)[2-9]\d{8}$|^04\d{8}$/

export function validateEmail(email: string | undefined): string | null {
  if (!email?.trim()) return "Email is required"
  // Use Zod .email() for consistency with lib/validation/schemas.ts
  const result = z.string().email().safeParse(email.trim())
  if (!result.success) return "Please enter a valid email"
  return null
}

export function validatePhone(phone: string | undefined, required = false): string | null {
  if (!phone?.trim()) {
    return required ? "Phone number is required" : null
  }
  const cleaned = phone.replace(/[\s-]/g, "")
  if (!AU_PHONE_REGEX.test(cleaned)) {
    return "Please enter a valid Australian phone number"
  }
  return null
}

export function validateDOB(dob: string | undefined): string | null {
  if (!dob) return "Date of birth is required"
  const birthDate = new Date(dob)
  if (isNaN(birthDate.getTime())) return "Please enter a valid date"
  const age = (Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
  if (age < 18) return "You must be 18 or older"
  if (age > 120) return "Please enter a valid date of birth"
  return null
}

export function validateName(name: string | undefined, fieldName = "Name"): string | null {
  if (!name?.trim()) return `${fieldName} is required`
  if (name.trim().length < 2) return `${fieldName} must be at least 2 characters`
  if (!/^[\p{L}\s'-]+$/u.test(name)) return `${fieldName} contains invalid characters`
  return null
}

export function validateText(
  text: string | undefined,
  options: { required?: boolean; minLength?: number; maxLength?: number; fieldName?: string } = {}
): string | null {
  const { required = false, minLength, maxLength, fieldName = "This field" } = options
  if (!text?.trim()) return required ? `${fieldName} is required` : null
  if (minLength && text.trim().length < minLength) return `${fieldName} must be at least ${minLength} characters`
  if (maxLength && text.trim().length > maxLength) return `${fieldName} must be less than ${maxLength} characters`
  return null
}

export function validateSelection(
  value: string | string[] | undefined,
  required = true,
  fieldName = "selection"
): string | null {
  if (!required) return null
  if (Array.isArray(value)) {
    return value.length === 0 ? `Please select at least one ${fieldName}` : null
  }
  return !value ? `Please select a ${fieldName}` : null
}

// ---------------------------------------------------------------------------
// Step schemas
// ---------------------------------------------------------------------------

export const certificateStepSchema = z.object({
  certType: nonEmptyString("Please select certificate type"),
  duration: nonEmptyString("Please select duration"),
  startDate: nonEmptyString("Please select start date"),
}).superRefine((data, ctx) => {
  const startDateValidation = validateCertificateStartDate(data.startDate)
  if (!startDateValidation.valid) {
    ctx.addIssue({
      code: "custom",
      message: startDateValidation.error || "Invalid start date",
      path: ["startDate"],
    })
  }
})

export const symptomsStepSchema = z.object({
  symptoms: z
    .array(z.string())
    .optional(),
  symptomDetails: z
    .string()
    .superRefine((v, ctx) => {
      const result = validateSymptomTextQuality(v)
      if (!result.valid) {
        ctx.addIssue({
          code: "custom",
          message: result.reason ?? "Please provide more detail about your symptoms",
        })
      }
    }),
  // Optional since P1.1 (2026-07-10) — doctor/AI context, not a safety gate.
  symptomDuration: z.string().optional(),
})

const medicationEntrySchema = z.object({
  product: z.unknown().optional().nullable(),
  name: z.string().optional(),
  strength: z.string().optional().nullable(),
  form: z.string().optional().nullable(),
  pbsCode: z.string().optional().nullable(),
})

export const medicationStepSchema = z
  .object({
    medicationName: z.string().optional(),
    medicationStrength: z.string().optional(),
    medicationForm: z.string().optional(),
    pbsCode: z.string().optional(),
    medications: z.array(medicationEntrySchema).optional(),
  })
  .superRefine((data, ctx) => {
    const answers = data as Record<string, unknown>
    const medications = extractRepeatScriptMedications(answers)

    if (medications.length === 0) {
      ctx.addIssue({ code: "custom", path: ["medicationName"], message: "Please select or enter a medication" })
      return
    }

    if (medications.length > 1) {
      ctx.addIssue({
        code: "custom",
        path: ["medications"],
        message: "Request one medication at a time so the doctor can review the right dose and history.",
      })
      return
    }

    medications.forEach((medication, index) => {
      const pbsCode = medication.pbsCode || ""
      const medicationText = buildRepeatScriptMedicationValidationText(medication).toLowerCase()

      // A3 softening (boundary 3): an unknown medicine may pass only with a useful
      // free-text description; otherwise it stays a hard block at the step.
      const isUnknown = pbsCode.toUpperCase() === "UNKNOWN" || medicationText.includes("unknown - doctor")
      if (isUnknown && !isUsefulMedicationDescription(medication.description)) {
        ctx.addIssue({
          code: "custom",
          path: index === 0 ? ["medicationName"] : ["medications", index, "name"],
          message: "Tell us what you can about this medicine (what it's for, the name on the box, or how it looks) so the doctor can identify it.",
        })
        return
      }

      // A3 softening: a missing strength OR a missing form is no longer a step
      // block — both are now soft flags. The patient proceeds and the doctor
      // sees a `medication_strength_missing` / `medication_form_missing` flag
      // (boundary 2) rather than being hard-stopped at this step.
    })
  })

export const medicationHistoryStepSchema = z
  .object({
    prescriptionHistory: nonEmptyString("Please indicate when you last had this prescribed"),
    // Repeat-Rx requires dose+frequency and an indication so the doctor knows
    // exactly what to prescribe (operator decision 2026-06-26; reverses the
    // earlier A3 boundary-4 softening for repeat scripts). Enforced only for a
    // genuine repeat — the not-prescribed-before / unknown-medication escapes
    // are handled upstream in the medication step.
    currentDose: z.string().optional(),
    indication: z.string().optional(),
    doseChanged: z.boolean().optional(),
    hasSideEffects: z.boolean().optional(),
    sideEffects: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.prescriptionHistory.trim().toLowerCase() === "never") {
      ctx.addIssue({
        code: "custom",
        path: ["prescriptionHistory"],
        message: "This repeat prescription service is only for medicines prescribed before.",
      })
      return
    }
    if (!data.currentDose?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["currentDose"],
        message: "Tell the doctor your current dose and how often you take it",
      })
    }
    if (!data.indication?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["indication"],
        message: "Tell the doctor what this medication is for",
      })
    }
    if (data.doseChanged === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["doseChanged"],
        message: "Please confirm whether the dose or the way you take this medicine has changed",
      })
    }
    if (data.doseChanged) {
      ctx.addIssue({
        code: "custom",
        path: ["doseChanged"],
        message: "A dose or directions change needs review by your regular GP or specialist",
      })
    }
    if (typeof data.hasSideEffects !== "boolean") {
      ctx.addIssue({
        code: "custom",
        path: ["hasSideEffects"],
        message: "Please indicate if you have had side effects",
      })
    } else if (data.hasSideEffects === true && !data.sideEffects?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["sideEffects"],
        message: "Please describe the side effects you experienced",
      })
    }
  })

export const medicalHistoryStepSchema = z
  .object({
    hasAllergies: z.boolean({ error: "Please indicate if you have any allergies" }),
    allergies: z.string().optional(),
    hasConditions: z.boolean({ error: "Please indicate if you have any medical conditions" }),
    conditions: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.hasAllergies === true && !data.allergies) {
      ctx.addIssue({ code: "custom", path: ["allergies"], message: "Please list your allergies" })
    }
    if (data.hasConditions === true && !data.conditions) {
      ctx.addIssue({ code: "custom", path: ["conditions"], message: "Please list your conditions" })
    }
  })

export const prescriptionMedicalHistoryStepSchema = z
  .object({
    hasAllergies: z.boolean({ error: "Please indicate if you have any allergies" }),
    allergies: z.string().optional(),
    hasConditions: z.boolean({ error: "Please indicate if you have any medical conditions" }),
    conditions: z.string().optional(),
    hasOtherMedications: z.boolean({ error: "Please indicate if you take any other medications" }),
    otherMedications: z.string().optional(),
    isPregnantOrBreastfeeding: z.boolean({ error: "Please indicate if you are pregnant or breastfeeding" }),
    hasAdverseMedicationReactions: z.boolean({ error: "Please indicate if you have had adverse medication reactions" }),
  })
  .superRefine((data, ctx) => {
    if (data.hasAllergies === true && !data.allergies?.trim()) {
      ctx.addIssue({ code: "custom", path: ["allergies"], message: "Please list your allergies" })
    }
    if (data.hasConditions === true && !data.conditions?.trim()) {
      ctx.addIssue({ code: "custom", path: ["conditions"], message: "Please list your conditions" })
    }
    if (data.hasOtherMedications === true && !data.otherMedications?.trim()) {
      ctx.addIssue({ code: "custom", path: ["otherMedications"], message: "Please list your other medications" })
    }
  })

// ---------------------------------------------------------------------------
// ED Intake - 3-step validation (goals+severity, health, treatment)
// ---------------------------------------------------------------------------

/**
 * Opening step. Owns duration plus the single severity item that replaced the
 * five-question IIEF-5 step on 2026-07-19.
 *
 * `edGoal` is no longer collected (no doctor surface acted on it) and the IIEF
 * fields are no longer produced, but both stay optional here so a draft saved
 * before the change still validates instead of bouncing the patient back.
 */
export const edGoalsStepSchema = z
  .object({
    edDuration: nonEmptyString("Please indicate how long this has been a concern"),
    edErectionFrequency: z.number().min(1).max(5).optional(),
    edGoal: z.string().optional(),
    // Present only on drafts/intakes created before 2026-07-19.
    iief1: z.number().min(1).max(5).optional(),
    iiefTotal: z.number().min(5).max(25).optional(),
  })
  .superRefine((data, ctx) => {
    // A draft saved before the IIEF-5 step was retired already carries a
    // severity answer — it is just recorded with the old instrument. Demanding
    // the new field would block that patient at checkout on a question they
    // were never shown, so the stored assessment satisfies this step.
    const hasLegacyAssessment = data.iief1 !== undefined || data.iiefTotal !== undefined
    if (hasLegacyAssessment) return

    if (data.edErectionFrequency === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["edErectionFrequency"],
        message: "Please answer how often this happens",
      })
    }
  })

/**
 * Legacy: drafts and historical intakes created before 2026-07-19 carry a full
 * IIEF-5 set. Nothing collects these now, so the step schema only validates
 * them when they are present.
 */
export const edLegacyAssessmentSchema = z.object({
  iief1: z.number().min(1).max(5).optional(),
  iief2: z.number().min(1).max(5).optional(),
  iief3: z.number().min(1).max(5).optional(),
  iief4: z.number().min(1).max(5).optional(),
  iief5: z.number().min(1).max(5).optional(),
  iiefTotal: z.number().min(5).max(25).optional(),
})

export const edHealthStepSchema = z
  .object({
    edNitrates: z.boolean({ error: "Please answer this safety question" }),
    edAlphaBlockers: z.boolean().optional(),
    edRecentHeartEvent: z.boolean({ error: "Please answer this safety question" }),
    edSevereHeart: z.boolean({ error: "Please answer this safety question" }),
    edGpCleared: z.boolean().optional(),
    edHypertension: z.boolean().optional(),
    edDiabetes: z.boolean().optional(),
    edBpMedication: z.boolean().optional(),
    has_allergies: z.union([z.literal("yes"), z.literal("no")]).optional(),
    known_allergies: z.string().optional(),
    has_conditions: z.union([z.literal("yes"), z.literal("no")]).optional(),
    existing_conditions: z.string().optional(),
    takes_medications: z.union([z.literal("yes"), z.literal("no")]).optional(),
    current_medications: z.string().optional(),
    previousEdMeds: z.boolean().optional(),
    edPreviousTreatment: z.string().optional(),
    edPreviousEffectiveness: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.edNitrates === true) {
      ctx.addIssue({
        code: "custom",
        path: ["edNitrates"],
        message: "This service is not suitable for patients taking nitrates",
      })
    }
    if (data.edAlphaBlockers === undefined) {
      ctx.addIssue({ code: "custom", path: ["edAlphaBlockers"], message: "Please answer this safety question" })
    }
    if (data.edRecentHeartEvent === true && !data.edGpCleared) {
      ctx.addIssue({
        code: "custom",
        path: ["edGpCleared"],
        message: "Please confirm your GP has cleared you",
      })
    }
    if (data.edSevereHeart === true && !data.edGpCleared) {
      ctx.addIssue({
        code: "custom",
        path: ["edGpCleared"],
        message: "Please confirm your GP has cleared you",
      })
    }
    if (data.takes_medications === undefined) {
      ctx.addIssue({ code: "custom", path: ["takes_medications"], message: "Please answer medication question" })
    }
    if (data.has_allergies === undefined) {
      ctx.addIssue({ code: "custom", path: ["has_allergies"], message: "Please answer allergies question" })
    }
    if (data.has_conditions === undefined) {
      ctx.addIssue({ code: "custom", path: ["has_conditions"], message: "Please answer conditions question" })
    }
    if (data.has_allergies === "yes" && !data.known_allergies?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["known_allergies"],
        message: "Please list your allergies",
      })
    }
    if (data.has_conditions === "yes" && !data.existing_conditions?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["existing_conditions"],
        message: "Please list your conditions",
      })
    }
    if (data.takes_medications === "yes" && !data.current_medications?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["current_medications"],
        message: "Please list your medications",
      })
    }
  })

/**
 * Treatment step. Owns the preference plus the prior-treatment history that
 * moved off the safety screen on 2026-07-19.
 *
 * `edPreviousEffectiveness` stays declared but is no longer collected — the
 * free-text answer captures "and how did it go" in one field. Legacy drafts and
 * historical intakes that carry the old chip value still validate.
 */
export const edPreferencesStepSchema = z
  .object({
    edPreference: nonEmptyString("Please select a treatment preference"),
    previousEdMeds: z.boolean({ error: "Please answer previous treatment question" }),
    edPreviousTreatment: z.string().optional(),
    edPreviousEffectiveness: z.string().optional(),
    edAdditionalInfo: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.previousEdMeds === true && !data.edPreviousTreatment?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["edPreviousTreatment"],
        message: "Please tell us what you have used before",
      })
    }
  })

// Hair loss - Step 1: Goals
export const hairLossGoalsStepSchema = z.object({
  hairGoal: nonEmptyString("Please select your goal"),
  hairOnset: nonEmptyString("Please indicate when you first noticed changes"),
})

// Hair loss - Step 2: Assessment (visual Norwood + family history)
export const hairLossAssessmentStepSchema = z.object({
  hairPattern: nonEmptyString("Please select your hair loss pattern"),
  hairFamilyHistory: nonEmptyString("Please indicate family history"),
})

// Hair loss - Step 3: Health screening
export const hairLossHealthStepSchema = z
  .object({
    hairReproductive: nonEmptyString("Please answer this safety question"),
    scalpDandruff: z.boolean().optional(),
    scalpPsoriasis: z.boolean().optional(),
    scalpItching: z.boolean().optional(),
    scalpFolliculitis: z.boolean().optional(),
    scalpNone: z.boolean().optional(),
    hairLowBP: z.boolean().optional(),
    hairHeartConditions: z.boolean().optional(),
    has_allergies: z.union([z.literal("yes"), z.literal("no")]).optional(),
    known_allergies: z.string().optional(),
    has_conditions: z.union([z.literal("yes"), z.literal("no")]).optional(),
    existing_conditions: z.string().optional(),
    takes_medications: z.union([z.literal("yes"), z.literal("no")]).optional(),
    current_medications: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    // Finasteride hard block: Category X teratogen
    if (data.hairReproductive === "yes") {
      ctx.addIssue({
        code: "custom",
        path: ["hairReproductive"],
        message: "Hair loss medication cannot be prescribed when a partner is pregnant or trying to conceive",
      })
    }
    const scalpComplete =
      data.scalpDandruff === true ||
      data.scalpPsoriasis === true ||
      data.scalpItching === true ||
      data.scalpFolliculitis === true ||
      data.scalpNone === true
    if (!scalpComplete) {
      ctx.addIssue({
        code: "custom",
        path: ["scalp"],
        message: "Please complete the scalp health screen",
      })
    }
    if (data.hairLowBP === undefined || data.hairHeartConditions === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["bloodPressureAndHeart"],
        message: "Please complete the blood pressure and heart screen",
      })
    }
    if (data.takes_medications === undefined) {
      ctx.addIssue({ code: "custom", path: ["takes_medications"], message: "Please answer medication question" })
    }
    if (data.has_allergies === undefined) {
      ctx.addIssue({ code: "custom", path: ["has_allergies"], message: "Please answer allergies question" })
    }
    if (data.has_conditions === undefined) {
      ctx.addIssue({ code: "custom", path: ["has_conditions"], message: "Please answer conditions question" })
    }
    if (data.has_allergies === "yes" && !data.known_allergies?.trim()) {
      ctx.addIssue({ code: "custom", path: ["known_allergies"], message: "Please list your allergies" })
    }
    if (data.has_conditions === "yes" && !data.existing_conditions?.trim()) {
      ctx.addIssue({ code: "custom", path: ["existing_conditions"], message: "Please list your conditions" })
    }
    if (data.takes_medications === "yes" && !data.current_medications?.trim()) {
      ctx.addIssue({ code: "custom", path: ["current_medications"], message: "Please list your medications" })
    }
  })

// Hair loss - Step 4: Preferences
export const hairLossPreferencesStepSchema = z.object({
  hairMedicationPreference: nonEmptyString("Please select a treatment preference"),
})

export const womensHealthTypeStepSchema = z.object({
  womensHealthOption: nonEmptyString("Please select what you need help with"),
})

export const weightLossAssessmentStepSchema = z
  .object({
    currentWeight: nonEmptyString("Please enter your current weight"),
    currentHeight: nonEmptyString("Please enter your height"),
    targetWeight: nonEmptyString("Please enter your target weight"),
    previousAttempts: nonEmptyString("Please indicate previous weight loss attempts"),
    weightLossMedPreference: nonEmptyString("Please select a medication preference"),
    eatingDisorderHistory: nonEmptyString("Please answer this question"),
    wlAdverseReactions: nonEmptyString("Please answer this question"),
    wlAdverseReactionsDetails: z.string().optional(),
    weightLossGoals: z
      .string()
      .refine((v) => (v?.trim().length ?? 0) >= 20, {
        message: "Please describe your goals (at least 20 characters)",
      }),
  })
  .superRefine((data, ctx) => {
    if (data.wlAdverseReactions === "yes") {
      if (!data.wlAdverseReactionsDetails || data.wlAdverseReactionsDetails.trim().length < 10) {
        ctx.addIssue({
          code: "custom",
          path: ["wlAdverseReactionsDetails"],
          message: "Please describe your adverse reactions",
        })
      }
    }
  })

export const weightLossCallStepSchema = z.object({
  preferredTimeSlot: nonEmptyString("Please select a preferred time"),
  callbackPhone: z
    .string()
    .refine((v) => {
      const cleaned = v?.replace(/[\s-]/g, "") ?? ""
      return AU_PHONE_REGEX.test(cleaned)
    }, {
      message: "Please enter a valid Australian phone number",
    }),
})

export const checkoutStepSchema = z.object({
  agreedToTerms: z.literal(true, {
    error: "You must agree to the terms of service",
  }),
  confirmedAccuracy: z.literal(true, {
    error: "You must confirm your information is accurate",
  }),
})

// ---------------------------------------------------------------------------
// Step validation functions (preserve existing API)
// ---------------------------------------------------------------------------

export function validateCertificateStep(answers: Record<string, unknown>): ValidationResult {
  return runSchema(certificateStepSchema, answers)
}

export function validateSymptomsStep(answers: Record<string, unknown>): ValidationResult {
  return runSchema(symptomsStepSchema, answers)
}

export function validateMedicationStep(answers: Record<string, unknown>): ValidationResult {
  return runSchema(medicationStepSchema, answers)
}

export function validateMedicationHistoryStep(answers: Record<string, unknown>): ValidationResult {
  return runSchema(medicationHistoryStepSchema, {
    ...answers,
    currentDose: answers.currentDose ?? answers.current_dose ?? answers.dosageInstructions ?? answers.dosage_instructions,
  })
}

export function validateMedicalHistoryStep(answers: Record<string, unknown>): ValidationResult {
  return runSchema(medicalHistoryStepSchema, answers)
}

export function validatePrescriptionMedicalHistoryStep(answers: Record<string, unknown>): ValidationResult {
  return runSchema(prescriptionMedicalHistoryStepSchema, answers)
}

export function validateEdGoalsStep(answers: Record<string, unknown>): ValidationResult {
  return runSchema(edGoalsStepSchema, answers)
}

/**
 * Retained so a stored IIEF-5 set from before 2026-07-19 is still checked for
 * shape when present. It no longer gates any step — nothing collects these.
 */
export function validateEdLegacyAssessment(answers: Record<string, unknown>): ValidationResult {
  return runSchema(edLegacyAssessmentSchema, answers)
}

export function validateEdHealthStep(answers: Record<string, unknown>): ValidationResult {
  return runSchema(edHealthStepSchema, answers)
}

export function validateEdPreferencesStep(answers: Record<string, unknown>): ValidationResult {
  return runSchema(edPreferencesStepSchema, answers)
}

export function validateHairLossGoalsStep(answers: Record<string, unknown>): ValidationResult {
  return runSchema(hairLossGoalsStepSchema, answers)
}

export function validateHairLossAssessmentStep(answers: Record<string, unknown>): ValidationResult {
  return runSchema(hairLossAssessmentStepSchema, answers)
}

export function validateHairLossHealthStep(answers: Record<string, unknown>): ValidationResult {
  return runSchema(hairLossHealthStepSchema, answers)
}

export function validateHairLossPreferencesStep(answers: Record<string, unknown>): ValidationResult {
  return runSchema(hairLossPreferencesStepSchema, answers)
}

export function validateWomensHealthTypeStep(answers: Record<string, unknown>): ValidationResult {
  return runSchema(womensHealthTypeStepSchema, answers)
}

export function validateWomensHealthAssessmentStep(answers: Record<string, unknown>): ValidationResult {
  const errors: Record<string, string> = {}
  const option = answers.womensHealthOption as string | undefined

  // Server-trust guard: only live options may reach the assessment. ocp_repeat
  // is redirected to the repeat-script flow in the type step; morning-after /
  // period-pain are gated. A crafted payload must not slip a gated option through.
  if (!isWomensHealthOptionLive(option)) {
    return { isValid: false, errors: { womensHealthOption: "This option is not available yet." } }
  }

  if (option === "ocp_new") {
    const contraceptionType = answers.contraceptionType
    if (!contraceptionType) {
      errors.contraceptionType = "Please select what you need"
    } else if (!isExactStringValue(contraceptionType, PILL_CONTRACEPTION_TYPE_VALUES)) {
      errors.contraceptionType = "Current-pill repeats go through repeat prescriptions."
    }
    // Client (ContraceptionAssessment.validate) requires this unconditionally for
    // the new/switch pill screen; mirror it here so a crafted payload can't skip it.
    if (!isExactStringValue(answers.contraceptionCurrent, PILL_CURRENT_CONTRACEPTION_VALUES)) {
      errors.contraceptionCurrent = "Please select an option"
    }
    if (!isExactStringValue(answers.pregnancyStatus, PILL_PREGNANCY_STATUS_VALUES)) {
      errors.pregnancyStatus = "Please answer this question"
    } else if (answers.pregnancyStatus === "yes") {
      errors.pregnancyStatus = PILL_PREGNANCY_DECLINE_REASON
    }
    if (!isExactStringValue(answers.womens_migraine_aura, PILL_YES_NO_VALUES)) {
      errors.womens_migraine_aura = "Please answer this question"
    }
    if (!isExactStringValue(answers.womens_blood_clot_history, PILL_YES_NO_VALUES)) {
      errors.womens_blood_clot_history = "Please answer this question"
    }
    if (!isExactStringValue(answers.womens_smoker, PILL_YES_NO_VALUES)) {
      errors.womens_smoker = "Please answer this question"
    }
  } else if (option === "uti") {
    const symptoms = answers.utiSymptoms as string[] | undefined
    if (!symptoms || symptoms.length === 0) errors.utiSymptoms = "Please select at least one symptom"
    if (!answers.utiRedFlags) errors.utiRedFlags = "Please answer this safety question"
    if (!answers.utiPregnant) errors.utiPregnant = "Please answer this question"
  } else if (option === "period_pain" || option === "other") {
    const details = answers.womensDetails as string | undefined
    if (!details || details.trim().length < 20) {
      errors.womensDetails = "Please provide more detail (at least 20 characters)"
    }
  }

  return { isValid: Object.keys(errors).length === 0, errors }
}

export function validateWeightLossAssessmentStep(answers: Record<string, unknown>): ValidationResult {
  return runSchema(weightLossAssessmentStepSchema, answers)
}

export function validateWeightLossCallStep(answers: Record<string, unknown>): ValidationResult {
  return runSchema(weightLossCallStepSchema, answers)
}

export function validateDetailsStep(
  identity: { firstName?: string; lastName?: string; email?: string; phone?: string; dob?: string },
  options: { requirePhone?: boolean } = {}
): ValidationResult {
  const errors: Record<string, string> = {}

  const firstNameError = validateName(identity.firstName, "First name")
  if (firstNameError) errors.firstName = firstNameError

  const lastNameError = validateName(identity.lastName, "Last name")
  if (lastNameError) errors.lastName = lastNameError

  const emailError = validateEmail(identity.email)
  if (emailError) errors.email = emailError

  const dobError = validateDOB(identity.dob)
  if (dobError) errors.dob = dobError

  const phoneError = validatePhone(identity.phone, options.requirePhone)
  if (phoneError) errors.phone = phoneError

  return { isValid: Object.keys(errors).length === 0, errors }
}

export function validateCheckoutStep(consents: {
  agreedToTerms?: boolean
  confirmedAccuracy?: boolean
}): ValidationResult {
  return runSchema(checkoutStepSchema, consents)
}

// Hook for real-time validation (lightweight pattern for component use)
export function useFieldValidation<T>(
  value: T,
  validator: (value: T) => string | null,
  _options: { validateOnMount?: boolean; validateOnBlur?: boolean } = {}
): {
  error: string | null
  validate: () => boolean
  clearError: () => void
} {
  return {
    error: null,
    validate: () => validator(value) === null,
    clearError: () => {},
  }
}
