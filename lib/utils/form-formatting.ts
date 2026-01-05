/**
 * Form auto-formatting utilities
 * Provides smart formatting for common Australian form fields
 */

/**
 * Format Australian Medicare number (10 digits)
 * Format: XXXX XXXX X
 */
export function formatMedicareNumber(value: string): string {
  // Remove all non-digits
  const digits = value.replace(/\D/g, "")
  
  // Limit to 10 digits
  const limited = digits.slice(0, 10)
  
  // Format: XXXX XXXX X
  if (limited.length <= 4) {
    return limited
  } else if (limited.length <= 9) {
    return `${limited.slice(0, 4)} ${limited.slice(4)}`
  } else {
    return `${limited.slice(0, 4)} ${limited.slice(4, 9)} ${limited.slice(9)}`
  }
}

/**
 * Format Australian phone number (10 digits)
 * Format: 04XX XXX XXX
 */
export function formatPhoneNumber(value: string): string {
  // Remove all non-digits
  const digits = value.replace(/\D/g, "")
  
  // Limit to 10 digits
  const limited = digits.slice(0, 10)
  
  // Format: 04XX XXX XXX
  if (limited.length <= 2) {
    return limited
  } else if (limited.length <= 6) {
    return `${limited.slice(0, 2)} ${limited.slice(2)}`
  } else {
    return `${limited.slice(0, 2)} ${limited.slice(2, 6)} ${limited.slice(6)}`
  }
}

/**
 * Format Australian postcode (4 digits)
 */
export function formatPostcode(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 4)
  return digits
}

/**
 * Format credit card number
 * Format: XXXX XXXX XXXX XXXX
 */
export function formatCreditCard(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 16)
  
  // Group by 4s
  const groups: string[] = []
  for (let i = 0; i < digits.length; i += 4) {
    groups.push(digits.slice(i, i + 4))
  }
  
  return groups.join(" ")
}

/**
 * Format expiry date (MM/YY)
 */
export function formatExpiryDate(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 4)
  
  if (digits.length <= 2) {
    return digits
  } else {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`
  }
}

/**
 * Format date input (DD/MM/YYYY)
 */
export function formatDateInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8)
  
  if (digits.length <= 2) {
    return digits
  } else if (digits.length <= 4) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`
  } else {
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
  }
}

/**
 * Unformat a value (remove all formatting)
 */
export function unformatValue(value: string): string {
  return value.replace(/\D/g, "")
}

/**
 * Format IRN (Individual Reference Number) - single digit
 */
export function formatIRN(value: string): string {
  return value.replace(/\D/g, "").slice(0, 1)
}

/**
 * Get unformatted Medicare number for validation
 */
export function getUnformattedMedicare(formatted: string): string {
  return formatted.replace(/\s/g, "")
}

/**
 * Get unformatted phone number for validation
 */
export function getUnformattedPhone(formatted: string): string {
  return formatted.replace(/\s/g, "")
}

