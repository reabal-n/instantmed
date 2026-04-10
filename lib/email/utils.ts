/**
 * Email utilities - bounce suppression, plain text generation, etc.
 */

import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createLogger } from "@/lib/observability/logger"

const logger = createLogger("email-utils")

/**
 * Check if an email address should be suppressed.
 *
 * Suppression rules:
 * - Complaint → always suppress (spam report = permanent)
 * - Hard bounce → suppress after 1 occurrence
 * - Soft bounce → suppress only if 3+ soft bounces in last 24 hours
 *                 (allows retry after transient mailbox-full etc.)
 */
export async function isEmailSuppressed(email: string): Promise<boolean> {
  const supabase = createServiceRoleClient()

  try {
    // Check for complaint or hard bounce (permanent suppress)
    const { data: hardSuppress } = await supabase
      .from("email_outbox")
      .select("id")
      .eq("to_email", email)
      .or("delivery_status.eq.complained,and(delivery_status.eq.bounced,metadata->>bounce_type.eq.hard)")
      .limit(1)
      .maybeSingle()

    if (hardSuppress) return true

    // Check for repeated soft bounces (3+ in last 24h = temporary suppress)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { count } = await supabase
      .from("email_outbox")
      .select("id", { count: "exact", head: true })
      .eq("to_email", email)
      .eq("delivery_status", "bounced")
      .gte("created_at", oneDayAgo)

    if ((count || 0) >= 3) return true

    return false
  } catch (error) {
    logger.warn("Failed to check email suppression", { email: email.replace(/(.{2}).*@/, "$1***@"), error })
    return false // Fail open
  }
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
