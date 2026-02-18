/**
 * Certificate Templates Data Layer
 * Versioned, immutable template configurations
 */

import "server-only"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import type {
  CertificateTemplate,
  CertificateTemplateWithCreator,
  TemplateConfig,
  TemplateType,
} from "@/types/certificate-template"
import { createLogger } from "@/lib/observability/logger"

// Re-export types and helpers from shared module (for backward compatibility)
export { getTemplateTypeName } from "@/lib/data/types/certificate-templates"

const log = createLogger("certificate-templates")

/**
 * Get the active template for a given type
 */
export async function getActiveTemplate(
  templateType: TemplateType
): Promise<CertificateTemplate | null> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from("certificate_templates")
    .select("id, template_type, version, name, config, is_active, activated_at, activated_by, created_at, created_by")
    .eq("template_type", templateType)
    .eq("is_active", true)
    .maybeSingle()

  if (error) {
    log.error("Failed to fetch active template", { templateType }, error)
    return null
  }

  return data as CertificateTemplate | null
}

/**
 * Get active templates for all types
 */
export async function getAllActiveTemplates(): Promise<CertificateTemplate[]> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from("certificate_templates")
    .select("id, template_type, version, name, config, is_active, activated_at, activated_by, created_at, created_by")
    .eq("is_active", true)
    .order("template_type")

  if (error) {
    log.error("Failed to fetch all active templates", {}, error)
    return []
  }

  return data as CertificateTemplate[]
}

/**
 * Get template by ID
 */
export async function getTemplateById(
  id: string
): Promise<CertificateTemplateWithCreator | null> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from("certificate_templates")
    .select(`
      id, template_type, version, name, config, is_active, activated_at, activated_by, created_at, created_by,
      creator:profiles!created_by(full_name),
      activator:profiles!activated_by(full_name)
    `)
    .eq("id", id)
    .single()

  if (error) {
    log.error("Failed to fetch template by ID", { id }, error)
    return null
  }

  return data as unknown as CertificateTemplateWithCreator
}

/**
 * Get version history for a template type
 */
export async function getTemplateVersionHistory(
  templateType: TemplateType,
  limit: number = 10
): Promise<CertificateTemplateWithCreator[]> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from("certificate_templates")
    .select(`
      id, template_type, version, name, config, is_active, activated_at, activated_by, created_at, created_by,
      creator:profiles!created_by(full_name),
      activator:profiles!activated_by(full_name)
    `)
    .eq("template_type", templateType)
    .order("version", { ascending: false })
    .limit(limit)

  if (error) {
    log.error("Failed to fetch template version history", { templateType }, error)
    return []
  }

  return data as unknown as CertificateTemplateWithCreator[]
}

/**
 * Get the latest version number for a template type
 */
export async function getLatestVersionNumber(
  templateType: TemplateType
): Promise<number> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from("certificate_templates")
    .select("version")
    .eq("template_type", templateType)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) {
    return 0
  }

  return data.version
}

/**
 * Create a new template version and set it active
 * This is the only way to modify templates - always creates new version
 */
export async function createTemplateVersion(
  templateType: TemplateType,
  config: TemplateConfig,
  name: string,
  actorId: string
): Promise<{ success: boolean; template?: CertificateTemplate; error?: string }> {
  const supabase = createServiceRoleClient()

  try {
    // Get next version number
    const latestVersion = await getLatestVersionNumber(templateType)
    const newVersion = latestVersion + 1

    // Deactivate current active template for this type
    await supabase
      .from("certificate_templates")
      .update({ is_active: false })
      .eq("template_type", templateType)
      .eq("is_active", true)

    // Insert new version as active
    const { data, error } = await supabase
      .from("certificate_templates")
      .insert({
        template_type: templateType,
        version: newVersion,
        name,
        config,
        is_active: true,
        activated_at: new Date().toISOString(),
        activated_by: actorId,
        created_by: actorId,
      })
      .select("id, template_type, version, name, config, is_active, created_at")
      .single()

    if (error) {
      log.error("Failed to create template version", { templateType, newVersion }, error)
      return { success: false, error: error.message }
    }

    log.info("Template version created", {
      templateType,
      version: newVersion,
      id: data.id,
      actorId,
    })

    return { success: true, template: data as CertificateTemplate }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    log.error("Unexpected error creating template version", {}, err)
    return { success: false, error: message }
  }
}

/**
 * Activate a specific template version (rollback capability)
 */
export async function activateTemplateVersion(
  templateId: string,
  actorId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceRoleClient()

  try {
    // Get the template to activate
    const { data: template, error: fetchError } = await supabase
      .from("certificate_templates")
      .select("template_type")
      .eq("id", templateId)
      .single()

    if (fetchError || !template) {
      return { success: false, error: "Template not found" }
    }

    // Deactivate current active template for this type
    await supabase
      .from("certificate_templates")
      .update({ is_active: false })
      .eq("template_type", template.template_type)
      .eq("is_active", true)

    // Activate the specified version
    const { error } = await supabase
      .from("certificate_templates")
      .update({
        is_active: true,
        activated_at: new Date().toISOString(),
        activated_by: actorId,
      })
      .eq("id", templateId)

    if (error) {
      log.error("Failed to activate template version", { templateId }, error)
      return { success: false, error: error.message }
    }

    log.info("Template version activated", { templateId, actorId })
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    log.error("Unexpected error activating template version", {}, err)
    return { success: false, error: message }
  }
}

// Helper getTemplateTypeName is now exported from @/lib/data/types/certificate-templates
