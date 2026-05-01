import { checkEmergencySymptoms } from "@/lib/clinical/triage-rules-engine"
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
  validatePrescriptionMedicalHistoryStep,
  validateSymptomsStep,
  validateWeightLossAssessmentStep,
  validateWeightLossCallStep,
  validateWomensHealthAssessmentStep,
  validateWomensHealthTypeStep,
  type ValidationResult,
} from "@/lib/request/validation"
import { validateMedicareExpiry, validateMedicareNumber } from "@/lib/validation/medicare"
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
  "emergency_free_text",
])

const AUSTRALIAN_STATES = new Set(["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"])
const PRESCRIBING_SEX_VALUES = new Set(["M", "F", "N", "I"])

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []
}

function firstValidationError(...results: ValidationResult[]): string | null {
  const invalidResult = results.find((result) => !result.isValid)
  return invalidResult ? Object.values(invalidResult.errors)[0] : null
}

function firstStringAnswer(
  answers: Record<string, unknown>,
  keys: string[],
): string | undefined {
  for (const key of keys) {
    const value = answers[key]
    if (typeof value === "string" && value.trim()) return value.trim()
  }
  return undefined
}

function firstScalarAnswer(
  answers: Record<string, unknown>,
  keys: string[],
): string | undefined {
  for (const key of keys) {
    const value = answers[key]
    if (typeof value === "number" && Number.isFinite(value)) return String(value)
    if (typeof value === "string" && value.trim()) return value.trim()
  }
  return undefined
}

function copyStringAnswer(
  target: Record<string, unknown>,
  targetKey: string,
  answers: Record<string, unknown>,
  sourceKeys: string[],
): void {
  const value = firstStringAnswer(answers, sourceKeys)
  if (value) target[targetKey] = value
}

function copyScalarAnswer(
  target: Record<string, unknown>,
  targetKey: string,
  answers: Record<string, unknown>,
  sourceKeys: string[],
): void {
  const value = firstScalarAnswer(answers, sourceKeys)
  if (value) target[targetKey] = value
}

function emergencySymptomIdForKeyword(keyword: string): string {
  const normalized = keyword.toLowerCase()

  if (normalized.includes("chest") || normalized.includes("heart attack")) {
    return "chest_pain"
  }
  if (
    normalized.includes("breath") ||
    normalized.includes("asthma") ||
    normalized.includes("gasping") ||
    normalized.includes("choking") ||
    normalized.includes("drowning")
  ) {
    return "difficulty_breathing"
  }
  if (
    normalized.includes("stroke") ||
    normalized.includes("facial") ||
    normalized.includes("slurred") ||
    normalized.includes("sudden weakness") ||
    normalized.includes("sudden numbness") ||
    normalized.includes("sudden confusion") ||
    normalized.includes("vision loss")
  ) {
    return "sudden_weakness"
  }
  if (normalized.includes("headache")) {
    return "severe_headache"
  }
  if (
    normalized.includes("suicid") ||
    normalized.includes("want to die") ||
    normalized.includes("end my life") ||
    normalized.includes("kill myself") ||
    normalized.includes("self harm") ||
    normalized.includes("self-harm") ||
    normalized.includes("cutting myself") ||
    normalized.includes("hurting myself") ||
    normalized.includes("overdose")
  ) {
    return "suicidal_thoughts"
  }

  return "emergency_free_text"
}

function deriveEmergencySymptomsFromText(answers: Record<string, unknown>): string[] {
  const text = [
    answers.symptomDetails,
    answers.symptom_details,
    answers.symptoms_description,
    answers.consultDetails,
    answers.consult_details,
  ]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join(" ")

  if (!text) return []

  const result = checkEmergencySymptoms(text)
  if (!result.isEmergency) return []

  return Array.from(new Set(result.matchedKeywords.map(emergencySymptomIdForKeyword)))
}

function normalizeMedicareExpiry(value: string | undefined): string | null {
  const trimmed = value?.trim()
  if (!trimmed) return null

  const isoMonth = trimmed.match(/^(\d{4})-(\d{2})(?:-\d{2})?$/)
  if (isoMonth) {
    const month = Number.parseInt(isoMonth[2], 10)
    return month >= 1 && month <= 12 ? `${isoMonth[1]}-${isoMonth[2]}-01` : null
  }

  const short = trimmed.match(/^(\d{1,2})\/(\d{2}|\d{4})$/)
  if (short) {
    const month = Number.parseInt(short[1], 10)
    const rawYear = short[2]
    const year = rawYear.length === 2 ? `20${rawYear}` : rawYear
    return month >= 1 && month <= 12 ? `${year}-${String(month).padStart(2, "0")}-01` : null
  }

  return null
}

