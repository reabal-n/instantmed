"use server"

import { revalidatePath } from "next/cache"
import { getAuthenticatedUserWithProfile } from "@/lib/auth"
import {
  getDoctorIdentity,
  updateDoctorIdentity,
  uploadDoctorSignature,
  validateProviderNumber,
  validateAhpraNumber,
  type DoctorIdentity,
  type DoctorIdentityInput,
} from "@/lib/data/doctor-identity"
import { createLogger } from "@/lib/observability/logger"

const log = createLogger("doctor-identity-actions")

/**
 * Require doctor authentication
 */
async function requireDoctorAuth() {
  const authUser = await getAuthenticatedUserWithProfile()

  if (!authUser) {
    throw new Error("Not authenticated")
  }

  if (authUser.profile.role !== "doctor" && authUser.profile.role !== "admin") {
    throw new Error("Doctor access required")
  }

  return authUser
}

// ============================================================================
// LOAD DOCTOR IDENTITY
// ============================================================================

export async function loadDoctorIdentityAction(): Promise<{
  success: boolean
  data?: DoctorIdentity
  error?: string
}> {
  try {
    const { profile } = await requireDoctorAuth()

    const identity = await getDoctorIdentity(profile.id)

    if (!identity) {
      return { success: false, error: "Identity not found" }
    }

    return { success: true, data: identity }
  } catch (error) {
    log.error("Failed to load doctor identity", {}, error instanceof Error ? error : undefined)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load",
    }
  }
}

// ============================================================================
// SAVE DOCTOR IDENTITY
// ============================================================================

export async function saveDoctorIdentityAction(
  input: DoctorIdentityInput
): Promise<{ success: boolean; data?: DoctorIdentity; error?: string }> {
  try {
    const { profile } = await requireDoctorAuth()

    const result = await updateDoctorIdentity(profile.id, input)

    if (result.success) {
      revalidatePath("/doctor/settings/identity")
      revalidatePath("/doctor/dashboard")
      revalidatePath("/doctor/queue")
      log.info("Doctor identity saved", { doctorId: profile.id })
    }

    return result
  } catch (error) {
    log.error("Failed to save doctor identity", {}, error instanceof Error ? error : undefined)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save",
    }
  }
}

// ============================================================================
// UPLOAD SIGNATURE
// ============================================================================

export async function uploadSignatureAction(
  formData: FormData
): Promise<{ success: boolean; path?: string; error?: string }> {
  try {
    const { profile } = await requireDoctorAuth()

    const file = formData.get("signature") as File | null
    if (!file) {
      return { success: false, error: "No file provided" }
    }

    const result = await uploadDoctorSignature(profile.id, file)

    if (result.success && result.path) {
      // Update profile with new signature path
      await updateDoctorIdentity(profile.id, {
        signature_storage_path: result.path,
      })

      revalidatePath("/doctor/settings/identity")
      log.info("Signature uploaded and saved", { path: result.path, doctorId: profile.id })
    }

    return result
  } catch (error) {
    log.error("Failed to upload signature", {}, error instanceof Error ? error : undefined)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Upload failed",
    }
  }
}

// ============================================================================
// VALIDATION ACTIONS (for client-side use)
// ============================================================================

export async function validateProviderNumberAction(
  value: string
): Promise<{ valid: boolean; error?: string }> {
  return validateProviderNumber(value)
}

export async function validateAhpraNumberAction(
  value: string
): Promise<{ valid: boolean; error?: string }> {
  return validateAhpraNumber(value)
}

// ============================================================================
// CHECK CERTIFICATE IDENTITY STATUS
// ============================================================================

export async function checkCertificateIdentityStatus(): Promise<{
  complete: boolean
  missingFields: string[]
}> {
  try {
    const { profile } = await requireDoctorAuth()

    const identity = await getDoctorIdentity(profile.id)

    if (!identity) {
      return {
        complete: false,
        missingFields: ["Provider Number", "AHPRA Registration Number"],
      }
    }

    const missingFields: string[] = []

    if (!identity.provider_number || identity.provider_number.trim() === "") {
      missingFields.push("Provider Number")
    }

    if (!identity.ahpra_number || identity.ahpra_number.trim() === "") {
      missingFields.push("AHPRA Registration Number")
    }

    return {
      complete: missingFields.length === 0,
      missingFields,
    }
  } catch {
    return {
      complete: false,
      missingFields: ["Provider Number", "AHPRA Registration Number"],
    }
  }
}
