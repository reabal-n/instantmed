import { createLogger } from "@/lib/observability/logger"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const logger = createLogger("email-verification")

/**
 * Email Verification Utilities
 * 
 * Supabase Auth handles email verification during signup.
 * These utilities sync verification status to the profiles table
 * for guest profile linking security.
 */

/**
 * Mark a profile as email-verified
 * Called when a user authenticates with Supabase Auth (email is verified by Auth)
 */
export async function markProfileEmailVerified(
  profileId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createServiceRoleClient()
    
    const { error } = await supabase
      .from("profiles")
      .update({
        email_verified: true,
        email_verified_at: new Date().toISOString(),
      })
      .eq("id", profileId)
    
    if (error) {
      logger.error("Failed to mark profile email verified", { profileId }, error)
      return { success: false, error: error.message }
    }
    
    logger.info("Profile email marked as verified", { profileId })
    return { success: true }
  } catch (err) {
    logger.error("Error marking profile email verified", { profileId }, err instanceof Error ? err : new Error(String(err)))
    return { success: false, error: "Internal error" }
  }
}

/**
 * Check if a profile has verified email
 */
export async function checkProfileEmailVerified(
  profileId: string
): Promise<boolean> {
  try {
    const supabase = createServiceRoleClient()
    
    const { data, error } = await supabase
      .from("profiles")
      .select("email_verified")
      .eq("id", profileId)
      .single()
    
    if (error || !data) {
      return false
    }
    
    return data.email_verified === true
  } catch {
    return false
  }
}

