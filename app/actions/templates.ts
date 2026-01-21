"use server"

import { revalidatePath } from "next/cache"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { auth } from "@/lib/auth"
import {
  getAllActiveTemplates,
  getTemplateVersionHistory,
  getTemplateById,
  createTemplateVersion,
  activateTemplateVersion,
} from "@/lib/data/certificate-templates"
import type { TemplateConfig, TemplateType } from "@/types/certificate-template"

/**
 * Get all active templates
 */
export async function getActiveTemplatesAction() {
  const { userId } = await auth()
  
  if (!userId) {
    return { success: false, error: "Not authenticated" }
  }

  const templates = await getAllActiveTemplates()
  return { success: true, templates }
}

/**
 * Get template version history
 */
export async function getTemplateHistoryAction(templateType: TemplateType) {
  const { userId } = await auth()
  
  if (!userId) {
    return { success: false, error: "Not authenticated" }
  }

  const versions = await getTemplateVersionHistory(templateType)
  return { success: true, versions }
}

/**
 * Get single template by ID
 */
export async function getTemplateAction(id: string) {
  const { userId } = await auth()
  
  if (!userId) {
    return { success: false, error: "Not authenticated" }
  }

  const template = await getTemplateById(id)
  if (!template) {
    return { success: false, error: "Template not found" }
  }
  
  return { success: true, template }
}

/**
 * Save template (creates new version)
 */
export async function saveTemplateAction(
  templateType: TemplateType,
  config: TemplateConfig,
  name: string
) {
  const { userId } = await auth()
  
  if (!userId) {
    return { success: false, error: "Not authenticated" }
  }

  const supabase = createServiceRoleClient()

  // Check admin role
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("auth_user_id", userId)
    .single()

  if (!profile || profile.role !== "admin") {
    return { success: false, error: "Admin access required" }
  }

  const result = await createTemplateVersion(templateType, config, name, profile.id)
  
  if (result.success) {
    revalidatePath("/admin/studio")
  }

  return result
}

/**
 * Activate a specific template version (rollback)
 */
export async function activateTemplateAction(templateId: string) {
  const { userId } = await auth()
  
  if (!userId) {
    return { success: false, error: "Not authenticated" }
  }

  const supabase = createServiceRoleClient()

  // Check admin role
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("auth_user_id", userId)
    .single()

  if (!profile || profile.role !== "admin") {
    return { success: false, error: "Admin access required" }
  }

  const result = await activateTemplateVersion(templateId, profile.id)
  
  if (result.success) {
    revalidatePath("/admin/studio")
  }

  return result
}
