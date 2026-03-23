import { validateMedicareNumber } from '@/lib/validation/medicare'
import { validateIHI } from '@/lib/validation/ihi'

export interface ValidationResult {
  isValid: boolean
  missingFields: string[]
  errors: Record<string, string>
}

interface ValidatableState {
  serviceSlug: string | null
  answers: Record<string, unknown>
  identityData: {
    firstName?: string
    lastName?: string
    email?: string
    phone?: string
    dateOfBirth?: string
    addressLine1?: string
    suburb?: string
    state?: string
    postcode?: string
    medicareNumber?: string
    ihi?: string
    [key: string]: unknown
  } | null
  consentsGiven: Array<{ type: string }>
}

export function validateAllRequiredFields(state: ValidatableState): ValidationResult {
  const missingFields: string[] = []
  const errors: Record<string, string> = {}

  // Must have a service selected
  if (!state.serviceSlug) {
    missingFields.push('serviceSlug')
    errors['serviceSlug'] = 'Please select a service'
  }

  // Check safety confirmation (emergency_symptoms should be empty/none)
  const emergencySymptoms = state.answers.emergency_symptoms as string[] | undefined
  if (emergencySymptoms && emergencySymptoms.length > 0 && !emergencySymptoms.includes('none')) {
    missingFields.push('emergency_symptoms')
    errors['emergency_symptoms'] = 'Emergency symptoms detected - please seek immediate care'
  }

  // Determine if this is a prescription flow (requires Medicare/IHI for eScript)
  const isPrescriptionFlow = state.serviceSlug && [
    'prescription',
    'repeat-script',
    'new-script',
    'consult',
    'gp-consult',
  ].includes(state.serviceSlug)

  // Check identity data for details step
  const identityFields = ['firstName', 'lastName', 'email', 'phone', 'dateOfBirth']
  if (state.identityData) {
    for (const field of identityFields) {
      const value = state.identityData[field as keyof typeof state.identityData]
      if (!value) {
        missingFields.push(field)
        errors[field] = `${field.replace(/([A-Z])/g, ' $1').trim()} is required`
      }
    }

    // For prescription flows: require address
    if (isPrescriptionFlow) {
      const addressFields = ['addressLine1', 'suburb', 'state', 'postcode']
      for (const field of addressFields) {
        const value = state.identityData[field as keyof typeof state.identityData]
        if (!value) {
          missingFields.push(field)
          errors[field] = `${field.replace(/([A-Z])/g, ' $1').trim()} is required for prescriptions`
        }
      }

      // For prescription flows: require valid Medicare OR valid IHI (for eScript issuance)
      const medicareValue = state.identityData.medicareNumber ? String(state.identityData.medicareNumber) : ''
      const ihiValue = state.identityData.ihi ? String(state.identityData.ihi) : ''

      const medicareValidation = medicareValue ? validateMedicareNumber(medicareValue) : { valid: false }
      const ihiValidation = ihiValue ? validateIHI(ihiValue) : { valid: false }

      const hasMedicare = medicareValidation.valid
      const hasIHI = ihiValidation.valid

      if (!hasMedicare && !hasIHI) {
        missingFields.push('medicareOrIhi')
        // Provide specific error if they entered something invalid
        if (medicareValue && !medicareValidation.valid) {
          errors['medicareOrIhi'] = medicareValidation.error || 'Invalid Medicare number'
        } else if (ihiValue && !ihiValidation.valid) {
          errors['medicareOrIhi'] = ihiValidation.error || 'Invalid IHI number'
        } else {
          errors['medicareOrIhi'] = 'Medicare number or IHI is required for prescriptions (needed for eScript)'
        }
      }
    }
  } else {
    // Check if identity fields are in answers (for guest checkout)
    for (const field of ['patient_name', 'patient_email', 'patient_phone', 'patient_dob']) {
      if (!state.answers[field]) {
        missingFields.push(field)
        errors[field] = `${field.replace(/_/g, ' ')} is required`
      }
    }

    // For prescription flows in guest checkout: require address fields
    if (isPrescriptionFlow) {
      for (const field of ['patient_address', 'patient_suburb', 'patient_state', 'patient_postcode']) {
        if (!state.answers[field]) {
          missingFields.push(field)
          errors[field] = `${field.replace(/patient_/g, '').replace(/_/g, ' ')} is required for prescriptions`
        }
      }

      // Require valid Medicare OR valid IHI
      const medicareValue = state.answers.patient_medicare ? String(state.answers.patient_medicare) : ''
      const ihiValue = state.answers.patient_ihi ? String(state.answers.patient_ihi) : ''

      const medicareValidation = medicareValue ? validateMedicareNumber(medicareValue) : { valid: false }
      const ihiValidation = ihiValue ? validateIHI(ihiValue) : { valid: false }

      const hasMedicare = medicareValidation.valid
      const hasIHI = ihiValidation.valid

      if (!hasMedicare && !hasIHI) {
        missingFields.push('medicareOrIhi')
        if (medicareValue && !medicareValidation.valid) {
          errors['medicareOrIhi'] = medicareValidation.error || 'Invalid Medicare number'
        } else if (ihiValue && !ihiValidation.valid) {
          errors['medicareOrIhi'] = ihiValidation.error || 'Invalid IHI number'
        } else {
          errors['medicareOrIhi'] = 'Medicare number or IHI is required for prescriptions (needed for eScript)'
        }
      }
    }
  }

  // Check consents
  if (state.consentsGiven.length === 0) {
    // Consents might be stored differently in some flows
    const termsAgreed = state.answers.agreedToTerms || state.answers.terms_agreed
    if (!termsAgreed) {
      missingFields.push('consents')
      errors['consents'] = 'Please agree to the terms and conditions'
    }
  }

  return {
    isValid: missingFields.length === 0,
    missingFields,
    errors,
  }
}
