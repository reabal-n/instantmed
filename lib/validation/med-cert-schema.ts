/**
 * Server-side validation schema for medical certificate requests
 * Single source of truth for med cert answers validation
 */

import { validateSymptomTextQuality } from "@/lib/clinical/symptom-text-quality"
import { validateCertificateStartDate } from "@/lib/medical-certificates/date-policy"

export interface MedCertValidationResult {
  valid: boolean
  error?: string
}

// Valid certificate types
const VALID_CERT_TYPES = ["work", "study", "carer", "sick_leave", "uni"] as const

// Valid duration values
const VALID_DURATIONS = ["1", "2", "3", "1 day", "2 days", "3 days"] as const

// Valid symptom duration values
const VALID_SYMPTOM_DURATIONS = [
  "today",
  "1_2_days",
  "3_5_days",
  "week_plus",
  // Legacy values (for existing submissions)
  "1_day",
  "2_days",
  "3_days",
  "less_than_24h",
  "1_week_plus",
] as const

/**
 * Validate medical certificate request payload
 * Returns validation result with error message if invalid
 */
export function validateMedCertPayload(
  answers: Record<string, unknown>
): MedCertValidationResult {
  // Certificate type is required
  const certType = answers.certificate_type || answers.certType
  if (!certType || typeof certType !== "string") {
    return {
      valid: false,
      error: "Please select a certificate type (work, study, or carer's leave).",
    }
  }

  // Validate certificate type is a known value
  if (!VALID_CERT_TYPES.includes(certType as typeof VALID_CERT_TYPES[number])) {
    return {
      valid: false,
      error: "Invalid certificate type. Please select work, study, or carer's leave.",
    }
  }

  // Duration is required
  const duration = answers.duration
  if (!duration || typeof duration !== "string") {
    return {
      valid: false,
      error: "Please select a duration (1, 2, or 3 days).",
    }
  }

  // Validate duration is a known value
  if (!VALID_DURATIONS.includes(duration as typeof VALID_DURATIONS[number])) {
    return {
      valid: false,
      error: "Invalid duration. Please select 1, 2, or 3 days.",
    }
  }

  // Symptom details are the clinically meaningful field. The med cert
  // symptoms step (`components/request/steps/symptoms-step.tsx`) is a
  // free-text description + duration only — it does not collect a
  // discrete `symptoms` array. The legacy `answers.symptoms` array
  // requirement here was dead code from a retired multi-select UI; it
  // blocked every med cert checkout with "Please select at least one
  // symptom." because no writer ever set the field. Validate the
  // textarea content (with aliases for older payloads) instead.
  const symptomDetails =
    answers.symptoms_description ||
    answers.symptom_details ||
    answers.symptomDetails ||
    answers.symptomsDescription
  if (!symptomDetails || typeof symptomDetails !== "string") {
    return {
      valid: false,
      error: "Please describe your symptoms.",
    }
  }
  // Same non-empty + anti-gibberish gate as the intake step — no length or
  // word-count minimum. Accepts brief real input ("migraine") while still
  // rejecting empty + keyboard-mash (and closes the old length-only gap that
  // let long gibberish through).
  const symptomQuality = validateSymptomTextQuality(symptomDetails)
  if (!symptomQuality.valid) {
    return { valid: false, error: symptomQuality.reason ?? "Please describe your symptoms." }
  }

  // Symptom duration is required for clinical defensibility
  const symptomDuration = answers.symptom_duration || answers.symptomDuration
  if (!symptomDuration || typeof symptomDuration !== "string") {
    return {
      valid: false,
      error: "Please indicate how long you've had these symptoms.",
    }
  }

  // Validate symptom duration is a known value
  if (!VALID_SYMPTOM_DURATIONS.includes(symptomDuration as typeof VALID_SYMPTOM_DURATIONS[number])) {
    return {
      valid: false,
      error: "Invalid symptom duration. Please select a valid option.",
    }
  }

  // Start date is required and must not be backdated more than allowed
  const startDate = answers.start_date || answers.startDate
  if (!startDate || typeof startDate !== "string") {
    return {
      valid: false,
      error: "Please select a start date for your certificate.",
    }
  }

  const startDateValidation = validateCertificateStartDate(startDate)
  if (!startDateValidation.valid) {
    return {
      valid: false,
      error: startDateValidation.error || "Invalid start date.",
    }
  }

  // Consent fields must be true
  const telehealthConsent = answers.telehealth_consent_given || answers.telehealthConsentGiven
  if (telehealthConsent !== true) {
    return {
      valid: false,
      error: "Please consent to the telehealth consultation.",
    }
  }

  const accuracyConfirmed = answers.accuracy_confirmed || answers.confirmedAccuracy
  if (accuracyConfirmed !== true) {
    return {
      valid: false,
      error: "Please confirm your information is accurate.",
    }
  }

  const termsAgreed = answers.terms_agreed || answers.agreedToTerms
  if (termsAgreed !== true) {
    return {
      valid: false,
      error: "Please agree to the terms and conditions.",
    }
  }

  return { valid: true }
}
