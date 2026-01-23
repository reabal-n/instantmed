"use server"

/**
 * Admin Settings Server Actions
 * Handles clinic identity, doctor profiles, and service configuration
 */

import { revalidatePath } from "next/cache"
import { getAuthenticatedUserWithProfile } from "@/lib/auth"
import {
  getActiveClinicIdentity,
  getClinicIdentityHistory,
  saveClinicIdentity,
  uploadClinicLogo,
  getClinicLogoUrl,
} from "@/lib/data/clinic-identity"
import {
  getDoctorIdentity,
  updateDoctorIdentity,
  uploadDoctorSignature,
  getSignatureUrl,
} from "@/lib/data/doctor-identity"
import {
  getAllServices,
  getServiceById,
  createService,
  updateService,
  toggleServiceActive,
  updateServiceOrder,
  deleteService,
  type ServiceInput,
} from "@/lib/data/services"
import type { ClinicIdentityInput } from "@/types/certificate-template"
import type { DoctorIdentityInput } from "@/lib/data/doctor-identity.shared"
import { createLogger } from "@/lib/observability/logger"

const log = createLogger("admin-settings-actions")

// ============================================================================
// AUTH HELPER
// ============================================================================

async function requireAdmin() {
  const authUser = await getAuthenticatedUserWithProfile()
  if (!authUser || authUser.profile.role !== "admin") {
    throw new Error("Unauthorized: Admin access required")
  }
  return authUser.profile
}

// ============================================================================
// CLINIC IDENTITY ACTIONS
// ============================================================================

export async function getClinicIdentityAction() {
  await requireAdmin()
  return getActiveClinicIdentity()
}

export async function getClinicIdentityHistoryAction() {
  await requireAdmin()
  return getClinicIdentityHistory()
}

export async function saveClinicIdentityAction(input: ClinicIdentityInput) {
  const profile = await requireAdmin()

  const result = await saveClinicIdentity(input, profile.id)

  if (result.success) {
    revalidatePath("/admin/clinic")
    revalidatePath("/admin")
    log.info("Clinic identity updated by admin", { adminId: profile.id })
  }

  return result
}

export async function uploadClinicLogoAction(formData: FormData) {
  const profile = await requireAdmin()

  const file = formData.get("file") as File
  if (!file) {
    return { success: false, error: "No file provided" }
  }

  const result = await uploadClinicLogo(file, profile.id)

  if (result.success) {
    log.info("Clinic logo uploaded by admin", { adminId: profile.id, path: result.path })
  }

  return result
}

export async function getClinicLogoUrlAction(storagePath: string) {
  await requireAdmin()
  return getClinicLogoUrl(storagePath)
}

// ============================================================================
// DOCTOR IDENTITY ACTIONS
// ============================================================================

export async function getAllDoctorsAction() {
  const admin = await requireAdmin()

  const { createClient } = await import("@/lib/supabase/server")
  const supabase = await createClient()

  // P1 FIX: Audit log access to sensitive provider/AHPRA numbers
  log.info("Admin accessing doctor list with sensitive identifiers", {
    adminId: admin.id,
    adminEmail: admin.email,
    accessedFields: ["provider_number", "ahpra_number"],
  })

  const { data, error } = await supabase
    .from("profiles")
    .select(`
      id,
      full_name,
      email,
      role,
      provider_number,
      ahpra_number,
      created_at
    `)
    .in("role", ["doctor", "admin"])
    .order("full_name", { ascending: true })

  if (error) {
    log.error("Failed to fetch doctors", { adminId: admin.id }, error)
    return []
  }

  // P1 FIX: Log how many records were accessed
  log.info("Admin doctor list query completed", {
    adminId: admin.id,
    recordCount: data?.length || 0,
  })

  return data
}

export async function getDoctorIdentityAction(profileId: string) {
  await requireAdmin()
  return getDoctorIdentity(profileId)
}

export async function updateDoctorIdentityAction(
  profileId: string,
  input: DoctorIdentityInput
) {
  const admin = await requireAdmin()

  const result = await updateDoctorIdentity(profileId, input)

  if (result.success) {
    revalidatePath("/admin/doctors")
    revalidatePath("/admin")
    log.info("Doctor identity updated by admin", { adminId: admin.id, doctorId: profileId })
  }

  return result
}

export async function uploadDoctorSignatureAction(
  profileId: string,
  formData: FormData
) {
  const admin = await requireAdmin()

  const file = formData.get("file") as File
  if (!file) {
    return { success: false, error: "No file provided" }
  }

  const result = await uploadDoctorSignature(profileId, file)

  if (result.success) {
    log.info("Doctor signature uploaded by admin", {
      adminId: admin.id,
      doctorId: profileId,
      path: result.path,
    })
  }

  return result
}

export async function getSignatureUrlAction(storagePath: string) {
  await requireAdmin()
  return getSignatureUrl(storagePath)
}

// ============================================================================
// SERVICE CONFIGURATION ACTIONS
// ============================================================================

export async function getAllServicesAction() {
  await requireAdmin()
  return getAllServices()
}

export async function getServiceByIdAction(id: string) {
  await requireAdmin()
  return getServiceById(id)
}

export async function createServiceAction(input: ServiceInput) {
  const admin = await requireAdmin()

  const result = await createService(input)

  if (result.success) {
    revalidatePath("/admin/services")
    revalidatePath("/request")
    log.info("Service created by admin", { adminId: admin.id, slug: input.slug })
  }

  return result
}

export async function updateServiceAction(id: string, input: Partial<ServiceInput>) {
  const admin = await requireAdmin()

  const result = await updateService(id, input)

  if (result.success) {
    revalidatePath("/admin/services")
    revalidatePath("/request")
    log.info("Service updated by admin", { adminId: admin.id, serviceId: id })
  }

  return result
}

export async function toggleServiceActiveAction(id: string, isActive: boolean) {
  const admin = await requireAdmin()

  const result = await toggleServiceActive(id, isActive)

  if (result.success) {
    revalidatePath("/admin/services")
    revalidatePath("/request")
    log.info("Service toggled by admin", { adminId: admin.id, serviceId: id, isActive })
  }

  return result
}

export async function updateServiceOrderAction(orderedIds: string[]) {
  const admin = await requireAdmin()

  const result = await updateServiceOrder(orderedIds)

  if (result.success) {
    revalidatePath("/admin/services")
    revalidatePath("/request")
    log.info("Service order updated by admin", { adminId: admin.id })
  }

  return result
}

export async function deleteServiceAction(id: string) {
  const admin = await requireAdmin()

  const result = await deleteService(id)

  if (result.success) {
    revalidatePath("/admin/services")
    revalidatePath("/request")
    log.info("Service deleted by admin", { adminId: admin.id, serviceId: id })
  }

  return result
}
