/**
 * Certificate Templates Data Layer
 * Read-only — templates are static PDFs in /public/templates/
 */

import "server-only"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import type {
  CertificateTemplate,
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

// Template editing functions removed — templates are static PDFs in /public/templates/
// Only read functions (getActiveTemplate, getAllActiveTemplates) are retained.
// Helper getTemplateTypeName is now exported from @/lib/data/types/certificate-templates
