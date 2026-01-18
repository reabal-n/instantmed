"use server"
import { createLogger } from "@/lib/observability/logger"
import { getAuthenticatedUserWithProfile } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"

const log = createLogger("change-email")

interface ChangeEmailResult {
  success: boolean
  error?: string
  message?: string
}

export async function requestEmailChangeAction(newEmail: string): Promise<ChangeEmailResult> {
  try {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(newEmail)) {
      return { success: false, error: "Please enter a valid email address" }
    }

    // Get authenticated user
    const authUser = await getAuthenticatedUserWithProfile()
    if (!authUser) {
      return { success: false, error: "You must be logged in to change your email" }
    }

    // Check if new email is same as current
    if (authUser.user.email?.toLowerCase() === newEmail.toLowerCase()) {
      return { success: false, error: "New email must be different from your current email" }
    }

    // Use Supabase Auth to update email (sends verification to new email)
    const supabase = await createClient()
    const { error: updateError } = await supabase.auth.updateUser({
      email: newEmail,
    })

    if (updateError) {
      log.error("Error updating email", { userId: authUser.user.id }, updateError)
      return { success: false, error: updateError.message || "Unable to update email. Please try again." }
    }

    // Note: We do NOT update the profiles table here.
    // The profile email should only be updated after the user verifies the new email.
    // This happens via Supabase auth webhook or when the user next signs in after verification.
    // Updating the profile email before verification would cause data inconsistency.

    return {
      success: true,
      message: `A verification email has been sent to ${newEmail}. Please click the link to confirm your new email address.`,
    }
  } catch (error) {
    log.error("Unexpected error changing email", {}, error)
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    }
  }
}

export async function resendEmailVerificationAction(): Promise<ChangeEmailResult> {
  try {
    const authUser = await getAuthenticatedUserWithProfile()
    if (!authUser) {
      return { success: false, error: "You must be logged in" }
    }

    const supabase = await createClient()
    
    // Trigger password reset which also verifies email
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: authUser.user.email!,
    })

    if (error) {
      log.error("Error resending verification", { userId: authUser.user.id }, error)
      return { success: false, error: "Failed to resend verification email" }
    }

    return {
      success: true,
      message: "Verification email resent. Please check your inbox.",
    }
  } catch (error) {
    log.error("Unexpected error resending verification", {}, error)
    return { success: false, error: "Failed to resend verification email" }
  }
}
