"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  const templates = await getAllActiveTemplates()
  return { success: true, templates }
}

/**
 * Get template version history
 */
export async function getTemplateHistoryAction(templateType: TemplateType) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  const versions = await getTemplateVersionHistory(templateType)
  return { success: true, versions }
}

/**
 * Get single template by ID
 */
export async function getTemplateAction(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  // Check admin role
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("auth_user_id", user.id)
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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  // Check admin role
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("auth_user_id", user.id)
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
