/**
 * Doctor Identity Data Layer
 * CRUD operations for doctor certificate identity settings
 * 
 * NOTE: This module is server-only. For client components, import from
 * @/lib/data/doctor-identity.shared instead.
 */

import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createLogger } from "@/lib/observability/logger"

// Re-export shared types and validation for server-side consumers
export {
  type DoctorIdentity,
  type DoctorIdentityInput,
  validateProviderNumber,
  validateAhpraNumber,
  isDoctorIdentityComplete,
} from "./doctor-identity.shared"

import {
  type DoctorIdentity,
  type DoctorIdentityInput,
  validateProviderNumber,
  validateAhpraNumber,
  isDoctorIdentityComplete,
} from "./doctor-identity.shared"

const log = createLogger("doctor-identity")

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
