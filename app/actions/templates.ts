"use server"

import { requireRoleOrNull } from "@/lib/auth"
import {
  getAllActiveTemplates,
} from "@/lib/data/certificate-templates"

/**
 * Get all active templates
 */
export async function getActiveTemplatesAction() {
  const user = await requireRoleOrNull(["doctor", "admin"])

  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  const templates = await getAllActiveTemplates()
  return { success: true, templates }
}

// Template editing functions removed — templates are static PDFs in /public/templates/
// Only read function (getActiveTemplatesAction) is retained.
