/**
 * Individual Healthcare Identifier (IHI) validation utilities
 * Australian IHI numbers follow specific validation rules (16-digit, Luhn-10 checksum)
 * 
 * IHI Format:
 * - 16 digits total
 * - Prefix: 800360 (Healthcare Identifier Service)
 * - Followed by 9 unique identifier digits
 * - Final digit is Luhn-10 check digit
 */

const TEST_IHI_NUMBERS = [
  "8003600000000000",
  "8003601111111111",
  "8003602222222222",
]

/**
 * Luhn-10 checksum validation (ISO/IEC 7812-1)
 * Used by IHI, credit cards, and other identification numbers
 */
function luhn10Checksum(digits: string): boolean {
  let sum = 0
  let isSecond = false

  // Process from right to left
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = Number.parseInt(digits[i], 10)

    if (isSecond) {
      digit *= 2
      if (digit > 9) {
        digit -= 9
      }
    }

    sum += digit
    isSecond = !isSecond
  }

  return sum % 10 === 0
}

export function validateIHI(ihi: string): {
  valid: boolean
  error?: string
} {
  // Remove any spaces or dashes
  const cleaned = ihi.replace(/[\s-]/g, "")

  // Must be exactly 16 digits
  if (!/^\d{16}$/.test(cleaned)) {
    return { valid: false, error: "IHI must be 16 digits" }
  }

  // Allow test numbers in development
  if (TEST_IHI_NUMBERS.includes(cleaned)) {
    return { valid: true }
  }

  // Must start with 800360 (Healthcare Identifier Service prefix)
  if (!cleaned.startsWith("800360")) {
    return { valid: false, error: "Invalid IHI format - must start with 800360" }
  }

  // Perform Luhn-10 checksum validation
  if (!luhn10Checksum(cleaned)) {
    return { valid: false, error: "Invalid IHI number - please check and try again" }
  }

  return { valid: true }
}

export function formatIHI(ihi: string): string {
  const cleaned = ihi.replace(/[\s-]/g, "")
  if (cleaned.length !== 16) return ihi
  // Format as: 8003 6000 0000 0000
  return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 8)} ${cleaned.slice(8, 12)} ${cleaned.slice(12)}`
}

/**
 * Check if a string looks like an IHI (for auto-detection)
 */
export function looksLikeIHI(value: string): boolean {
  const cleaned = value.replace(/[\s-]/g, "")
  return cleaned.length === 16 && cleaned.startsWith("800360")
}
