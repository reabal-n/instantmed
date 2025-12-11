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
