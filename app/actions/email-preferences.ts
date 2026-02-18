"use server"

import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { getApiAuth } from "@/lib/auth"
import { createLogger } from "@/lib/observability/logger"
import { revalidatePath } from "next/cache"

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

export async function updateEmailPreferences(
  preferences: Partial<Pick<EmailPreferences, "marketing_emails" | "abandoned_checkout_emails">>
): Promise<{ success: boolean; error?: string }> {
  const authResult = await getApiAuth()
  if (!authResult) {
    return { success: false, error: "Not authenticated" }
  }

  const { profile } = authResult

  const serviceClient = createServiceRoleClient()

  // First ensure preferences exist
  await serviceClient.rpc("get_or_create_email_preferences", { p_profile_id: profile.id })

  // Update preferences
  const { error } = await serviceClient
    .from("email_preferences")
    .update({
      ...preferences,
      updated_at: new Date().toISOString(),
    })
    .eq("profile_id", profile.id)

  if (error) {
    logger.error("Failed to update email preferences", { error: error.message })
    return { success: false, error: "Failed to update preferences" }
  }

  logger.info("Updated email preferences", { profileId: profile.id, preferences })
  revalidatePath("/patient/settings")

  return { success: true }
}

export async function unsubscribeFromMarketing(
  reason?: string
): Promise<{ success: boolean; error?: string }> {
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
 * Check if a patient has opted out of marketing emails
 * Used before sending marketing emails like abandoned checkout
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
