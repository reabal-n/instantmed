/**
 * Request Flow Validation Utilities
 *
 * Zod-powered validation for all step components.
 * Each schema defines the shape + constraints; wrapper functions
 * return the legacy { isValid, errors } shape consumed by step components.
 */

import { z } from "zod"
import { validateSymptomTextQuality } from "@/lib/clinical/symptom-text-quality"

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
})

export const symptomsStepSchema = z.object({
  symptoms: z
    .array(z.string())
    .min(1, "Please select at least one symptom"),
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
  symptomDuration: nonEmptyString("Please indicate how long you've had these symptoms"),
})

export const medicationStepSchema = z.object({
  medicationName: nonEmptyString("Please select or enter a medication"),
})

export const medicationHistoryStepSchema = z.object({
  prescriptionHistory: nonEmptyString("Please indicate when you last had this prescribed"),
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

export const consultReasonStepSchema = z.object({
  consultCategory: nonEmptyString("Please select what you'd like help with"),
  consultDetails: z
    .string()
    .refine((v) => (v?.trim().length ?? 0) >= 20, {
      message: "Please provide more detail (at least 20 characters)",
    }),
  consultUrgency: nonEmptyString("Please indicate how urgent this is"),
})

// ---------------------------------------------------------------------------
// ED Intake — 4-step validation
// ---------------------------------------------------------------------------

export const edGoalsStepSchema = z.object({
  edGoal: nonEmptyString("Please select your main goal"),
  edDuration: nonEmptyString("Please indicate how long this has been a concern"),
  edAgeConfirmed: z.literal(true, {
    error: "Please confirm you are 18 or older",
  }),
})

export const edAssessmentStepSchema = z.object({
  iief1: z.number({ error: "Please rate your confidence" }).min(1).max(5),
  iief2: z.number({ error: "Please answer this question" }).min(1).max(5),
  iief3: z.number({ error: "Please answer this question" }).min(1).max(5),
  iief4: z.number({ error: "Please answer this question" }).min(1).max(5),
  iief5: z.number({ error: "Please answer this question" }).min(1).max(5),
})

export const edHealthStepSchema = z
  .object({
    edNitrates: z.boolean({ error: "Please answer this safety question" }),
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

export const edPreferencesStepSchema = z.object({
  edPreference: nonEmptyString("Please select a treatment preference"),
})

export const hairLossAssessmentStepSchema = z.object({
  hairPattern: nonEmptyString("Please select your hair loss pattern"),
  hairDuration: nonEmptyString("Please indicate how long you've noticed hair loss"),
  hairFamilyHistory: nonEmptyString("Please indicate family history"),
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
  return runSchema(medicationHistoryStepSchema, answers)
}

export function validateMedicalHistoryStep(answers: Record<string, unknown>): ValidationResult {
  return runSchema(medicalHistoryStepSchema, answers)
}

export function validateConsultReasonStep(answers: Record<string, unknown>): ValidationResult {
  return runSchema(consultReasonStepSchema, answers)
}

export function validateEdGoalsStep(answers: Record<string, unknown>): ValidationResult {
  return runSchema(edGoalsStepSchema, answers)
}

export function validateEdAssessmentStep(answers: Record<string, unknown>): ValidationResult {
  return runSchema(edAssessmentStepSchema, answers)
}

export function validateEdHealthStep(answers: Record<string, unknown>): ValidationResult {
  return runSchema(edHealthStepSchema, answers)
}

export function validateEdPreferencesStep(answers: Record<string, unknown>): ValidationResult {
  return runSchema(edPreferencesStepSchema, answers)
}

export function validateHairLossAssessmentStep(answers: Record<string, unknown>): ValidationResult {
  return runSchema(hairLossAssessmentStepSchema, answers)
}

export function validateWomensHealthTypeStep(answers: Record<string, unknown>): ValidationResult {
  return runSchema(womensHealthTypeStepSchema, answers)
}

export function validateWomensHealthAssessmentStep(answers: Record<string, unknown>): ValidationResult {
  const errors: Record<string, string> = {}
  const option = answers.womensHealthOption as string | undefined

  if (option === "ocp_new" || option === "ocp_repeat") {
    if (!answers.contraceptionType) errors.contraceptionType = "Please select what you need"
    if (!answers.pregnancyStatus) errors.pregnancyStatus = "Please answer this question"
  } else if (option === "morning_after") {
    if (!answers.hoursSinceIntercourse) errors.hoursSinceIntercourse = "Please indicate the timeframe"
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
