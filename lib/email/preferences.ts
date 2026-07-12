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

  // Marketing consent is explicit: missing or unreadable preferences fail closed.
  if (error || !data) return false

  return data.marketing_emails === true && data.abandoned_checkout_emails === true
}
