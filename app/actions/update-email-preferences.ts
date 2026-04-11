"use server"

import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { verifyUnsubscribeToken } from "@/lib/crypto/unsubscribe-token"
import { createLogger } from "@/lib/observability/logger"

const logger = createLogger("email-preferences-token")

interface UpdateResult {
  success: boolean
  error?: string
}

/**
 * Update email preferences using a signed unsubscribe token.
 * Works without authentication - used by the /email-preferences page.
 */
export async function updateEmailPreferencesWithToken(
  token: string,
  preferences: {
    marketing_emails: boolean
    abandoned_checkout_emails: boolean
  }
): Promise<UpdateResult> {
  // Re-verify token on every mutation (defense in depth)
  const result = verifyUnsubscribeToken(token)
  if (!result) {
    return { success: false, error: "Invalid or expired link. Please use the link from your most recent email." }
  }

  const { profileId } = result
  const supabase = createServiceRoleClient()

  // Verify profile exists
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", profileId)
    .single()

  if (!profile) {
    return { success: false, error: "Account not found." }
  }

  // Determine if this is an unsubscribe-all action
  const isUnsubscribeAll =
    !preferences.marketing_emails && !preferences.abandoned_checkout_emails

  const updatePayload: Record<string, boolean | string> = {
    marketing_emails: preferences.marketing_emails,
    abandoned_checkout_emails: preferences.abandoned_checkout_emails,
    updated_at: new Date().toISOString(),
  }

  if (isUnsubscribeAll) {
    updatePayload.unsubscribed_at = new Date().toISOString()
    updatePayload.unsubscribe_reason = "preference_center"
  }

  const { error } = await supabase
    .from("email_preferences")
    .upsert(
      {
        profile_id: profileId,
        ...updatePayload,
      },
      { onConflict: "profile_id" }
    )

  if (error) {
    logger.error("Failed to update email preferences via token", {
      profileId,
      error: error.message,
    })
    return { success: false, error: "Failed to save preferences. Please try again." }
  }

  logger.info("Updated email preferences via preference center", {
    profileId,
    marketing_emails: preferences.marketing_emails,
    abandoned_checkout_emails: preferences.abandoned_checkout_emails,
    isUnsubscribeAll,
  })

  return { success: true }
}
