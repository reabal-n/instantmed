"use server"

import { getAuthenticatedUserWithProfile } from "@/lib/auth"
import { sendViaResend } from "@/lib/email/resend"
import { getEmailTemplateBySlug } from "@/lib/data/email-templates"
import { createLogger } from "@/lib/observability/logger"

const logger = createLogger("send-test-email")

interface SendTestEmailResult {
  success: boolean
  error?: string
}

/**
 * Send a test email using a specific template
 * Admin-only action
 */
export async function sendTestEmailAction(
  templateSlug: string,
  testEmail: string
): Promise<SendTestEmailResult> {
  // Auth check - admin only
  const authUser = await getAuthenticatedUserWithProfile()
  if (!authUser || authUser.profile.role !== "admin") {
    return { success: false, error: "Unauthorized" }
  }

  // Validate email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(testEmail)) {
    return { success: false, error: "Invalid email address" }
  }

  // Get template
  const template = await getEmailTemplateBySlug(templateSlug)
  if (!template) {
    return { success: false, error: "Template not found" }
  }

  // Replace merge tags with sample data
  const sampleData: Record<string, string> = {
    patient_name: "Test Patient",
    certificate_link: "https://instantmed.com.au/verify/TEST123",
    certificate_id: "CERT-TEST-001234",
    service_name: "Medical Certificate",
    doctor_name: "Dr. Test Doctor",
    next_steps: "This is a test email. Your certificate would be ready to download.",
    decline_reason: "This is a test decline reason",
    recommendations: "Please visit your local GP for further assistance.",
    medication_name: "Test Medication 500mg",
    amount: "$29.00",
    refund_reason: "Test refund reason",
  }

  let subject = `[TEST] ${template.subject}`
  let body = template.body_html

  for (const tag of template.available_tags) {
    const value = sampleData[tag] || `[${tag}]`
    subject = subject.replace(new RegExp(`{{${tag}}}`, "g"), value)
    body = body.replace(new RegExp(`{{${tag}}}`, "g"), value)
  }

  // Add test banner to body
  const testBanner = `
    <div style="background-color: #f59e0b; color: white; padding: 12px; text-align: center; margin-bottom: 20px; font-weight: bold;">
      ⚠️ THIS IS A TEST EMAIL - Template: ${template.name}
    </div>
  `
  body = body.replace(/<body[^>]*>/i, (match) => `${match}${testBanner}`)

  try {
    const result = await sendViaResend({
      to: testEmail,
      subject,
      html: body,
      text: template.body_text || undefined,
      tags: [
        { name: "type", value: "test" },
        { name: "template", value: templateSlug },
      ],
    })

    if (result.success) {
      logger.info("Test email sent", {
        templateSlug,
        testEmail: testEmail.replace(/(.{2}).*@/, "$1***@"),
        adminId: authUser.user.id,
      })
      return { success: true }
    } else {
      return { success: false, error: result.error || "Failed to send email" }
    }
  } catch (error) {
    logger.error("Failed to send test email", { error, templateSlug })
    return { success: false, error: "Failed to send test email" }
  }
}
