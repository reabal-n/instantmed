/**
 * Request Flow Validation Utilities
 * 
 * Provides real-time field validation for all step components.
 * Each validator returns an error message or null if valid.
 */

export interface ValidationResult {
  isValid: boolean
  errors: Record<string, string>
}

// Email validation
export function validateEmail(email: string | undefined): string | null {
  if (!email?.trim()) return "Email is required"
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Please enter a valid email"
  return null
}

// Phone validation (Australian format)
export function validatePhone(phone: string | undefined, required = false): string | null {
  if (!phone?.trim()) {
    return required ? "Phone number is required" : null
  }
  // Remove spaces and dashes for validation
  const cleaned = phone.replace(/[\s-]/g, '')
  if (!/^(\+?61|0)[2-9]\d{8}$/.test(cleaned) && !/^04\d{8}$/.test(cleaned)) {
    return "Please enter a valid Australian phone number"
  }
  return null
}

// Date of birth validation
export function validateDOB(dob: string | undefined): string | null {
  if (!dob) return "Date of birth is required"
  
  const birthDate = new Date(dob)
  if (isNaN(birthDate.getTime())) return "Please enter a valid date"
  
  const age = (Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
  if (age < 18) return "You must be 18 or older"
  if (age > 120) return "Please enter a valid date of birth"
  
  return null
}

// Name validation
export function validateName(name: string | undefined, fieldName = "Name"): string | null {
  if (!name?.trim()) return `${fieldName} is required`
  if (name.trim().length < 2) return `${fieldName} must be at least 2 characters`
  if (!/^[\p{L}\s'-]+$/u.test(name)) return `${fieldName} contains invalid characters`
  return null
}

// Text field validation with min length
export function validateText(
  text: string | undefined, 
  options: { 
    required?: boolean
    minLength?: number
    maxLength?: number
    fieldName?: string
  } = {}
): string | null {
  const { required = false, minLength, maxLength, fieldName = "This field" } = options
  
  if (!text?.trim()) {
    return required ? `${fieldName} is required` : null
  }
  
  if (minLength && text.trim().length < minLength) {
    return `${fieldName} must be at least ${minLength} characters`
  }
  
  if (maxLength && text.trim().length > maxLength) {
    return `${fieldName} must be less than ${maxLength} characters`
  }
  
  return null
}

// Selection validation (for radio/checkbox groups)
export function validateSelection(
  value: string | string[] | undefined,
  required = true,
  fieldName = "selection"
): string | null {
  if (!required) return null
  
  if (Array.isArray(value)) {
    if (value.length === 0) return `Please select at least one ${fieldName}`
    return null
  }
  
  if (!value) return `Please select a ${fieldName}`
  return null
}

// Certificate step validation
export function validateCertificateStep(answers: Record<string, unknown>): ValidationResult {
  const errors: Record<string, string> = {}
  
  if (!answers.certType) errors.certType = "Please select certificate type"
  if (!answers.duration) errors.duration = "Please select duration"
  if (!answers.startDate) errors.startDate = "Please select start date"
  
  return { isValid: Object.keys(errors).length === 0, errors }
}

// Symptoms step validation
export function validateSymptomsStep(answers: Record<string, unknown>): ValidationResult {
  const errors: Record<string, string> = {}
  
  const symptoms = answers.symptoms as string[] | undefined
  if (!symptoms || symptoms.length === 0) {
    errors.symptoms = "Please select at least one symptom"
  }
  
  const details = answers.symptomDetails as string | undefined
  if (!details || details.trim().length < 10) {
    errors.symptomDetails = "Please provide more detail about your symptoms"
  }
  
  return { isValid: Object.keys(errors).length === 0, errors }
}

// Medication step validation
export function validateMedicationStep(answers: Record<string, unknown>): ValidationResult {
  const errors: Record<string, string> = {}
  
  if (!answers.medicationName) {
    errors.medicationName = "Please select or enter a medication"
  }
  
  return { isValid: Object.keys(errors).length === 0, errors }
}

// Medication history step validation
export function validateMedicationHistoryStep(answers: Record<string, unknown>): ValidationResult {
  const errors: Record<string, string> = {}
  
  if (!answers.prescriptionHistory) {
    errors.prescriptionHistory = "Please indicate when you last had this prescribed"
  }
  
  return { isValid: Object.keys(errors).length === 0, errors }
}

// Medical history step validation
export function validateMedicalHistoryStep(answers: Record<string, unknown>): ValidationResult {
  const errors: Record<string, string> = {}
  
  if (answers.hasAllergies === undefined) {
    errors.hasAllergies = "Please indicate if you have any allergies"
  }
  
  if (answers.hasAllergies === true && !answers.allergies) {
    errors.allergies = "Please list your allergies"
  }
  
  if (answers.hasConditions === undefined) {
    errors.hasConditions = "Please indicate if you have any medical conditions"
  }
  
  if (answers.hasConditions === true && !answers.conditions) {
    errors.conditions = "Please list your conditions"
  }
  
  return { isValid: Object.keys(errors).length === 0, errors }
}

// Consult reason step validation
export function validateConsultReasonStep(answers: Record<string, unknown>): ValidationResult {
  const errors: Record<string, string> = {}
  
  if (!answers.consultCategory) {
    errors.consultCategory = "Please select what you'd like help with"
  }
  
  const details = answers.consultDetails as string | undefined
  if (!details || details.trim().length < 20) {
    errors.consultDetails = "Please provide more detail (at least 20 characters)"
  }
  
  return { isValid: Object.keys(errors).length === 0, errors }
}

// Details step validation
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

// Checkout step validation
export function validateCheckoutStep(consents: {
  agreedToTerms?: boolean
  confirmedAccuracy?: boolean
}): ValidationResult {
  const errors: Record<string, string> = {}
  
  if (!consents.agreedToTerms) {
    errors.agreedToTerms = "You must agree to the terms of service"
  }
  
  if (!consents.confirmedAccuracy) {
    errors.confirmedAccuracy = "You must confirm your information is accurate"
  }
  
  return { isValid: Object.keys(errors).length === 0, errors }
}

// Hook for real-time validation
export function useFieldValidation<T>(
  value: T,
  validator: (value: T) => string | null,
  _options: { validateOnMount?: boolean; validateOnBlur?: boolean } = {}
): {
  error: string | null
  validate: () => boolean
  clearError: () => void
} {
  // This is a lightweight hook pattern - actual implementation is in React components
  // Keeping it here for documentation of the validation pattern
  return {
    error: null,
    validate: () => {
      const error = validator(value)
      return error === null
    },
    clearError: () => {},
  }
}
