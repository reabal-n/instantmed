"use server"

import { auth } from "@/lib/auth"
import {
  getAllActiveTemplates,
} from "@/lib/data/certificate-templates"

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

// Template editing functions removed — templates are static PDFs in /public/templates/
// Only read function (getActiveTemplatesAction) is retained.
