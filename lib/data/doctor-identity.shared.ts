/**
 * Doctor Identity - Shared Types & Validation
 * Can be imported in both client and server components
 */

// ============================================================================
// TYPES
// ============================================================================

export interface DoctorIdentity {
  id: string
  full_name: string
  nominals: string | null
  provider_number: string | null
  ahpra_number: string | null
  signature_storage_path: string | null
  certificate_identity_complete: boolean
}

export interface DoctorIdentityInput {
  nominals?: string | null
  provider_number?: string | null
  ahpra_number?: string | null
  signature_storage_path?: string | null
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate Australian Medicare Provider Number format
 * Format: 6 digits + 1 check character (letter)
 * Example: 2426577L
 */
export function validateProviderNumber(value: string): {
  valid: boolean
  error?: string
} {
  if (!value || value.trim() === "") {
    return { valid: false, error: "Provider number is required" }
  }

  const cleaned = value.trim().toUpperCase()

  // Basic format: 6-7 digits followed by optional letter, or 6 digits + letter
  const pattern = /^[0-9]{6,7}[A-Z]?$|^[0-9]{6}[A-Z]$/
  
  if (!pattern.test(cleaned)) {
    return {
      valid: false,
      error: "Invalid format. Expected 6-7 digits followed by a letter (e.g., 2426577L)",
    }
  }

  if (cleaned.length < 7 || cleaned.length > 8) {
    return {
      valid: false,
      error: "Provider number should be 7-8 characters",
    }
  }

  return { valid: true }
}

/**
 * Validate AHPRA Registration Number format
 * Format: MED followed by 10 digits
 * Example: MED0002576546
 */
export function validateAhpraNumber(value: string): {
  valid: boolean
  error?: string
} {
  if (!value || value.trim() === "") {
    return { valid: false, error: "AHPRA registration number is required" }
  }

  const cleaned = value.trim().toUpperCase()

  // AHPRA format: 3 letters (profession code) + 10 digits
  // MED = Medical practitioner
  const pattern = /^[A-Z]{3}[0-9]{10}$/

  if (!pattern.test(cleaned)) {
    return {
      valid: false,
      error: "Invalid format. Expected 3 letters + 10 digits (e.g., MED0002576546)",
    }
  }

  return { valid: true }
}

/**
 * Check if doctor has complete certificate identity
 */
export function isDoctorIdentityComplete(identity: DoctorIdentity | null): boolean {
  if (!identity) return false
  
  return (
    !!identity.provider_number &&
    identity.provider_number.trim() !== "" &&
    !!identity.ahpra_number &&
    identity.ahpra_number.trim() !== ""
  )
}
