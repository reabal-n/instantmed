/**
 * Ground-Truth Validation for AI Outputs
 * 
 * Validates AI-generated content against source intake data
 * to prevent hallucinations and ensure accuracy.
 */

import type { MedCertDraftOutput } from "../schemas/med-cert-draft"
import type { ClinicalNoteOutput } from "../schemas/clinical-note"

// Forbidden diagnosis terms - AI must not invent specific diagnoses
const FORBIDDEN_DIAGNOSIS_TERMS = [
  "covid",
  "covid-19",
  "coronavirus",
  "influenza",
  "flu",
  "pneumonia",
  "bronchitis",
  "strep",
  "streptococcal",
  "meningitis",
  "appendicitis",
  "diabetes",
  "cancer",
  "tumor",
  "tumour",
  "heart attack",
  "myocardial infarction",
  "stroke",
  "aneurysm",
  "sepsis",
  "septicemia",
  "tuberculosis",
  "hiv",
  "aids",
  "hepatitis",
  "cirrhosis",
  "kidney failure",
  "renal failure",
  "heart failure",
  "cardiac arrest",
  "pulmonary embolism",
  "deep vein thrombosis",
  "dvt",
  "pe",
]

// Forbidden medication terms - AI must not suggest medications
const FORBIDDEN_MEDICATION_TERMS = [
  "prescribe",
  "prescription",
  "medication",
  "paracetamol",
  "ibuprofen",
  "aspirin",
  "antibiotic",
  "penicillin",
  "amoxicillin",
  "azithromycin",
  "prednisone",
  "prednisolone",
  "oxycodone",
  "codeine",
  "morphine",
  "tramadol",
  "diazepam",
  "valium",
  "xanax",
  "alprazolam",
]

export interface GroundTruthValidationResult {
  valid: boolean
  errors: GroundTruthError[]
}

export interface GroundTruthError {
  code: string
  message: string
  field?: string
  expected?: unknown
  actual?: unknown
}

interface IntakeAnswers {
  startDate?: string
  endDate?: string
  durationDays?: number
  symptoms?: string[]
  certificateType?: string
  [key: string]: unknown
}

/**
 * Validate med cert draft against intake answers
 */
