"use server"

import { revalidatePath } from "next/cache"
import { getAuthenticatedUserWithProfile } from "@/lib/auth"
import {
  getActiveClinicIdentity,
  saveClinicIdentity,
  uploadClinicLogo,
} from "@/lib/data/clinic-identity"
import {
  getActiveTemplate,
  getTemplateVersionHistory,
  createTemplateVersion,
} from "@/lib/data/certificate-templates"
import type {
  ClinicIdentity,
  ClinicIdentityInput,
  CertificateTemplate,
  CertificateTemplateWithCreator,
  TemplateConfig,
  TemplateType,
} from "@/types/certificate-template"
import { createLogger } from "@/lib/observability/logger"

const log = createLogger("template-studio-actions")

/**
 * Require admin authentication
 * Throws if not authenticated or not an admin
 */
async function requireAdminAuth() {
  const authUser = await getAuthenticatedUserWithProfile()
  
  if (!authUser) {
    throw new Error("Not authenticated")
  }
  
  if (authUser.profile.role !== "admin") {
    throw new Error("Admin access required")
  }
  
  return authUser
}

// ============================================================================
// LOAD TEMPLATE STUDIO DATA
// ============================================================================

export interface TemplateStudioData {
  clinicIdentity: ClinicIdentity | null
  activeTemplates: {
    work: CertificateTemplate | null
    uni: CertificateTemplate | null
    carer: CertificateTemplate | null
  }
  versionHistory: {
    work: CertificateTemplateWithCreator[]
    uni: CertificateTemplateWithCreator[]
    carer: CertificateTemplateWithCreator[]
  }
}

export async function loadTemplateStudioData(): Promise<{
  success: boolean
  data?: TemplateStudioData
  error?: string
}> {
  try {
    await requireAdminAuth()

    const [clinicIdentity, workTemplate, uniTemplate, carerTemplate] = await Promise.all([
      getActiveClinicIdentity(),
      getActiveTemplate("med_cert_work"),
      getActiveTemplate("med_cert_uni"),
      getActiveTemplate("med_cert_carer"),
    ])

    const [workHistory, uniHistory, carerHistory] = await Promise.all([
      getTemplateVersionHistory("med_cert_work", 5),
      getTemplateVersionHistory("med_cert_uni", 5),
      getTemplateVersionHistory("med_cert_carer", 5),
    ])

    return {
      success: true,
      data: {
        clinicIdentity,
        activeTemplates: {
          work: workTemplate,
          uni: uniTemplate,
          carer: carerTemplate,
        },
        versionHistory: {
          work: workHistory,
          uni: uniHistory,
          carer: carerHistory,
        },
      },
    }
  } catch (error) {
    log.error("Failed to load template studio data", {}, error instanceof Error ? error : undefined)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load data",
    }
  }
}

// ============================================================================
// SAVE CLINIC IDENTITY
// ============================================================================

export async function saveClinicIdentityAction(
  input: ClinicIdentityInput
): Promise<{ success: boolean; data?: ClinicIdentity; error?: string }> {
  try {
    const { profile } = await requireAdminAuth()

    const result = await saveClinicIdentity(input, profile.id)

    if (result.success) {
      revalidatePath("/admin/settings/templates")
      log.info("Clinic identity saved by admin", { adminId: profile.id })
    }

    return result
  } catch (error) {
    log.error("Failed to save clinic identity", {}, error instanceof Error ? error : undefined)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save",
    }
  }
}

// ============================================================================
// UPLOAD CLINIC LOGO
// ============================================================================

export async function uploadClinicLogoAction(
  formData: FormData
): Promise<{ success: boolean; path?: string; error?: string }> {
  try {
    const { profile } = await requireAdminAuth()

    const file = formData.get("logo") as File | null
    if (!file) {
      return { success: false, error: "No file provided" }
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      return { success: false, error: "File size must be under 2MB" }
    }

    const result = await uploadClinicLogo(file, profile.id)

    if (result.success) {
      log.info("Clinic logo uploaded", { path: result.path, adminId: profile.id })
    }

    return result
  } catch (error) {
    log.error("Failed to upload clinic logo", {}, error instanceof Error ? error : undefined)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Upload failed",
    }
  }
}

// ============================================================================
// SAVE TEMPLATE (Creates new version)
// ============================================================================

export async function saveTemplateAction(
  templateType: TemplateType,
  config: TemplateConfig,
  versionName?: string
): Promise<{ success: boolean; template?: CertificateTemplate; error?: string }> {
  try {
    const { profile } = await requireAdminAuth()

    // Generate version name if not provided
    const name = versionName || `${getTemplateTypeShortName(templateType)} v${Date.now()}`

    const result = await createTemplateVersion(templateType, config, name, profile.id)

    if (result.success) {
      revalidatePath("/admin/settings/templates")
      log.info("Template version created", {
        templateType,
        version: result.template?.version,
        adminId: profile.id,
      })
    }

    return result
  } catch (error) {
    log.error("Failed to save template", {}, error instanceof Error ? error : undefined)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save template",
    }
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function getTemplateTypeShortName(type: TemplateType): string {
  const names: Record<TemplateType, string> = {
    med_cert_work: "Work Cert",
    med_cert_uni: "Uni Cert",
    med_cert_carer: "Carer Cert",
  }
  return names[type] || type
}
