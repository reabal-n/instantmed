"use server"

import { revalidatePath } from "next/cache"

import { withServerAction } from "@/lib/actions/with-server-action"
import { getApiAuth } from "@/lib/auth/helpers"
import { createLogger } from "@/lib/observability/logger"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import type { ActionResult } from "@/types/shared"

const logger = createLogger("email-preferences")

export interface EmailPreferences {
  id: string
  profile_id: string
  marketing_emails: boolean
  abandoned_checkout_emails: boolean
  transactional_emails: boolean
  unsubscribed_at: string | null
  unsubscribe_reason: string | null
  created_at: string
  updated_at: string
}

/**
 * Get email preferences for the current user.
 * Not wrapped -- getter with non-ActionResult return type.
 */
export async function getEmailPreferences(): Promise<EmailPreferences | null> {
  const authResult = await getApiAuth()
  if (!authResult) return null

  const { profile } = authResult

  // Get or create preferences using service role
  const serviceClient = createServiceRoleClient()
  const { data, error } = await serviceClient
    .rpc("get_or_create_email_preferences", { p_profile_id: profile.id })

  if (error) {
    logger.error("Failed to get email preferences", { error: error.message })
    return null
  }

  return data as EmailPreferences
}

type UpdateEmailPrefsInput = Partial<Pick<EmailPreferences, "marketing_emails" | "abandoned_checkout_emails">>

export const updateEmailPreferences = withServerAction<UpdateEmailPrefsInput>(
  { auth: "apiAuth", name: "update-email-preferences" },
  async (preferences, { supabase, profile, log }): Promise<ActionResult> => {
    // First ensure preferences exist
    await supabase.rpc("get_or_create_email_preferences", { p_profile_id: profile.id })

    // Update preferences
    const { error } = await supabase
      .from("email_preferences")
      .update({
        ...preferences,
        updated_at: new Date().toISOString(),
      })
      .eq("profile_id", profile.id)

    if (error) {
      log.error("Failed to update email preferences", { error: error.message })
      return { success: false, error: "Failed to update preferences" }
    }

    log.info("Updated email preferences", { profileId: profile.id, preferences })
    revalidatePath("/patient/settings")

    return { success: true }
  }
)

export async function unsubscribeFromMarketing(
  reason?: string
): Promise<ActionResult> {
  const result = await updateEmailPreferences({
    marketing_emails: false,
    abandoned_checkout_emails: false,
  })

  if (result.success && reason) {
    const authResult = await getApiAuth()

    if (authResult) {
      const serviceClient = createServiceRoleClient()
      await serviceClient
        .from("email_preferences")
        .update({
          unsubscribed_at: new Date().toISOString(),
          unsubscribe_reason: reason,
        })
        .eq("profile_id", authResult.profile.id)
    }
  }

  return result
}

/**
 * Check if a patient has opted out of marketing emails.
 * Re-exported from lib/email/preferences.ts (canonical location).
 */
export { canSendMarketingEmail } from "@/lib/email/preferences"
