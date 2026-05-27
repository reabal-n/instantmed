/**
 * Medicare number validation utilities
 * Australian Medicare numbers follow specific validation rules
 */

const TEST_MEDICARE_NUMBERS = new Set(["1111111111", "2222222222", "3333333333", "1234567890"])

export interface MedicareValidationOptions {
  /**
   * Test fixtures can opt into deterministic placeholder numbers. Patient,
   * checkout, profile, and prescribing paths should use the default, which
   * rejects these in production and browser runtime.
   */
  allowTestNumbers?: boolean
}

function allowTestMedicareNumbers(options?: MedicareValidationOptions): boolean {
  if (options?.allowTestNumbers !== undefined) return options.allowTestNumbers
  return process.env.NODE_ENV === "test"
}

export function validateMedicareNumber(medicareNumber: string, options?: MedicareValidationOptions): {
  valid: boolean
  error?: string
} {
  // Remove any spaces or dashes
  const cleaned = medicareNumber.replace(/[\s-]/g, "")

  // Must be exactly 10 digits
  if (!/^\d{10}$/.test(cleaned)) {
    return { valid: false, error: "Medicare number must be 10 digits" }
  }

  if (/^0{10}$/.test(cleaned)) {
    return { valid: false, error: "Enter a valid Medicare number" }
  }

  if (TEST_MEDICARE_NUMBERS.has(cleaned)) {
    return allowTestMedicareNumbers(options)
      ? { valid: true }
      : { valid: false, error: "Enter a real Medicare number" }
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

// Deleted on 2026-05-24: the dead-code Medicare service-routing block lived
// here for months with wrong constants (SERVICES_REQUIRING_MEDICARE listed
// "repeat-prescription" which is not a real UnifiedServiceType, so
// serviceRequiresMedicare() returned false for every real input). Zero
// callers across the codebase — verified by repo-wide grep on 2026-05-24.
// The real Medicare gating happens in lib/request/prescribing-identity.ts
// (`requiresPrescribingIdentityForRequest`) which is the canonical source.
// Re-adding service-type routing here should mirror that function, not
// reinvent a parallel set of strings.
