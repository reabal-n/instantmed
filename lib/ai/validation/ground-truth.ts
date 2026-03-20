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
  "hepatitis",
  "cirrhosis",
  "kidney failure",
  "renal failure",
  "heart failure",
  "cardiac arrest",
  "pulmonary embolism",
  "deep vein thrombosis",
]

// Short abbreviations that need word-boundary matching to avoid false positives
// (e.g. "pe" matching "experience", "flu" matching "influence")
const FORBIDDEN_DIAGNOSIS_ABBREVIATIONS = [
  "dvt",
  "pe",
  "hiv",
  "aids",
  "flu",
]

// Forbidden medication terms - AI must not recommend specific medications.
// Excludes "prescription" and "medication" - those appear in legitimate clinical
// documentation (e.g. "repeat prescription", "no current medications").
const FORBIDDEN_MEDICATION_TERMS = [
  "prescribe",
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
  start_date?: string
  endDate?: string
  end_date?: string
  durationDays?: number
  duration_requested?: number
  duration_days?: number
  symptoms?: string[]
  symptom_list?: string[]
  certificateType?: string
  certificate_type?: string
  [key: string]: unknown
}

/** Normalize intake answers to canonical keys (supports both camelCase and snake_case) */
function normalizeIntakeAnswers(a: IntakeAnswers): {
  startDate?: string
  endDate?: string
  durationDays?: number
  certificateType?: string
} {
  const start = a.startDate ?? a.start_date
  const end = a.endDate ?? a.end_date
  const dur = a.durationDays ?? a.duration_requested ?? a.duration_days
  const certType = a.certificateType ?? a.certificate_type
  const durationDays =
    typeof dur === "number" ? dur : typeof dur === "string" ? parseInt(dur, 10) : undefined
  return {
    startDate: typeof start === "string" ? start : undefined,
    endDate: typeof end === "string" ? end : undefined,
    durationDays: Number.isFinite(durationDays) ? durationDays! : undefined,
    certificateType: typeof certType === "string" ? certType : undefined,
  }
}

/**
 * Validate med cert draft against intake answers
 */
export function validateMedCertAgainstIntake(
  aiOutput: MedCertDraftOutput,
  intakeAnswers: IntakeAnswers
): GroundTruthValidationResult {
  const errors: GroundTruthError[] = []
  const n = normalizeIntakeAnswers(intakeAnswers)

  // 1. Validate dates match intake
  if (n.startDate && aiOutput.startDate !== n.startDate) {
    errors.push({
      code: "DATE_MISMATCH_START",
      message: "AI output start date does not match intake",
      field: "startDate",
      expected: n.startDate,
      actual: aiOutput.startDate,
    })
  }

  if (n.endDate && aiOutput.endDate !== n.endDate) {
    errors.push({
      code: "DATE_MISMATCH_END",
      message: "AI output end date does not match intake",
      field: "endDate",
      expected: n.endDate,
      actual: aiOutput.endDate,
    })
  }

  // 2. Validate duration matches
  if (n.durationDays != null && aiOutput.durationDays !== n.durationDays) {
    errors.push({
      code: "DURATION_MISMATCH",
      message: "AI output duration does not match intake",
      field: "durationDays",
      expected: n.durationDays,
      actual: aiOutput.durationDays,
    })
  }

  // 3. Check for forbidden diagnosis terms
  const allMedCertText = [
    aiOutput.certificateStatement,
    aiOutput.symptomsSummary,
    aiOutput.clinicalNotes,
  ].join(" ")

  const diagnosisMatch = containsForbiddenDiagnosisTerm(allMedCertText)
  if (diagnosisMatch) {
    errors.push({
      code: "FORBIDDEN_DIAGNOSIS",
      message: `AI output contains forbidden diagnosis term: "${diagnosisMatch.term}"`,
      field: "certificateStatement",
      actual: diagnosisMatch.term,
    })
  }

  // 4. Check for forbidden medication terms
  const allMedCertTextLower = allMedCertText.toLowerCase()
  for (const term of FORBIDDEN_MEDICATION_TERMS) {
    if (allMedCertTextLower.includes(term.toLowerCase())) {
      errors.push({
        code: "FORBIDDEN_MEDICATION",
        message: `AI output contains forbidden medication term: "${term}"`,
        field: "certificateStatement",
        actual: term,
      })
    }
  }

  // 5. Validate certificate type matches
  if (n.certificateType) {
    const normalizedIntakeType = normalizeCertType(n.certificateType)
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
  ].join(" ")

  const diagnosisMatch = containsForbiddenDiagnosisTerm(allText)
  if (diagnosisMatch) {
    errors.push({
      code: "FORBIDDEN_DIAGNOSIS",
      message: `AI output contains forbidden diagnosis term: "${diagnosisMatch.term}"`,
      field: "presentingComplaint",
      actual: diagnosisMatch.term,
    })
  }

  const allTextLower = allText.toLowerCase()

  // 2. Check for forbidden medication terms
  for (const term of FORBIDDEN_MEDICATION_TERMS) {
    if (allTextLower.includes(term.toLowerCase())) {
      errors.push({
        code: "FORBIDDEN_MEDICATION",
        message: `AI output contains forbidden medication term: "${term}"`,
        field: "presentingComplaint",
        actual: term,
      })
    }
  }

  // 3. Validate that presenting complaint references intake symptoms
  const symptoms = intakeAnswers.symptoms ?? intakeAnswers.symptom_list
  if (symptoms && Array.isArray(symptoms) && symptoms.length > 0) {
    const hasSymptomReference = symptoms.some((symptom: string) =>
      aiOutput.presentingComplaint.toLowerCase().includes(symptom.toLowerCase()) ||
      aiOutput.historyOfPresentIllness.toLowerCase().includes(symptom.toLowerCase())
    )

    if (!hasSymptomReference) {
      // This is a warning, not a hard fail
      errors.push({
        code: "SYMPTOMS_NOT_REFERENCED",
        message: "AI output does not reference any intake symptoms",
        field: "presentingComplaint",
        expected: symptoms,
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
/**
 * Check if text contains a forbidden term.
 * Uses word-boundary regex for short abbreviations to avoid false positives.
 */
function containsForbiddenDiagnosisTerm(text: string): { found: boolean; term: string } | null {
  const lower = text.toLowerCase()

  // Exact substring match for full terms (safe — multi-word or long enough)
  for (const term of FORBIDDEN_DIAGNOSIS_TERMS) {
    if (lower.includes(term.toLowerCase())) {
      return { found: true, term }
    }
  }

  // Word-boundary match for short abbreviations
  for (const abbr of FORBIDDEN_DIAGNOSIS_ABBREVIATIONS) {
    const regex = new RegExp(`\\b${abbr}\\b`, "i")
    if (regex.test(text)) {
      return { found: true, term: abbr }
    }
  }

  return null
}

export { FORBIDDEN_DIAGNOSIS_TERMS, FORBIDDEN_MEDICATION_TERMS }
