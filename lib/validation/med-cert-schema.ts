/**
 * Server-side validation schema for medical certificate requests
 * Single source of truth for med cert answers validation
 */

export interface MedCertValidationResult {
  valid: boolean
  error?: string
}

// Valid certificate types
const VALID_CERT_TYPES = ["work", "study", "carer", "sick_leave", "uni"] as const

// Valid duration values
const VALID_DURATIONS = ["1", "2", "1 day", "2 days"] as const

// Valid symptom duration values
const VALID_SYMPTOM_DURATIONS = [
  "less_than_24h",
  "1_2_days",
  "3_5_days",
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
      error: "Please select a duration (1 or 2 days).",
    }
  }

  // Validate duration is a known value
  if (!VALID_DURATIONS.includes(duration as typeof VALID_DURATIONS[number])) {
    return {
      valid: false,
      error: "Invalid duration. Please select 1 or 2 days.",
    }
  }

  // Symptoms are required
  const symptoms = answers.symptoms
  if (!symptoms || !Array.isArray(symptoms) || symptoms.length === 0) {
    return {
      valid: false,
      error: "Please select at least one symptom.",
    }
  }

  // Symptom details are required with minimum length
  const symptomDetails = answers.symptoms_description || answers.symptom_details || answers.symptomDetails
  if (!symptomDetails || typeof symptomDetails !== "string" || symptomDetails.trim().length < 20) {
    return {
      valid: false,
      error: "Please describe your symptoms in at least 20 characters.",
    }
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

  // Validate start date format and check for excessive backdating
  try {
    const date = new Date(startDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return {
        valid: false,
        error: "Invalid start date format.",
      }
    }

    // Backdating more than 7 days is not allowed
    const daysDiff = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
    if (daysDiff > 7) {
      return {
        valid: false,
        error: "Certificates cannot be backdated more than 7 days. Please see your GP for earlier dates.",
      }
    }
  } catch {
    return {
      valid: false,
      error: "Invalid start date.",
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
