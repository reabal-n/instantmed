import "server-only"

import { createLogger } from "@/lib/observability/logger"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const logger = createLogger("email-suppression")

/**
 * Batch suppression check for marketing sends to bare email addresses
 * (recipients who may have no profile, e.g. partial-intake drafts).
 *
 * An address is suppressed when either:
 *  1. it is on the email_suppressions list (account-less unsubscribe via the
 *     email-keyed token), or
 *  2. a profile with that email has opted out of marketing in
 *     email_preferences — an existing patient who unsubscribed must not be
 *     reachable again just because they started a fresh draft.
 *
 * Fails CLOSED on query errors: a suppression lookup failure treats every
 * address in that batch as suppressed. Missing one send is recoverable;
 * emailing an opted-out person is a Spam Act breach.
 */
export async function getSuppressedEmails(emails: string[]): Promise<Set<string>> {
  const normalized = Array.from(new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean)))
  if (normalized.length === 0) return new Set()

  const supabase = createServiceRoleClient()
  const suppressed = new Set<string>()

  const { data: suppressions, error: suppressionError } = await supabase
    .from("email_suppressions")
    .select("email_lower")
    .in("email_lower", normalized)

  if (suppressionError) {
    logger.error("Suppression list lookup failed, failing closed", { error: suppressionError.message })
    return new Set(normalized)
  }
  for (const row of suppressions ?? []) suppressed.add(row.email_lower)

  // Profiles that match these addresses and have opted out of marketing.
  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id, email")
    .in("email", normalized)

  if (profileError) {
    logger.error("Profile lookup for suppression failed, failing closed", { error: profileError.message })
    return new Set(normalized)
  }

  const profileIdToEmail = new Map<string, string>()
  for (const p of profiles ?? []) {
    if (p.email) profileIdToEmail.set(p.id, p.email.trim().toLowerCase())
  }

  if (profileIdToEmail.size > 0) {
    const { data: prefs, error: prefsError } = await supabase
      .from("email_preferences")
      .select("profile_id, marketing_emails, abandoned_checkout_emails")
      .in("profile_id", Array.from(profileIdToEmail.keys()))

    if (prefsError) {
      logger.error("Email preferences lookup for suppression failed, failing closed", { error: prefsError.message })
      return new Set(normalized)
    }

    for (const pref of prefs ?? []) {
      if (!pref.marketing_emails || !pref.abandoned_checkout_emails) {
        const email = profileIdToEmail.get(pref.profile_id)
        if (email) suppressed.add(email)
      }
    }
  }

  return suppressed
}

/**
 * Add an address to the account-less suppression list (idempotent).
 */
export async function suppressEmail(email: string, reason = "unsubscribe_link"): Promise<boolean> {
  const supabase = createServiceRoleClient()
  const { error } = await supabase
    .from("email_suppressions")
    .upsert(
      { email_lower: email.trim().toLowerCase(), reason },
      { onConflict: "email_lower" },
    )

  if (error) {
    logger.error("Failed to write email suppression", { error: error.message })
    return false
  }
  return true
}
