/**
 * Email utilities - bounce suppression, plain text generation, etc.
 */

import { createLogger } from "@/lib/observability/logger"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const logger = createLogger("email-utils")

export type EmailBounceSuppressionDecision =
  | { kind: "allowed" }
  | { kind: "policy_suppressed" }
  | {
      kind: "transiently_blocked"
      reason: "lookup_failed" | "soft_bounce_threshold"
    }

/**
 * Resolve provider delivery history without turning a read failure into
 * permanent suppression.
 *
 * Suppression rules:
 * - Complaint → always suppress (spam report = permanent)
 * - Hard bounce → suppress after 1 occurrence
 * - 3+ soft bounces in 24h → transient block
 * - Query failure → transient block
 */
export async function getEmailBounceSuppressionDecision(
  email: string,
): Promise<EmailBounceSuppressionDecision> {
  const supabase = createServiceRoleClient()

  try {
    // Check for complaint or hard bounce (permanent suppress)
    const { data: hardSuppress, error: hardError } = await supabase
      .from("email_outbox")
      .select("id")
      .eq("to_email", email)
      .or("delivery_status.eq.complained,and(delivery_status.eq.bounced,metadata->>bounce_type.eq.hard)")
      .limit(1)
      .maybeSingle()

    if (hardError) {
      logger.warn("Failed to check hard-bounce suppression", {
        email: email.replace(/(.{2}).*@/, "$1***@"),
        error: hardError.message,
      })
      return { kind: "transiently_blocked", reason: "lookup_failed" }
    }
    if (hardSuppress) return { kind: "policy_suppressed" }

    // Check for repeated soft bounces (3+ in last 24h = temporary suppress)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { count, error: softError } = await supabase
      .from("email_outbox")
      .select("id", { count: "exact", head: true })
      .eq("to_email", email)
      .eq("delivery_status", "bounced")
      .gte("created_at", oneDayAgo)

    if (softError) {
      logger.warn("Failed to check soft-bounce suppression", {
        email: email.replace(/(.{2}).*@/, "$1***@"),
        error: softError.message,
      })
      return { kind: "transiently_blocked", reason: "lookup_failed" }
    }
    if ((count || 0) >= 3) {
      return {
        kind: "transiently_blocked",
        reason: "soft_bounce_threshold",
      }
    }

    return { kind: "allowed" }
  } catch (error) {
    logger.warn("Failed to check email suppression", { email: email.replace(/(.{2}).*@/, "$1***@"), error })
    return { kind: "transiently_blocked", reason: "lookup_failed" }
  }
}

/**
 * Backward-compatible gate. Legacy transactional callers still suppress at
 * the soft-bounce threshold and fail open only for lookup failures.
 */
export async function isEmailSuppressed(email: string): Promise<boolean> {
  const decision = await getEmailBounceSuppressionDecision(email)
  return decision.kind === "policy_suppressed" ||
    (
      decision.kind === "transiently_blocked" &&
      decision.reason === "soft_bounce_threshold"
    )
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
    // Remove the hidden preview/preheader and its invisible padding. It helps
    // visual inbox clients but must not pollute the real text/plain part.
    .replace(/<div[^>]*style="[^"]*display:\s*none[^"]*"[^>]*>[\s\S]*?<\/div>/gi, "")
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
    .replace(/&#x([0-9a-f]+);/gi, (entity, hex: string) => {
      const codePoint = Number.parseInt(hex, 16)
      return codePoint <= 0x10ffff ? String.fromCodePoint(codePoint) : entity
    })
    .replace(/&#(\d+);/g, (entity, decimal: string) => {
      const codePoint = Number.parseInt(decimal, 10)
      return codePoint <= 0x10ffff ? String.fromCodePoint(codePoint) : entity
    })
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
