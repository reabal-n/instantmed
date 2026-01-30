/**
 * Email utilities - bounce suppression, plain text generation, etc.
 */

import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createLogger } from "@/lib/observability/logger"

const logger = createLogger("email-utils")

/**
 * Check if an email address has bounced or complained recently
 * Used to prevent sending to addresses that will bounce (protects sender reputation)
 */
export async function isEmailSuppressed(email: string): Promise<boolean> {
  const supabase = createServiceRoleClient()
  
  const { data, error } = await supabase
    .from("email_outbox")
    .select("id, delivery_status")
    .eq("to_email", email)
    .in("delivery_status", ["bounced", "complained"])
    .limit(1)
    .maybeSingle()
  
  if (error) {
    logger.warn("Failed to check email suppression", { email: email.replace(/(.{2}).*@/, "$1***@"), error: error.message })
    return false // Don't block on error, but log it
  }
  
  return !!data
}

/**
 * Generate plain text from HTML email content
 * Simple implementation - strips tags and normalizes whitespace
 */
export function htmlToPlainText(html: string): string {
  return html
    // Remove style and script blocks entirely
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    // Replace common block elements with newlines
    .replace(/<\/?(div|p|h[1-6]|br|hr|li|tr)[^>]*>/gi, "\n")
    // Replace links with text + URL
    .replace(/<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/gi, "$2 ($1)")
    // Remove all remaining tags
    .replace(/<[^>]+>/g, "")
    // Decode common HTML entities
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    // Normalize whitespace
    .replace(/\n\s*\n\s*\n/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .trim()
}

/**
 * Sanitize email for logging (hide sensitive parts in production)
 */
export function sanitizeEmailForLog(email: string, isDev: boolean = false): string {
  if (isDev) return email
  const [local, domain] = email.split("@")
  if (!domain) return "[invalid-email]"
  return `${local.slice(0, 2)}***@${domain.slice(0, 3)}***.${domain.split(".").pop()}`
}

/**
 * Check if email has already been sent for this request/template combo today
 * Prevents duplicate sends from race conditions
 */
export async function isDuplicateEmail(
  requestId: string,
  templateType: string
): Promise<boolean> {
  const supabase = createServiceRoleClient()
  
  // Check for same email sent today
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const { data, error } = await supabase
    .from("email_outbox")
    .select("id")
    .eq("intake_id", requestId)
    .eq("email_type", templateType)
    .gte("created_at", today.toISOString())
    .limit(1)
    .maybeSingle()
  
  if (error) {
    logger.warn("Failed to check duplicate email", { requestId, templateType, error: error.message })
    return false // Don't block on error
  }
  
  return !!data
}
