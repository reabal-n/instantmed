/**
 * Email utilities - bounce suppression, plain text generation, etc.
 */

import { createLogger } from "@/lib/observability/logger"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const logger = createLogger("email-utils")

function escapePostgrestLikePattern(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_")
}

function hasHardBounceMetadata(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return false
  const record = metadata as Record<string, unknown>
  const bounce = record.bounce && typeof record.bounce === "object" && !Array.isArray(record.bounce)
    ? record.bounce as Record<string, unknown>
    : null
  const values = [record.bounce_type, bounce?.type]
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim().toLowerCase())
  return values.some((value) => value === "hard" || value === "permanent")
}

type DeliveryOutcome = {
  id: string
  delivery_status: string | null
  metadata: unknown
  sent_at: string | null
  created_at: string
}

function countConsecutiveSoftBounces(outcomes: DeliveryOutcome[]): number {
  const orderedOutcomes = [...outcomes].sort((left, right) => {
    const leftAttempt = Date.parse(left.sent_at ?? left.created_at)
    const rightAttempt = Date.parse(right.sent_at ?? right.created_at)
    if (leftAttempt !== rightAttempt) return rightAttempt - leftAttempt
    const createdDifference = Date.parse(right.created_at) - Date.parse(left.created_at)
    return createdDifference || right.id.localeCompare(left.id)
  })

  let count = 0
  for (const outcome of orderedOutcomes) {
    if (outcome.delivery_status !== "bounced" || hasHardBounceMetadata(outcome.metadata)) break
    count += 1
  }
  return count
}

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
 * - Provider suppression → always suppress (address is on Resend's list)
 * - Hard bounce → suppress after 1 occurrence
 * - 3+ soft bounces in 24h → transient block
 * - Query failure → transient block
 */
export async function getEmailBounceSuppressionDecision(
  email: string,
): Promise<EmailBounceSuppressionDecision> {
  const supabase = createServiceRoleClient()
  const normalizedEmail = email.trim().toLowerCase()
  const exactAddressPattern = escapePostgrestLikePattern(normalizedEmail)

  try {
    // For a current patient address, the transactional webhook RPC owns the
    // deterministic message-attempt ordering and manual-clear semantics on the
    // profile. A sticky spam complaint remains policy suppression through the
    // preference row even if a later critical email happens to deliver.
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("id, email_bounced, email_delivery_failures")
      .eq("normalized_email", normalizedEmail)
      .eq("role", "patient")
      .is("merged_into_profile_id", null)
      .limit(100)

    if (profileError) {
      logger.warn("Failed to check profile bounce suppression", {
        email: email.replace(/(.{2}).*@/, "$1***@"),
        error: profileError.message,
      })
      return { kind: "transiently_blocked", reason: "lookup_failed" }
    }

    if (profiles && profiles.length > 0) {
      const profileIds = profiles.map((profile) => profile.id)
      const { data: addressPreferences, error: preferenceError } = await supabase
        .from("email_preferences")
        .select("profile_id, marketing_emails, abandoned_checkout_emails, unsubscribe_reason, unsubscribed_at, preferences_changed_at, updated_at")
        .in("profile_id", profileIds)
        .limit(100)

      if (preferenceError) {
        logger.warn("Failed to check complaint suppression", {
          email: email.replace(/(.{2}).*@/, "$1***@"),
          error: preferenceError.message,
        })
        return { kind: "transiently_blocked", reason: "lookup_failed" }
      }
      const complaintTimes = (addressPreferences ?? [])
        .filter((preference) => preference.unsubscribe_reason === "spam_complaint")
        .map((preference) => Date.parse(preference.preferences_changed_at ?? preference.unsubscribed_at ?? preference.updated_at))
      const explicitConsentTimes = (addressPreferences ?? [])
        .filter((preference) =>
          preference.unsubscribe_reason === null
          && preference.marketing_emails === true
          && preference.abandoned_checkout_emails === true
          && preference.preferences_changed_at != null,
        )
        .map((preference) => Date.parse(preference.preferences_changed_at))
      const latestComplaintAt = complaintTimes.length > 0
        ? Math.max(...complaintTimes.map((value) => Number.isFinite(value) ? value : Number.POSITIVE_INFINITY))
        : Number.NEGATIVE_INFINITY
      const latestExplicitConsentAt = explicitConsentTimes.length > 0
        ? Math.max(...explicitConsentTimes.filter(Number.isFinite))
        : Number.NEGATIVE_INFINITY
      const hasActiveComplaint = complaintTimes.length > 0
        && latestComplaintAt >= latestExplicitConsentAt

      if (profiles.some((profile) => profile.email_bounced) || hasActiveComplaint) {
        return { kind: "policy_suppressed" }
      }

      // The webhook transaction maintains the ordered soft-bounce suffix.
      // Only read the underlying attempts when the suffix reaches the policy
      // threshold, because the block expires after 24 hours even without a new
      // callback to rewrite the profile mirror.
      if (Math.max(...profiles.map((profile) => profile.email_delivery_failures ?? 0)) >= 3) {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        const { data: recentProfileOutcomes, error: recentProfileError } = await supabase
          .from("email_outbox")
          .select("id, delivery_status, metadata, sent_at, created_at")
          .in("patient_id", profileIds)
          .ilike("to_email", exactAddressPattern)
          .in("delivery_status", [
            "delivered",
            "opened",
            "clicked",
            "bounced",
            "complained",
            "failed",
            "suppressed",
          ])
          .gte("delivery_status_updated_at", oneDayAgo)
          .limit(100)

        if (recentProfileError) {
          return { kind: "transiently_blocked", reason: "lookup_failed" }
        }
        if (countConsecutiveSoftBounces(recentProfileOutcomes ?? []) >= 3) {
          return {
            kind: "transiently_blocked",
            reason: "soft_bounce_threshold",
          }
        }
      }

      return { kind: "allowed" }
    } else {
      // Profile-less recipients do not have the canonical address-state mirror.
      // Retain conservative permanent provider evidence for those uncommon
      // sends; patient addresses always take the ordered profile path above.
      const { data: hardSuppress, error: hardError } = await supabase
        .from("email_outbox")
        .select("id")
        .ilike("to_email", exactAddressPattern)
        .or([
          "delivery_status.eq.complained",
          "delivery_status.eq.suppressed",
          "and(delivery_status.eq.bounced,metadata->>bounce_type.ilike.hard)",
          "and(delivery_status.eq.bounced,metadata->bounce->>type.ilike.hard)",
          "and(delivery_status.eq.bounced,metadata->bounce->>type.ilike.permanent)",
        ].join(","))
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
    }

    // Profile-less recipients have no transactional consecutive-failure
    // mirror, so retain the bounded historical fallback for those addresses.
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: recentOutcomes, error: softError } = await supabase
      .from("email_outbox")
      .select("id, delivery_status, metadata, sent_at, created_at")
      .ilike("to_email", exactAddressPattern)
      .in("delivery_status", [
        "delivered",
        "opened",
        "clicked",
        "bounced",
        "complained",
        "failed",
        "suppressed",
      ])
      .gte("delivery_status_updated_at", oneDayAgo)
      .limit(100)

    if (softError) {
      logger.warn("Failed to check soft-bounce suppression", {
        email: email.replace(/(.{2}).*@/, "$1***@"),
        error: softError.message,
      })
      return { kind: "transiently_blocked", reason: "lookup_failed" }
    }
    if (countConsecutiveSoftBounces(recentOutcomes ?? []) >= 3) {
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
