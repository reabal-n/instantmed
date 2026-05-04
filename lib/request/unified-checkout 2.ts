import {
  validateCertificateStep,
  validateConsultReasonStep,
  validateDetailsStep,
  validateEdAssessmentStep,
  validateEdGoalsStep,
  validateEdHealthStep,
  validateEdPreferencesStep,
  validateHairLossAssessmentStep,
  validateHairLossGoalsStep,
  validateHairLossHealthStep,
  validateHairLossPreferencesStep,
  validateMedicalHistoryStep,
  validateMedicationHistoryStep,
  validateMedicationStep,
  validateSymptomsStep,
  validateWeightLossAssessmentStep,
  validateWeightLossCallStep,
  validateWomensHealthAssessmentStep,
  validateWomensHealthTypeStep,
  type ValidationResult,
} from "@/lib/request/validation"
import type { UnifiedServiceType } from "@/types/services"

export interface UnifiedCheckoutIdentity {
  email?: string
  fullName?: string
  dateOfBirth?: string
  phone?: string
}

const EMERGENCY_ASSOCIATED_SYMPTOMS = new Set([
  "chest_pain",
  "difficulty_breathing",
  "sudden_weakness",
  "severe_headache",
  "suicidal_thoughts",
])

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []
}

function firstValidationError(...results: ValidationResult[]): string | null {
  const invalidResult = results.find((result) => !result.isValid)
  return invalidResult ? Object.values(invalidResult.errors)[0] : null
}

export function transformAnswersForUnifiedCheckout(
  serviceType: UnifiedServiceType,
  answers: Record<string, unknown>
): Record<string, unknown> {
  const transformed: Record<string, unknown> = { ...answers }

  // Map med-cert specific fields
  if (serviceType === "med-cert") {
    transformed.certificate_type = answers.certType
    transformed.duration = answers.duration
    transformed.start_date = answers.startDate
    transformed.symptoms = answers.symptoms
    transformed.symptom_details = answers.symptomDetails
    transformed.symptom_duration = answers.symptomDuration
    transformed.employer_name = answers.employerName
  }

  // Map prescription specific fields
  if (serviceType === "prescription" || serviceType === "repeat-script") {
    transformed.medication_name = answers.medicationName
    transformed.medication_display = answers.medicationName
    transformed.medication_strength = answers.medicationStrength
    transformed.medication_form = answers.medicationForm
    transformed.pbs_code = answers.pbsCode
    transformed.amt_code = answers.pbsCode
    transformed.last_prescribed = answers.prescriptionHistory
    transformed.prescription_history = answers.prescriptionHistory
    transformed.last_prescription_date = answers.lastPrescriptionDate
    transformed.side_effects = answers.sideEffects
    transformed.prescribed_before = answers.prescribedBefore ?? true
    transformed.dose_changed = answers.doseChanged ?? false
  }

  // Map consult specific fields
  if (serviceType === "consult") {
    transformed.consult_category = answers.consultCategory
    transformed.consult_subtype = answers.consultSubtype
    transformed.consult_details = answers.consultDetails
    transformed.consult_urgency = answers.consultUrgency
    transformed.general_associated_symptoms = answers.general_associated_symptoms
  }

  // Map shared medical history fields
  transformed.has_allergies = answers.hasAllergies
  transformed.allergies = answers.allergies
  transformed.has_conditions = answers.hasConditions
  transformed.conditions = answers.conditions
  transformed.other_medications = answers.otherMedications

  // Map consent fields for server-side validation
  transformed.telehealth_consent_given = answers.telehealthConsentGiven
  transformed.accuracy_confirmed = answers.confirmedAccuracy
  transformed.terms_agreed = answers.agreedToTerms

  transformed.is_priority = answers.isPriority === true
  transformed.subscribe_and_save = answers.subscribeAndSave === true

  const explicitEmergencySymptoms = asStringArray(answers.emergency_symptoms)
  const associatedEmergencySymptoms = asStringArray(answers.general_associated_symptoms)
    .filter((symptom) => EMERGENCY_ASSOCIATED_SYMPTOMS.has(symptom))
  transformed.emergency_symptoms = Array.from(new Set([
    ...explicitEmergencySymptoms,
    ...associatedEmergencySymptoms,
  ]))
  transformed.symptom_severity = answers.symptom_severity ?? "mild"

  return transformed
}

export function validateAnswersServerSide(
  serviceType: UnifiedServiceType,
  answers: Record<string, unknown>,
  identity: UnifiedCheckoutIdentity
): string | null {
  const detailsResult = validateDetailsStep({
    firstName: identity.fullName?.split(" ")[0],
    lastName: identity.fullName?.split(" ").slice(1).join(" ") || undefined,
    email: identity.email,
    dob: identity.dateOfBirth,
    phone: identity.phone,
  }, {
    requirePhone: serviceType === "prescription" || serviceType === "repeat-script" || serviceType === "consult",
  })
  if (!detailsResult.isValid) {
    return Object.values(detailsResult.errors)[0]
  }

  if (serviceType === "med-cert") {
    return firstValidationError(
      validateCertificateStep(answers),
      validateSymptomsStep(answers),
      validateMedicalHistoryStep(answers),
    )
  }

  if (serviceType === "prescription" || serviceType === "repeat-script") {
    return firstValidationError(
      validateMedicationStep(answers),
      validateMedicationHistoryStep(answers),
      validateMedicalHistoryStep(answers),
    )
  }

  if (serviceType === "consult") {
    const consultSubtype = String(answers.consultSubtype || "general")

    if (consultSubtype === "ed") {
      return firstValidationError(
        validateEdGoalsStep(answers),
        validateEdAssessmentStep(answers),
        validateEdHealthStep(answers),
        validateEdPreferencesStep(answers),
        validateMedicalHistoryStep(answers),
      )
    }

    if (consultSubtype === "hair_loss") {
      return firstValidationError(
        validateHairLossGoalsStep(answers),
        validateHairLossAssessmentStep(answers),
        validateHairLossHealthStep(answers),
        validateHairLossPreferencesStep(answers),
        validateMedicalHistoryStep(answers),
      )
    }

    if (consultSubtype === "womens_health") {
      return firstValidationError(
        validateWomensHealthTypeStep(answers),
        validateWomensHealthAssessmentStep(answers),
        validateMedicalHistoryStep(answers),
      )
    }

    if (consultSubtype === "weight_loss") {
      return firstValidationError(
        validateWeightLossAssessmentStep(answers),
        validateWeightLossCallStep(answers),
        validateMedicalHistoryStep(answers),
      )
    }

    return firstValidationError(
      validateConsultReasonStep(answers),
      validateMedicalHistoryStep(answers),
    )
  }

  return null
}

export function resolveCheckoutSubtype(
  serviceType: UnifiedServiceType,
  answers: Record<string, unknown>,
  baseSubtype: string,
): string {
  if (serviceType === "med-cert" && answers.certType) {
    return String(answers.certType)
  }

  if (serviceType === "consult" && answers.consultSubtype) {
    return String(answers.consultSubtype)
  }

  if (serviceType === "consult" && answers.consultCategory) {
    return String(answers.consultCategory)
  }

  return baseSubtype
}
