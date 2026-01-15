/**
 * Australian Phone Number Validation
 * 
 * Validates and formats Australian mobile and landline numbers.
 * Supports various input formats and normalizes to E.164 format.
 */

export interface PhoneValidationResult {
  valid: boolean
  error?: string
  type?: "mobile" | "landline" | "unknown"
  formatted?: string
  e164?: string
}

/**
 * Area code to state mapping for landlines
 */
const AREA_CODE_STATES: Record<string, string[]> = {
  "02": ["NSW", "ACT"],
  "03": ["VIC", "TAS"],
  "07": ["QLD"],
  "08": ["SA", "WA", "NT"],
}

/**
 * Clean phone number by removing all non-digit characters except leading +
 */
function cleanPhoneNumber(phone: string): string {
  const hasPlus = phone.startsWith("+")
  const digits = phone.replace(/\D/g, "")
  return hasPlus ? `+${digits}` : digits
}

/**
 * Normalize to 10-digit Australian format (starting with 0)
 */
function normalizeToAustralian(phone: string): string | null {
  const cleaned = cleanPhoneNumber(phone)
  
  // Remove +61 prefix if present
  if (cleaned.startsWith("+61")) {
    return "0" + cleaned.slice(3)
  }
  if (cleaned.startsWith("61") && cleaned.length === 11) {
    return "0" + cleaned.slice(2)
  }
  // Already in 10-digit format
  if (cleaned.length === 10 && cleaned.startsWith("0")) {
    return cleaned
  }
  // 9-digit without leading 0 (assume mobile or landline)
  if (cleaned.length === 9 && /^[234578]/.test(cleaned)) {
    return "0" + cleaned
  }
  
  return null
}

/**
 * Validate Australian phone number
 */
export function validateAustralianPhone(phone: string): PhoneValidationResult {
  if (!phone || !phone.trim()) {
    return { valid: false, error: "Phone number is required" }
  }

  const normalized = normalizeToAustralian(phone)
  
  if (!normalized) {
    return { 
      valid: false, 
      error: "Please enter a valid Australian phone number" 
    }
  }

  // Check if it's a valid mobile
  if (/^04\d{8}$/.test(normalized)) {
    return {
      valid: true,
      type: "mobile",
      formatted: formatPhoneNumber(normalized),
      e164: `+61${normalized.slice(1)}`,
    }
  }

  // Check if it's a valid landline
  if (/^0[2378]\d{8}$/.test(normalized)) {
    return {
      valid: true,
      type: "landline",
      formatted: formatPhoneNumber(normalized),
      e164: `+61${normalized.slice(1)}`,
    }
  }

  // Invalid format
  return {
    valid: false,
    error: "Please enter a valid Australian mobile or landline number",
  }
}

/**
 * Format phone number for display
 * Mobile: 0412 345 678
 * Landline: (02) 1234 5678
 */
export function formatPhoneNumber(phone: string): string {
  const normalized = normalizeToAustralian(phone)
  if (!normalized) return phone

  // Mobile format: 0412 345 678
  if (normalized.startsWith("04")) {
    return `${normalized.slice(0, 4)} ${normalized.slice(4, 7)} ${normalized.slice(7)}`
  }

  // Landline format: (02) 1234 5678
  return `(${normalized.slice(0, 2)}) ${normalized.slice(2, 6)} ${normalized.slice(6)}`
}

/**
 * Get area code state for landline numbers
 */
export function getPhoneAreaState(phone: string): string[] | null {
  const normalized = normalizeToAustralian(phone)
  if (!normalized || normalized.startsWith("04")) return null
  
  const areaCode = normalized.slice(0, 2)
  return AREA_CODE_STATES[areaCode] || null
}

/**
 * Check if phone is mobile
 */
export function isMobileNumber(phone: string): boolean {
  const normalized = normalizeToAustralian(phone)
  return normalized ? normalized.startsWith("04") : false
}

/**
 * Real-time validation feedback (for typing)
 */
export function getPhoneValidationHint(phone: string): {
  message: string
  type: "info" | "warning" | "error" | "success"
} {
  if (!phone) {
    return { message: "", type: "info" }
  }

  const digits = phone.replace(/\D/g, "")
  
  if (digits.length < 10) {
    const remaining = 10 - digits.length
    return { 
      message: `${remaining} more digit${remaining === 1 ? "" : "s"}`, 
      type: "info" 
    }
  }

  const result = validateAustralianPhone(phone)
  
  if (result.valid) {
    const typeLabel = result.type === "mobile" ? "Mobile" : "Landline"
    return { message: `Valid ${typeLabel}`, type: "success" }
  }

  return { message: result.error || "Invalid number", type: "error" }
}
