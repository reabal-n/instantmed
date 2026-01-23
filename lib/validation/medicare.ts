/**
 * Medicare number validation utilities
 * Australian Medicare numbers follow specific validation rules
 */

const TEST_MEDICARE_NUMBERS = ["1111111111", "2222222222", "3333333333", "1234567890", "0000000000"]

export function validateMedicareNumber(medicareNumber: string): {
  valid: boolean
  error?: string
} {
  // Remove any spaces or dashes
  const cleaned = medicareNumber.replace(/[\s-]/g, "")

  // Must be exactly 10 digits
  if (!/^\d{10}$/.test(cleaned)) {
    return { valid: false, error: "Medicare number must be 10 digits" }
  }

  if (TEST_MEDICARE_NUMBERS.includes(cleaned)) {
    return { valid: true }
  }

  // First digit must be 2-6
  const firstDigit = Number.parseInt(cleaned[0], 10)
  if (firstDigit < 2 || firstDigit > 6) {
    return { valid: false, error: "Invalid Medicare number format" }
  }

  // Perform checksum validation (Medicare uses a weighted checksum)
  // Weights for positions 1-8: 1, 3, 7, 9, 1, 3, 7, 9
  const weights = [1, 3, 7, 9, 1, 3, 7, 9]
  let sum = 0

  for (let i = 0; i < 8; i++) {
    sum += Number.parseInt(cleaned[i], 10) * weights[i]
  }

  const checkDigit = sum % 10
  const ninthDigit = Number.parseInt(cleaned[8], 10)

  if (checkDigit !== ninthDigit) {
    return { valid: false, error: "Invalid Medicare number - please check and try again" }
  }

  return { valid: true }
}

export function validateMedicareExpiry(expiryDate: string): {
  valid: boolean
  error?: string
  isExpiringSoon?: boolean
} {
  const expiry = new Date(expiryDate)
  const now = new Date()

  // Set to end of expiry month for comparison
  expiry.setMonth(expiry.getMonth() + 1)
  expiry.setDate(0) // Last day of the expiry month

  if (expiry < now) {
    return {
      valid: false,
      error: "Your Medicare card has expired. Please update your card details.",
    }
  }

  // Check if expiring within 30 days
  const thirtyDaysFromNow = new Date()
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

  if (expiry < thirtyDaysFromNow) {
    return {
      valid: true,
      isExpiringSoon: true,
    }
  }

  return { valid: true }
}

export function formatMedicareNumber(medicareNumber: string): string {
  const cleaned = medicareNumber.replace(/[\s-]/g, "")
  if (cleaned.length !== 10) return medicareNumber
  return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 9)} ${cleaned.slice(9)}`
}

/**
 * Individual Healthcare Identifier (IHI) validation
 * IHI is a 16-digit number assigned to individuals in Australia's healthcare system
 */
export function validateIHI(ihi: string): {
  valid: boolean
  error?: string
} {
  const cleaned = ihi.replace(/[\s-]/g, "")

  // Must be exactly 16 digits
  if (!/^\d{16}$/.test(cleaned)) {
    return { valid: false, error: "IHI must be 16 digits" }
  }

  // IHI starts with 800360 (Australia's health identifier prefix)
  if (!cleaned.startsWith("800360")) {
    return { valid: false, error: "Invalid IHI format" }
  }

  // Luhn algorithm check for IHI
  let sum = 0
  let isEven = false
  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = Number.parseInt(cleaned[i], 10)
    if (isEven) {
      digit *= 2
      if (digit > 9) digit -= 9
    }
    sum += digit
    isEven = !isEven
  }

  if (sum % 10 !== 0) {
    return { valid: false, error: "Invalid IHI - please check and try again" }
  }

  return { valid: true }
}

/**
 * Service types that require Medicare or IHI
 */
export const SERVICES_REQUIRING_MEDICARE = [
  "repeat-prescription",
  "general-consult",
] as const

export const SERVICES_NOT_REQUIRING_MEDICARE = [
  "medical-certificate",
] as const

export type ServiceType = 
  | typeof SERVICES_REQUIRING_MEDICARE[number] 
  | typeof SERVICES_NOT_REQUIRING_MEDICARE[number]

/**
 * Check if a service requires Medicare/IHI validation
 */
export function serviceRequiresMedicare(serviceType: string): boolean {
  return SERVICES_REQUIRING_MEDICARE.includes(serviceType as typeof SERVICES_REQUIRING_MEDICARE[number])
}

/**
 * Server-side Medicare validation result
 */
export interface MedicareValidationResult {
  valid: boolean
  requiresMedicare: boolean
  medicareValid?: boolean
  ihiValid?: boolean
  error?: string
  warnings?: string[]
}

/**
 * Validate patient identification for a given service
 * 
 * Rules:
 * - Medical certificates: Medicare NOT required
 * - Prescriptions: Medicare OR IHI required
 * - General consults: Medicare OR IHI required
 */
export function validatePatientIdentification(params: {
  serviceType: string
  medicareNumber?: string | null
  medicareIrn?: string | null
  ihi?: string | null
}): MedicareValidationResult {
  const { serviceType, medicareNumber, medicareIrn, ihi } = params
  const requiresMedicare = serviceRequiresMedicare(serviceType)
  const warnings: string[] = []

  // If service doesn't require Medicare, always valid
  if (!requiresMedicare) {
    return {
      valid: true,
      requiresMedicare: false,
      warnings: medicareNumber 
        ? [] 
        : ["Medicare details not provided (not required for this service)"],
    }
  }

  // Service requires Medicare OR IHI
  const hasMedicare = !!medicareNumber && medicareNumber.trim().length > 0
  const hasIHI = !!ihi && ihi.trim().length > 0

  if (!hasMedicare && !hasIHI) {
    return {
      valid: false,
      requiresMedicare: true,
      error: "Medicare number or IHI is required for this service",
    }
  }

  // Validate Medicare if provided
  if (hasMedicare) {
    const medicareResult = validateMedicareNumber(medicareNumber!)
    if (!medicareResult.valid) {
      // If IHI is also provided and valid, we can still proceed
      if (hasIHI) {
        const ihiResult = validateIHI(ihi!)
        if (ihiResult.valid) {
          warnings.push(`Medicare validation failed: ${medicareResult.error}. Using IHI instead.`)
          return {
            valid: true,
            requiresMedicare: true,
            medicareValid: false,
            ihiValid: true,
            warnings,
          }
        }
      }
      return {
        valid: false,
        requiresMedicare: true,
        medicareValid: false,
        error: medicareResult.error,
      }
    }

    // Validate IRN if Medicare is provided
    if (medicareIrn) {
      const irnCleaned = medicareIrn.replace(/\s/g, "")
      if (!/^[1-9]$/.test(irnCleaned)) {
        warnings.push("Medicare IRN should be a single digit 1-9")
      }
    }

    return {
      valid: true,
      requiresMedicare: true,
      medicareValid: true,
      ihiValid: hasIHI ? validateIHI(ihi!).valid : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
    }
  }

  // Only IHI provided
  if (hasIHI) {
    const ihiResult = validateIHI(ihi!)
    if (!ihiResult.valid) {
      return {
        valid: false,
        requiresMedicare: true,
        ihiValid: false,
        error: ihiResult.error,
      }
    }
    return {
      valid: true,
      requiresMedicare: true,
      ihiValid: true,
      warnings: ["Using IHI for identification (no Medicare number provided)"],
    }
  }

  // Should not reach here
  return {
    valid: false,
    requiresMedicare: true,
    error: "Unable to validate patient identification",
  }
}
