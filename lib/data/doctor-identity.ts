/**
 * Doctor Identity Data Layer
 * CRUD operations for doctor certificate identity settings
 */

import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createLogger } from "@/lib/observability/logger"

const log = createLogger("doctor-identity")

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

// ============================================================================
// DATA OPERATIONS
// ============================================================================

/**
 * Get doctor identity for current user
 */
export async function getDoctorIdentity(profileId: string): Promise<DoctorIdentity | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("profiles")
    .select(`
      id,
      full_name,
      nominals,
      provider_number,
      ahpra_number,
      signature_storage_path,
      certificate_identity_complete
    `)
    .eq("id", profileId)
    .single()

  if (error) {
    log.error("Failed to fetch doctor identity", { profileId }, error)
    return null
  }

  return data as DoctorIdentity
}

/**
 * Update doctor identity
 */
export async function updateDoctorIdentity(
  profileId: string,
  input: DoctorIdentityInput
): Promise<{ success: boolean; data?: DoctorIdentity; error?: string }> {
  const supabase = await createClient()

  // Validate provider number if provided
  if (input.provider_number) {
    const providerValidation = validateProviderNumber(input.provider_number)
    if (!providerValidation.valid) {
      return { success: false, error: providerValidation.error }
    }
    input.provider_number = input.provider_number.trim().toUpperCase()
  }

  // Validate AHPRA number if provided
  if (input.ahpra_number) {
    const ahpraValidation = validateAhpraNumber(input.ahpra_number)
    if (!ahpraValidation.valid) {
      return { success: false, error: ahpraValidation.error }
    }
    input.ahpra_number = input.ahpra_number.trim().toUpperCase()
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({
      nominals: input.nominals,
      provider_number: input.provider_number,
      ahpra_number: input.ahpra_number,
      signature_storage_path: input.signature_storage_path,
      updated_at: new Date().toISOString(),
    })
    .eq("id", profileId)
    .select(`
      id,
      full_name,
      nominals,
      provider_number,
      ahpra_number,
      signature_storage_path,
      certificate_identity_complete
    `)
    .single()

  if (error) {
    log.error("Failed to update doctor identity", { profileId }, error)
    return { success: false, error: error.message }
  }

  log.info("Doctor identity updated", { profileId })
  return { success: true, data: data as DoctorIdentity }
}

/**
 * Upload doctor signature image
 */
export async function uploadDoctorSignature(
  profileId: string,
  file: File
): Promise<{ success: boolean; path?: string; error?: string }> {
  const supabase = createServiceRoleClient()

  const fileExt = file.name.split(".").pop()?.toLowerCase() || "png"
  const allowedExts = ["png", "jpg", "jpeg"]

  if (!allowedExts.includes(fileExt)) {
    return { success: false, error: "Invalid file type. Allowed: PNG, JPG" }
  }

  // Max 1MB for signature images
  if (file.size > 1 * 1024 * 1024) {
    return { success: false, error: "File size must be under 1MB" }
  }

  const fileName = `signature-${profileId}-${Date.now()}.${fileExt}`
  const storagePath = `signatures/${fileName}`

  const { error } = await supabase.storage
    .from("documents")
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    })

  if (error) {
    log.error("Failed to upload signature", { profileId }, error)
    return { success: false, error: error.message }
  }

  log.info("Signature uploaded", { path: storagePath, profileId })
  return { success: true, path: storagePath }
}

/**
 * Get signature URL
 */
export async function getSignatureUrl(storagePath: string): Promise<string | null> {
  if (!storagePath) return null

  const supabase = createServiceRoleClient()

  const { data } = supabase.storage
    .from("documents")
    .getPublicUrl(storagePath)

  return data?.publicUrl || null
}

/**
 * Check if a doctor can issue certificates
 * Returns true if provider_number and ahpra_number are set
 */
export async function canDoctorIssueCertificates(profileId: string): Promise<boolean> {
  const identity = await getDoctorIdentity(profileId)
  return isDoctorIdentityComplete(identity)
}