function validatePrescriptionIdentityAnswers(answers: Record<string, unknown>): string | null {
  const medicare = firstStringAnswer(answers, ["medicare_number", "medicareNumber"])
  const medicareIrn = firstScalarAnswer(answers, ["medicare_irn", "medicareIrn"])
  const rawMedicareExpiry = firstScalarAnswer(answers, ["medicare_expiry", "medicareExpiry"])
  const medicareExpiry = normalizeMedicareExpiry(rawMedicareExpiry)
  const addressLine1 = firstStringAnswer(answers, ["address_line1", "addressLine1", "address_line_1", "street_address"])
  const suburb = firstStringAnswer(answers, ["suburb"])
  const state = firstStringAnswer(answers, ["state"])
  const postcode = firstStringAnswer(answers, ["postcode"])
  const sex = firstStringAnswer(answers, ["sex", "gender"])

  if (!medicare) return "Medicare number is required for prescription requests."
  const medicareResult = validateMedicareNumber(medicare)
  if (!medicareResult.valid) {
    return medicareResult.error || "Invalid Medicare number."
  }
  if (!medicareIrn || !/^[1-9]$/.test(medicareIrn)) {
    return "Medicare IRN is required for prescription requests."
  }
  if (rawMedicareExpiry) {
    if (!medicareExpiry) {
      return "Medicare card expiry is invalid."
    }
    const expiryResult = validateMedicareExpiry(medicareExpiry)
    if (!expiryResult.valid) {
      return expiryResult.error || "Medicare card expiry is invalid."
    }
  }
  if (!addressLine1) return "Street address is required for prescription requests."
  if (!suburb || !state || !postcode) {
    return "Address suburb, state, and postcode are required for prescription requests."
  }
  if (!AUSTRALIAN_STATES.has(state.toUpperCase())) {
    return "A valid Australian state is required for prescription requests."
  }
  if (!/^\d{4}$/.test(postcode)) {
    return "A valid 4-digit postcode is required for prescription requests."
  }
  if (!sex || !PRESCRIBING_SEX_VALUES.has(sex.toUpperCase())) {
    return "Sex is required for prescription requests."
  }

  return null
}

export function transformAnswersForUnifiedCheckout(
  serviceType: UnifiedServiceType,
  answers: Record<string, unknown>
): Record<string, unknown> {
  const transformed: Record<string, unknown> = { ...answers }

  if (serviceType === "med-cert") {
    transformed.certificate_type = answers.certType
    transformed.duration = answers.duration
    transformed.start_date = answers.startDate
    transformed.symptoms = answers.symptoms
    transformed.symptom_details = answers.symptomDetails
    transformed.symptom_duration = answers.symptomDuration
    transformed.employer_name = answers.employerName
  }

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
    transformed.current_dose = answers.currentDose || answers.current_dose
    transformed.dosage_instructions = answers.currentDose || answers.dosageInstructions || answers.dosage_instructions
    transformed.side_effects = answers.sideEffects
    transformed.prescribed_before = answers.prescribedBefore ?? true
    transformed.dose_changed = answers.doseChanged ?? false
  }

  if (serviceType === "consult") {
    transformed.consult_category = answers.consultCategory
    transformed.consult_subtype = answers.consultSubtype
    transformed.consult_details = answers.consultDetails
    transformed.consult_urgency = answers.consultUrgency
    transformed.general_associated_symptoms = answers.general_associated_symptoms
  }

  transformed.has_allergies = answers.hasAllergies
  transformed.allergies = answers.allergies
  transformed.has_conditions = answers.hasConditions
  transformed.conditions = answers.conditions
  transformed.has_other_medications = answers.hasOtherMedications
  transformed.other_medications = answers.otherMedications
  transformed.is_pregnant_or_breastfeeding = answers.isPregnantOrBreastfeeding
  transformed.has_adverse_medication_reactions = answers.hasAdverseMedicationReactions

  transformed.telehealth_consent_given = answers.telehealthConsentGiven
  transformed.accuracy_confirmed = answers.confirmedAccuracy
  transformed.terms_agreed = answers.agreedToTerms

  transformed.is_priority = answers.isPriority === true
  transformed.subscribe_and_save = answers.subscribeAndSave === true

  copyStringAnswer(transformed, "medicare_number", answers, ["medicare_number", "medicareNumber"])
  copyScalarAnswer(transformed, "medicare_irn", answers, ["medicare_irn", "medicareIrn"])
  copyStringAnswer(transformed, "medicare_expiry", answers, ["medicare_expiry", "medicareExpiry"])
  copyStringAnswer(transformed, "address_line1", answers, ["address_line1", "addressLine1", "address_line_1", "street_address"])
  copyStringAnswer(transformed, "address_line2", answers, ["address_line2", "addressLine2", "address_line_2"])
  copyStringAnswer(transformed, "suburb", answers, ["suburb"])
  copyStringAnswer(transformed, "state", answers, ["state"])
  copyStringAnswer(transformed, "postcode", answers, ["postcode"])
  copyStringAnswer(transformed, "sex", answers, ["sex", "gender"])

  const explicitEmergencySymptoms = asStringArray(answers.emergency_symptoms)
  const associatedEmergencySymptoms = asStringArray(answers.general_associated_symptoms)
    .filter((symptom) => EMERGENCY_ASSOCIATED_SYMPTOMS.has(symptom))
  const textDerivedEmergencySymptoms = deriveEmergencySymptomsFromText(transformed)
  transformed.emergency_symptoms = Array.from(new Set([
    ...explicitEmergencySymptoms,
    ...associatedEmergencySymptoms,
    ...textDerivedEmergencySymptoms,
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
    const prescriptionIdentityError = validatePrescriptionIdentityAnswers(answers)
    if (prescriptionIdentityError) return prescriptionIdentityError

    return firstValidationError(
      validateMedicationStep(answers),
      validateMedicationHistoryStep(answers),
      validatePrescriptionMedicalHistoryStep(answers),
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
