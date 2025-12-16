// =============================================================================
// MEDICARE VALIDATION
// =============================================================================

export interface ValidationResult {
  valid: boolean
  error?: string
  isExpiringSoon?: boolean
}

/**
 * Validate Australian Medicare card number
 * Medicare numbers are 10 digits with a checksum
 */
export function validateMedicareNumber(number: string): ValidationResult {
  // Remove spaces and any separators
  const cleaned = number.replace(/[\s-]/g, '')

  // Check if empty
  if (!cleaned) {
    return { valid: false, error: 'Medicare number is required' }
  }

  // Check length
  if (cleaned.length !== 10) {
    return { valid: false, error: 'Medicare number must be 10 digits' }
  }

  // Check if all digits
  if (!/^\d{10}$/.test(cleaned)) {
    return { valid: false, error: 'Medicare number must contain only digits' }
  }

  // Medicare checksum validation (Luhn algorithm variant)
  // The first 8 digits are the base number, 9th is checksum, 10th is issue number
  const weights = [1, 3, 7, 9, 1, 3, 7, 9]
  const baseDigits = cleaned.slice(0, 8).split('').map(Number)
  const checkDigit = parseInt(cleaned[8])

  let sum = 0
  for (let i = 0; i < 8; i++) {
    sum += baseDigits[i] * weights[i]
  }

  const calculatedCheck = sum % 10

  if (calculatedCheck !== checkDigit) {
    return { valid: false, error: 'Invalid Medicare number' }
  }

  return { valid: true }
}

/**
 * Validate Medicare card expiry date
 * @param expiry - Date in YYYY-MM-DD format
 */
export function validateMedicareExpiry(expiry: string): ValidationResult {
  // Check if empty
  if (!expiry) {
    return { valid: false, error: 'Expiry date is required' }
  }

  // Parse YYYY-MM-DD format
  const match = expiry.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) {
    return { valid: false, error: 'Invalid date format' }
  }

  const year = parseInt(match[1])
  const month = parseInt(match[2])
  const day = parseInt(match[3])

  // Validate month
  if (month < 1 || month > 12) {
    return { valid: false, error: 'Invalid month' }
  }

  // Create expiry date (end of the expiry month)
  const expiryDate = new Date(year, month, 0) // Last day of the month
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Check if expired
  if (expiryDate < today) {
    return { valid: false, error: 'Your Medicare card has expired' }
  }

  // Check if expiring soon (within 3 months)
  const threeMonthsFromNow = new Date()
  threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3)

  if (expiryDate <= threeMonthsFromNow) {
    return { valid: true, isExpiringSoon: true }
  }

  return { valid: true }
}

/**
 * Format Medicare number with spaces for display
 * e.g., "1234567890" -> "1234 56789 0"
 */
export function formatMedicareNumber(number: string): string {
  const cleaned = number.replace(/[\s-]/g, '')
  if (cleaned.length !== 10) return number

  return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 9)} ${cleaned.slice(9)}`
}
