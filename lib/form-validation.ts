/**
 * Form Validation Helpers
 * Inline, friendly, non-blocking validation system
 * 
 * Usage:
 * import { validators, useFieldValidation, ValidationMessage } from '@/lib/form-validation'
 */

// =============================================================================
// VALIDATION RESULT TYPE
// =============================================================================

export interface ValidationResult {
  isValid: boolean
  message?: string
  type: 'error' | 'warning' | 'success' | 'info'
}

// =============================================================================
// COMMON VALIDATORS
// =============================================================================

export const validators = {
  /** Required field */
  required: (value: string | null | undefined): ValidationResult => {
    const isValid = !!value && value.trim().length > 0
    return {
      isValid,
      message: isValid ? undefined : 'This field is required',
      type: isValid ? 'success' : 'error',
    }
  },

  /** Email validation */
  email: (value: string): ValidationResult => {
    if (!value) return { isValid: false, message: 'Email is required', type: 'error' }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const isValid = emailRegex.test(value)
    return {
      isValid,
      message: isValid ? undefined : 'Please enter a valid email address',
      type: isValid ? 'success' : 'error',
    }
  },

  /** Minimum length */
  minLength: (min: number) => (value: string): ValidationResult => {
    const isValid = value.length >= min
    return {
      isValid,
      message: isValid ? undefined : `Must be at least ${min} characters`,
      type: isValid ? 'success' : 'error',
    }
  },

  /** Maximum length */
  maxLength: (max: number) => (value: string): ValidationResult => {
    const isValid = value.length <= max
    return {
      isValid,
      message: isValid ? undefined : `Must be ${max} characters or less`,
      type: isValid ? 'success' : 'error',
    }
  },

  /** Australian Medicare number (10 digits) */
  medicareNumber: (value: string): ValidationResult => {
    const digits = value.replace(/\D/g, '')
    if (digits.length === 0) {
      return { isValid: false, message: 'Medicare number is required', type: 'error' }
    }
    if (digits.length < 10) {
      return { 
        isValid: false, 
        message: `${10 - digits.length} more digit${digits.length === 9 ? '' : 's'} needed`,
        type: 'info',
      }
    }
    // Basic checksum validation for Medicare
    if (!/^[2-6]/.test(digits)) {
      return { isValid: false, message: 'Medicare number must start with 2-6', type: 'error' }
    }
    return { isValid: true, message: 'Valid format', type: 'success' }
  },

  /** Australian postcode (4 digits) */
  postcode: (value: string): ValidationResult => {
    const digits = value.replace(/\D/g, '')
    if (digits.length === 0) {
      return { isValid: false, message: 'Postcode is required', type: 'error' }
    }
    if (digits.length < 4) {
      return { isValid: false, message: `${4 - digits.length} more digits needed`, type: 'info' }
    }
    const isValid = /^[0-9]{4}$/.test(digits)
    return {
      isValid,
      message: isValid ? undefined : 'Please enter a valid 4-digit postcode',
      type: isValid ? 'success' : 'error',
    }
  },

  /** Date validation (not in future, not too far past) */
  dateOfBirth: (value: string): ValidationResult => {
    if (!value) return { isValid: false, message: 'Date of birth is required', type: 'error' }
    
    const date = new Date(value)
    const today = new Date()
    const minDate = new Date()
    minDate.setFullYear(minDate.getFullYear() - 120)
    
    if (date > today) {
      return { isValid: false, message: 'Date cannot be in the future', type: 'error' }
    }
    if (date < minDate) {
      return { isValid: false, message: 'Please enter a valid date', type: 'error' }
    }
    return { isValid: true, type: 'success' }
  },

  /** Start date validation (cannot be backdated) */
  startDate: (value: string): ValidationResult => {
    if (!value) return { isValid: false, message: 'Start date is required', type: 'error' }
    
    const date = new Date(value)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    if (date < today) {
      return { 
        isValid: false, 
        message: 'Certificates cannot be backdated',
        type: 'error',
      }
    }
    return { isValid: true, type: 'success' }
  },

  /** Phone number (Australian format) */
  phone: (value: string): ValidationResult => {
    if (!value) return { isValid: false, message: 'Phone number is required', type: 'error' }
    
    const digits = value.replace(/\D/g, '')
    if (digits.length < 10) {
      return { isValid: false, message: 'Please enter a valid phone number', type: 'error' }
    }
    return { isValid: true, type: 'success' }
  },

  /** Password strength */
  password: (value: string): ValidationResult => {
    if (!value) return { isValid: false, message: 'Password is required', type: 'error' }
    if (value.length < 8) {
      return { isValid: false, message: 'Password must be at least 8 characters', type: 'error' }
    }
    // Check for strength
    const hasLower = /[a-z]/.test(value)
    const hasUpper = /[A-Z]/.test(value)
    const hasNumber = /[0-9]/.test(value)
    
    if (hasLower && hasUpper && hasNumber) {
      return { isValid: true, message: 'Strong password', type: 'success' }
    }
    return { 
      isValid: true, 
      message: 'Consider adding uppercase, lowercase, and numbers',
      type: 'warning',
    }
  },
}