export function validateMedCertAgainstIntake(
  aiOutput: MedCertDraftOutput,
  intakeAnswers: IntakeAnswers
): GroundTruthValidationResult {
  const errors: GroundTruthError[] = []

  // 1. Validate dates match intake
  if (intakeAnswers.startDate && aiOutput.startDate !== intakeAnswers.startDate) {
    errors.push({
      code: "DATE_MISMATCH_START",
      message: "AI output start date does not match intake",
      field: "startDate",
      expected: intakeAnswers.startDate,
      actual: aiOutput.startDate,
    })
  }

  if (intakeAnswers.endDate && aiOutput.endDate !== intakeAnswers.endDate) {
    errors.push({
      code: "DATE_MISMATCH_END",
      message: "AI output end date does not match intake",
      field: "endDate",
      expected: intakeAnswers.endDate,
      actual: aiOutput.endDate,
    })
  }

  // 2. Validate duration matches
  if (intakeAnswers.durationDays && aiOutput.durationDays !== intakeAnswers.durationDays) {
    errors.push({
      code: "DURATION_MISMATCH",
      message: "AI output duration does not match intake",
      field: "durationDays",
      expected: intakeAnswers.durationDays,
      actual: aiOutput.durationDays,
    })
  }

  // 3. Check for forbidden diagnosis terms
  const allText = [
    aiOutput.certificateStatement,
    aiOutput.symptomsSummary,
    aiOutput.clinicalNotes,
  ].join(" ").toLowerCase()

  for (const term of FORBIDDEN_DIAGNOSIS_TERMS) {
    if (allText.includes(term.toLowerCase())) {
      errors.push({
        code: "FORBIDDEN_DIAGNOSIS",
        message: `AI output contains forbidden diagnosis term: "${term}"`,
        field: "certificateStatement",
        actual: term,
      })
    }
  }

  // 4. Check for forbidden medication terms
  for (const term of FORBIDDEN_MEDICATION_TERMS) {
    if (allText.includes(term.toLowerCase())) {
      errors.push({
        code: "FORBIDDEN_MEDICATION",
        message: `AI output contains forbidden medication term: "${term}"`,
        field: "certificateStatement",
        actual: term,
      })
    }
  }

  // 5. Validate certificate type matches
  if (intakeAnswers.certificateType) {
    const normalizedIntakeType = normalizeCertType(intakeAnswers.certificateType)
    if (normalizedIntakeType && aiOutput.certificateType !== normalizedIntakeType) {
      errors.push({
        code: "CERT_TYPE_MISMATCH",
        message: "AI output certificate type does not match intake",
        field: "certificateType",
        expected: normalizedIntakeType,
        actual: aiOutput.certificateType,
      })
    }
  }

  // 6. Check duration > 3 days requires review flag
  if (aiOutput.durationDays > 3 && !aiOutput.flags?.requiresReview) {
    errors.push({
      code: "EXTENDED_DURATION_NOT_FLAGGED",
      message: "Certificates > 3 days must be flagged for review",
      field: "flags.requiresReview",
      expected: true,
      actual: false,
    })
  }

  // 7. Check backdating (if start date is in the past > 3 days)
  if (aiOutput.startDate) {
    const startDate = new Date(aiOutput.startDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const daysDiff = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysDiff > 3 && !aiOutput.flags?.requiresReview) {
      errors.push({
        code: "BACKDATED_NOT_FLAGGED",
        message: "Backdated certificates > 3 days must be flagged for review",
        field: "flags.requiresReview",
        expected: true,
        actual: false,
      })
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Validate clinical note against intake answers
 */
export function validateClinicalNoteAgainstIntake(
  aiOutput: ClinicalNoteOutput,
  intakeAnswers: IntakeAnswers
): GroundTruthValidationResult {
  const errors: GroundTruthError[] = []

  // 1. Check for forbidden diagnosis terms
  const allText = [
    aiOutput.presentingComplaint,
    aiOutput.historyOfPresentIllness,
    aiOutput.relevantInformation,
    aiOutput.certificateDetails,
  ].join(" ").toLowerCase()

  for (const term of FORBIDDEN_DIAGNOSIS_TERMS) {
    if (allText.includes(term.toLowerCase())) {
      errors.push({
        code: "FORBIDDEN_DIAGNOSIS",
        message: `AI output contains forbidden diagnosis term: "${term}"`,
        field: "presentingComplaint",
        actual: term,
      })
    }
  }

  // 2. Check for forbidden medication terms
  for (const term of FORBIDDEN_MEDICATION_TERMS) {
    if (allText.includes(term.toLowerCase())) {
      errors.push({
        code: "FORBIDDEN_MEDICATION",
        message: `AI output contains forbidden medication term: "${term}"`,
        field: "presentingComplaint",
        actual: term,
      })
    }
  }

  // 3. Validate that presenting complaint references intake symptoms
  if (intakeAnswers.symptoms && intakeAnswers.symptoms.length > 0) {
    const hasSymptomReference = intakeAnswers.symptoms.some(symptom =>
      aiOutput.presentingComplaint.toLowerCase().includes(symptom.toLowerCase()) ||
      aiOutput.historyOfPresentIllness.toLowerCase().includes(symptom.toLowerCase())
    )

    if (!hasSymptomReference) {
      // This is a warning, not a hard fail
      errors.push({
        code: "SYMPTOMS_NOT_REFERENCED",
        message: "AI output does not reference any intake symptoms",
        field: "presentingComplaint",
        expected: intakeAnswers.symptoms,
      })
    }
  }

  return {
    valid: errors.filter(e => !e.code.includes("NOT_REFERENCED")).length === 0,
    errors,
  }
}

/**
 * Normalize certificate type strings
 */
function normalizeCertType(type: string): "work" | "study" | "carer" | null {
  const lower = type.toLowerCase()
  if (lower.includes("work") || lower === "employment") return "work"
  if (lower.includes("study") || lower.includes("uni") || lower.includes("school") || lower.includes("education")) return "study"
  if (lower.includes("carer") || lower.includes("caring")) return "carer"
  return null
}

/**
 * Exported constants for testing
 */
export { FORBIDDEN_DIAGNOSIS_TERMS, FORBIDDEN_MEDICATION_TERMS }
