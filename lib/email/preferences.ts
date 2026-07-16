import "server-only"

import { createServiceRoleClient } from "@/lib/supabase/service-role"

/**
 * Check if a patient has opted out of marketing emails.
 * Used before sending marketing emails like abandoned checkout, review requests, etc.
 *
 * Extracted from app/actions/email-preferences.ts so lib/email/ senders
 * can call it without crossing the lib/ -> app/ import boundary.
 */
export async function canSendMarketingEmail(profileId: string): Promise<boolean> {
  const serviceClient = createServiceRoleClient()

  const { data, error } = await serviceClient
    .from("email_preferences")
    .select("marketing_emails, abandoned_checkout_emails")
    .eq("profile_id", profileId)
    .maybeSingle()

  // Unreadable preferences fail closed — never send on an infra error.
  if (error) return false

  // Consent is ON by default (operator decision 2026-07-17): a missing row
  // means the patient never touched email settings, which is the schema
  // default (all flags true). Rows are created lazily by the settings UI and
  // the unsubscribe flow, so absence = "never opted out", not "never agreed".
  // Every optional send still passes the one-click unsubscribe and the
  // account-less email_suppressions list at dispatch time.
  if (!data) return true

  // Any explicit opt-out on a stored row silences all marketing sends.
  return data.marketing_emails === true && data.abandoned_checkout_emails === true
}