// =============================================================================
// VALIDATION COMPOSITION
// =============================================================================

/**
 * Combine multiple validators
 * Stops at first error (unless continueOnError is true)
 */
export function composeValidators(
  ...fns: ((value: string) => ValidationResult)[]
) {
  return (value: string): ValidationResult => {
    for (const fn of fns) {
      const result = fn(value)
      if (!result.isValid) return result
    }
    return { isValid: true, type: 'success' }
  }
}

/**
 * Create a conditional validator
 */
export function conditionalValidator(
  condition: boolean,
  validator: (value: string) => ValidationResult
) {
  return (value: string): ValidationResult => {
    if (!condition) return { isValid: true, type: 'success' }
    return validator(value)
  }
}

// =============================================================================
// VALIDATION MESSAGES (Friendly copy)
// =============================================================================

export const validationMessages = {
  required: 'This field is required',
  email: 'Please enter a valid email address',
  emailExists: 'This email is already registered',
  passwordWeak: 'Password must be at least 8 characters',
  passwordMismatch: 'Passwords do not match',
  invalidDate: 'Please enter a valid date',
  dateFuture: 'Date cannot be in the future',
  datePast: 'Date cannot be in the past',
  medicareInvalid: 'Please check your Medicare number',
  postcodeInvalid: 'Please enter a valid 4-digit postcode',
  phoneInvalid: 'Please enter a valid phone number',
  selectionRequired: 'Please select an option',
  termsRequired: 'Please accept the terms to continue',
  networkError: 'Connection issue. Please try again.',
  
  // Friendly progress messages
  almostThere: 'Almost there!',
  looksGood: 'Looks good!',
  keepGoing: 'Keep going...',
}

// =============================================================================
// FORM STATE HELPERS
// =============================================================================

export interface FieldState {
  value: string
  touched: boolean
  dirty: boolean
  validation: ValidationResult | null
}

/**
 * Create initial field state
 */
export function createFieldState(initialValue: string = ''): FieldState {
  return {
    value: initialValue,
    touched: false,
    dirty: false,
    validation: null,
  }
}

/**
 * Check if a form has any errors
 */
export function hasFormErrors(fields: Record<string, FieldState>): boolean {
  return Object.values(fields).some(
    field => field.validation && !field.validation.isValid
  )
}

/**
 * Check if all required fields are filled
 */
export function areRequiredFieldsFilled(
  fields: Record<string, FieldState>,
  requiredFields: string[]
): boolean {
  return requiredFields.every(
    fieldName => fields[fieldName]?.value && fields[fieldName].value.trim() !== ''
  )
}

// =============================================================================
// REAL-TIME VALIDATION TIMING
// =============================================================================

/**
 * Debounce validation to avoid flickering
 * Default: 300ms for typing, immediate for blur
 */
export const VALIDATION_DEBOUNCE = {
  typing: 300,
  blur: 0,
  submit: 0,
}

/**
 * When to show validation messages
 */
export const SHOW_VALIDATION = {
  // Show error after first blur (touched)
  afterBlur: (field: FieldState) => field.touched,
  // Show error only after user has typed something
  afterDirty: (field: FieldState) => field.dirty,
  // Show error immediately (for submit validation)
  always: () => true,
  // Show success immediately, error after blur
  successImmediateErrorDelayed: (field: FieldState, result: ValidationResult) => 
    result.isValid || field.touched,
}
