"use server"

import { sendViaResend } from "@/lib/email/resend"
import { logger } from "@/lib/observability/logger"
import { z } from "zod"

// ============================================
// CONTACT FORM SCHEMA
// ============================================

const contactFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email address"),
  subject: z.string().min(1, "Subject is required").max(200),
  message: z.string().min(10, "Message must be at least 10 characters").max(5000),
  reason: z.string().optional(),
})

export type ContactFormData = z.infer<typeof contactFormSchema>

interface ContactFormResult {
  success: boolean
  error?: string
}

// ============================================
// SUBMIT CONTACT FORM
// ============================================

/**
 * Submit a contact form inquiry
 * Sends email to support team via Resend
 */
export async function submitContactForm(formData: FormData): Promise<ContactFormResult> {
  try {
    // Parse and validate form data
    const rawData = {
      name: formData.get("name"),
      email: formData.get("email"),
      subject: formData.get("subject"),
      message: formData.get("message"),
      reason: formData.get("reason"),
    }

    const validationResult = contactFormSchema.safeParse(rawData)
    
    if (!validationResult.success) {
      const errorMessage = validationResult.error.issues[0]?.message || "Invalid form data"
      logger.warn("[Contact Form] Validation failed", { errors: validationResult.error.issues })
      return { success: false, error: errorMessage }
    }

    const { name, email, subject, message, reason } = validationResult.data

    // Build email HTML
    const reasonLabel = reason || "General Inquiry"
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a1a; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">
          New Contact Form Submission
        </h2>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 8px 0; color: #666; width: 120px;"><strong>Category:</strong></td>
            <td style="padding: 8px 0; color: #1a1a1a;">${reasonLabel}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;"><strong>Name:</strong></td>
            <td style="padding: 8px 0; color: #1a1a1a;">${escapeHtml(name)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;"><strong>Email:</strong></td>
            <td style="padding: 8px 0; color: #1a1a1a;">
              <a href="mailto:${escapeHtml(email)}" style="color: #2563eb;">${escapeHtml(email)}</a>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;"><strong>Subject:</strong></td>
            <td style="padding: 8px 0; color: #1a1a1a;">${escapeHtml(subject)}</td>
          </tr>
        </table>

        <div style="background: #f8f9fa; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0 0 8px 0; color: #666; font-size: 14px;"><strong>Message:</strong></p>
          <p style="margin: 0; color: #1a1a1a; white-space: pre-wrap;">${escapeHtml(message)}</p>
        </div>

        <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 20px 0;" />
        
        <p style="color: #999; font-size: 12px; margin: 0;">
          Sent from InstantMed contact form at ${new Date().toLocaleString("en-AU", { timeZone: "Australia/Sydney" })} AEST
        </p>
      </div>
    `

    // Send email to support
    const result = await sendViaResend({
      to: "support@instantmed.com.au",
      subject: `[Contact Form] ${subject}`,
      html,
      replyTo: email,
      tags: [
        { name: "category", value: "contact-form" },
        { name: "reason", value: reason || "general" },
      ],
    })

    if (!result.success) {
      logger.error("[Contact Form] Failed to send email", { error: result.error })
      return { success: false, error: "Failed to send message. Please try again." }
    }

    logger.info("[Contact Form] Successfully submitted", { 
      emailId: result.id,
      reason,
      subject,
    })

    return { success: true }
  } catch (error) {
    logger.error("[Contact Form] Unexpected error", { error })
    return { success: false, error: "An unexpected error occurred. Please try again." }
  }
}

// ============================================
// HELPERS
// ============================================

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}
