"use server"

import { getApiAuth } from "@/lib/auth"
import { sendViaResend } from "@/lib/email/resend"
import { 
  getAllPreviewTemplates,
  getPreviewTemplateSampleData,
  renderPreviewTemplate,
} from "@/lib/email/admin-preview"
// import { getPreviewTemplate, getPreviewTemplateTags } from "@/lib/email/admin-preview"
import { createLogger } from "@/lib/observability/logger"

const logger = createLogger("admin-email-preview")

interface AdminEmailPreviewResult {
  success: boolean
  error?: string
}

/**
 * Send a test email using admin preview templates
 */
export async function sendAdminTestEmailAction(
  templateSlug: string,
  testEmail: string,
  customData?: Record<string, string>
): Promise<AdminEmailPreviewResult> {
  // Auth check - admin only
  const authResult = await getApiAuth()
  if (!authResult || authResult.profile.role !== "admin") {
    return { success: false, error: "Unauthorized" }
  }

  // Validate email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(testEmail)) {
    return { success: false, error: "Invalid email address" }
  }

  try {
    // Render template to HTML
    const { subject, html, error } = renderPreviewTemplate(
      templateSlug,
      customData,
      { isTest: true }
    )

    if (error) {
      return { success: false, error }
    }

    // Send via Resend
    const result = await sendViaResend({
      to: testEmail,
      subject,
      html,
      tags: [
        { name: "type", value: "test" },
        { name: "template", value: templateSlug },
        { name: "renderer", value: "admin-preview" },
      ],
    })

    if (result.success) {
      logger.info("Admin test email sent", {
        templateSlug,
        testEmail: testEmail.replace(/(.{2}).*@/, "$1***@"),
        adminId: authResult.userId,
      })
      return { success: true }
    } else {
      return { success: false, error: result.error || "Failed to send email" }
    }
  } catch (error) {
    logger.error("Failed to send admin test email", { error, templateSlug })
    return { success: false, error: "Failed to send test email" }
  }
}

/**
 * Get available admin email templates
 */
export async function getAdminEmailTemplatesAction(): Promise<{
  success: boolean
  templates?: Array<{ slug: string; name: string; availableTags: string[] }>
  error?: string
}> {
  // Auth check - admin only
  const authResult = await getApiAuth()
  if (!authResult || authResult.profile.role !== "admin") {
    return { success: false, error: "Unauthorized" }
  }

  try {
    const templates = getAllPreviewTemplates().map(({ slug, name, availableTags }) => ({
      slug,
      name,
      availableTags,
    }))

    return { success: true, templates }
  } catch (error) {
    logger.error("Failed to get admin email templates", { error })
    return { success: false, error: "Failed to load templates" }
  }
}

/**
 * Get sample data for a template
 */
export async function getAdminTemplateSampleDataAction(
  templateSlug: string
): Promise<{
  success: boolean
  sampleData?: Record<string, string>
  error?: string
}> {
  // Auth check - admin only
  const authResult = await getApiAuth()
  if (!authResult || authResult.profile.role !== "admin") {
    return { success: false, error: "Unauthorized" }
  }

  try {
    const sampleData = getPreviewTemplateSampleData(templateSlug)

    return { success: true, sampleData }
  } catch (error) {
    logger.error("Failed to get template sample data", { error, templateSlug })
    return { success: false, error: "Failed to load sample data" }
  }
}

/**
 * Preview a template as HTML
 */
export async function previewAdminEmailTemplateAction(
  templateSlug: string,
  customData?: Record<string, string>
): Promise<{
  success: boolean
  html?: string
  subject?: string
  error?: string
}> {
  // Auth check - admin only
  const authResult = await getApiAuth()
  if (!authResult || authResult.profile.role !== "admin") {
    return { success: false, error: "Unauthorized" }
  }

  try {
    const { subject, html, error } = renderPreviewTemplate(
      templateSlug,
      customData,
      { isTest: false }
    )

    if (error) {
      return { success: false, error }
    }

    return { success: true, html, subject }
  } catch (error) {
    logger.error("Failed to preview admin email template", { error, templateSlug })
    return { success: false, error: "Failed to preview template" }
  }
}
