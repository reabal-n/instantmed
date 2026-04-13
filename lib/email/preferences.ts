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

  const { data } = await serviceClient
    .from("email_preferences")
    .select("marketing_emails, abandoned_checkout_emails")
    .eq("profile_id", profileId)
    .maybeSingle()

  // If no preferences exist, default to allowing marketing emails
  if (!data) return true

  return data.marketing_emails && data.abandoned_checkout_emails
}
