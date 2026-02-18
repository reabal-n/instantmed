/**
 * Clinic Identity Data Layer
 * CRUD operations for global clinic branding configuration
 */

import { createServiceRoleClient } from "@/lib/supabase/service-role"
import type { ClinicIdentity, ClinicIdentityInput } from "@/types/certificate-template"
import { createLogger } from "@/lib/observability/logger"

const log = createLogger("clinic-identity")

/**
 * Get the active clinic identity
 */
export async function getActiveClinicIdentity(): Promise<ClinicIdentity | null> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from("clinic_identity")
    .select("id, clinic_name, trading_name, address_line_1, address_line_2, suburb, state, postcode, abn, phone, email, logo_storage_path, footer_disclaimer, is_active, created_at, updated_at, created_by, updated_by")
    .eq("is_active", true)
    .maybeSingle()

  if (error) {
    log.error("Failed to fetch clinic identity", {}, error)
    return null
  }

  return data as ClinicIdentity | null
}

/**
 * Get clinic identity by ID (admin use)
 */
export async function getClinicIdentityById(id: string): Promise<ClinicIdentity | null> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from("clinic_identity")
    .select("id, clinic_name, trading_name, address_line_1, address_line_2, suburb, state, postcode, abn, phone, email, logo_storage_path, footer_disclaimer, is_active, created_at, updated_at, created_by, updated_by")
    .eq("id", id)
    .single()

  if (error) {
    log.error("Failed to fetch clinic identity by ID", { id }, error)
    return null
  }

  return data as ClinicIdentity
}

/**
 * Create or update clinic identity
 * Always deactivates old record and creates new one for audit trail
 */
export async function saveClinicIdentity(
  input: ClinicIdentityInput,
  actorId: string
): Promise<{ success: boolean; data?: ClinicIdentity; error?: string }> {
  const supabase = createServiceRoleClient()

  try {
    // Start by deactivating any existing active record
    await supabase
      .from("clinic_identity")
      .update({ is_active: false, updated_by: actorId })
      .eq("is_active", true)

    // Insert new active record
    const { data, error } = await supabase
      .from("clinic_identity")
      .insert({
        ...input,
        is_active: true,
        created_by: actorId,
        updated_by: actorId,
      })
      .select("id, created_at, updated_at")
      .single()

    if (error) {
      log.error("Failed to save clinic identity", {}, error)
      return { success: false, error: error.message }
    }

    log.info("Clinic identity saved", { id: data.id, actorId })
    return { success: true, data: data as ClinicIdentity }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    log.error("Unexpected error saving clinic identity", {}, err)
    return { success: false, error: message }
  }
}

/**
 * Get clinic identity history (all records, for audit)
 */
export async function getClinicIdentityHistory(): Promise<ClinicIdentity[]> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from("clinic_identity")
    .select("id, clinic_name, trading_name, address_line_1, address_line_2, suburb, state, postcode, abn, phone, email, logo_storage_path, footer_disclaimer, is_active, created_at, updated_at, created_by, updated_by")
    .order("created_at", { ascending: false })

  if (error) {
    log.error("Failed to fetch clinic identity history", {}, error)
    return []
  }

  return data as ClinicIdentity[]
}

/**
 * Upload clinic logo to storage
 */
export async function uploadClinicLogo(
  file: File,
  actorId: string
): Promise<{ success: boolean; path?: string; error?: string }> {
  const supabase = createServiceRoleClient()

  const fileExt = file.name.split(".").pop()?.toLowerCase() || "png"
  const allowedExts = ["png", "jpg", "jpeg", "svg"]
  
  if (!allowedExts.includes(fileExt)) {
    return { success: false, error: "Invalid file type. Allowed: PNG, JPG, SVG" }
  }

  const fileName = `clinic-logo-${Date.now()}.${fileExt}`
  const storagePath = `branding/${fileName}`

  // Convert File to Buffer for reliable server-side upload
  // File objects from FormData may lose their prototype chain during
  // Next.js server action serialization, causing Supabase upload failures
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const contentType = file.type || (fileExt === "png" ? "image/png" : fileExt === "svg" ? "image/svg+xml" : "image/jpeg")

  const { error } = await supabase.storage
    .from("documents")
    .upload(storagePath, buffer, {
      contentType,
      upsert: false,
    })

  if (error) {
    log.error("Failed to upload clinic logo", { actorId }, error)
    return { success: false, error: error.message }
  }

  log.info("Clinic logo uploaded", { path: storagePath, actorId })
  return { success: true, path: storagePath }
}

/**
 * Get signed URL for clinic logo
 * Uses signed URL since bucket is private (PHI exposure reduction)
 * 1 hour expiry is sufficient for PDF rendering operations
 */
export async function getClinicLogoUrl(storagePath: string): Promise<string | null> {
  if (!storagePath) return null
  
  const supabase = createServiceRoleClient()
  
  const { data, error } = await supabase.storage
    .from("documents")
    .createSignedUrl(storagePath, 60 * 60) // 1 hour expiry for PDF rendering

  if (error || !data?.signedUrl) {
    log.warn("Failed to get clinic logo signed URL", { storagePath, error: error?.message })
    return null
  }

  return data.signedUrl
}
