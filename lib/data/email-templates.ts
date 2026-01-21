/**
 * Email Templates Data Layer
 * CRUD operations for editable email templates
 */

import "server-only"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createLogger } from "@/lib/observability/logger"

const log = createLogger("email-templates")

// ============================================================================
// TYPES
// ============================================================================

export interface EmailTemplate {
  id: string
  slug: string
  name: string
  description: string | null
  subject: string
  body_html: string
  body_text: string | null
  available_tags: string[]
  version: number
  is_active: boolean
  created_at: string
  updated_at: string
  created_by: string | null
  updated_by: string | null
}

export interface EmailTemplateInput {
  slug: string
  name: string
  description?: string | null
  subject: string
  body_html: string
  body_text?: string | null
  available_tags?: string[]
}

// ============================================================================
// READ OPERATIONS
// ============================================================================

/**
 * Get all email templates
 */
export async function getAllEmailTemplates(): Promise<EmailTemplate[]> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from("email_templates")
    .select("*")
    .order("name", { ascending: true })

  if (error) {
    log.error("Failed to fetch email templates", {}, error)
    return []
  }

  return data as EmailTemplate[]
}

/**
 * Get active email template by slug
 */
export async function getEmailTemplateBySlug(slug: string): Promise<EmailTemplate | null> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from("email_templates")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .single()

  if (error) {
    log.error("Failed to fetch email template", { slug }, error)
    return null
  }

  return data as EmailTemplate
}

/**
 * Get email template by ID
 */
export async function getEmailTemplateById(id: string): Promise<EmailTemplate | null> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from("email_templates")
    .select("*")
    .eq("id", id)
    .single()

  if (error) {
    log.error("Failed to fetch email template by ID", { id }, error)
    return null
  }

  return data as EmailTemplate
}

// ============================================================================
// WRITE OPERATIONS
// ============================================================================

/**
 * Create a new email template
 */
export async function createEmailTemplate(
  input: EmailTemplateInput,
  actorId: string
): Promise<{ success: boolean; data?: EmailTemplate; error?: string }> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from("email_templates")
    .insert({
      ...input,
      available_tags: input.available_tags || [],
      version: 1,
      is_active: true,
      created_by: actorId,
      updated_by: actorId,
    })
    .select()
    .single()

  if (error) {
    log.error("Failed to create email template", { slug: input.slug }, error)
    return { success: false, error: error.message }
  }

  log.info("Email template created", { id: data.id, slug: input.slug })
  return { success: true, data: data as EmailTemplate }
}

/**
 * Update an email template (creates new version)
 */
export async function updateEmailTemplate(
  id: string,
  input: Partial<EmailTemplateInput>,
  actorId: string
): Promise<{ success: boolean; data?: EmailTemplate; error?: string }> {
  const supabase = createServiceRoleClient()

  // Get current version
  const { data: current } = await supabase
    .from("email_templates")
    .select("version")
    .eq("id", id)
    .single()

  const { data, error } = await supabase
    .from("email_templates")
    .update({
      ...input,
      version: (current?.version || 0) + 1,
      updated_by: actorId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single()

  if (error) {
    log.error("Failed to update email template", { id }, error)
    return { success: false, error: error.message }
  }

  log.info("Email template updated", { id, version: data.version })
  return { success: true, data: data as EmailTemplate }
}

/**
 * Toggle email template active status
 */
export async function toggleEmailTemplateActive(
  id: string,
  isActive: boolean
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceRoleClient()

  const { error } = await supabase
    .from("email_templates")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", id)

  if (error) {
    log.error("Failed to toggle email template", { id, isActive }, error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

// ============================================================================
// TEMPLATE RENDERING
// ============================================================================

/**
 * Render an email template with merge tags
 */
export function renderEmailTemplate(
  template: EmailTemplate,
  data: Record<string, string>
): { subject: string; html: string; text: string | null } {
  let subject = template.subject
  let html = template.body_html
  let text = template.body_text

  // Replace merge tags
  for (const [key, value] of Object.entries(data)) {
    const tag = `{{${key}}}`
    subject = subject.replace(new RegExp(tag, "g"), value)
    html = html.replace(new RegExp(tag, "g"), value)
    if (text) {
      text = text.replace(new RegExp(tag, "g"), value)
    }
  }

  return { subject, html, text }
}
