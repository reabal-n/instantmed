"use server"
import { createLogger } from "@/lib/observability/logger"
import { getAuthenticatedUserWithProfile } from "@/lib/auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

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

    // Check if email is already in use via Clerk
    const client = await clerkClient()
    try {
      const existingUsers = await client.users.getUserList({ emailAddress: [newEmail] })
      const emailInUse = existingUsers.data.some((u) => u.id !== authUser.user.id)

      if (emailInUse) {
        return { success: false, error: "This email address is already in use" }
      }
    } catch (err) {
      log.warn("Error checking email availability", {}, err)
    }

    // Use Clerk to update email (sends verification to new email)
    try {
      await client.users.updateUser(authUser.user.id, {
        primaryEmailAddressID: newEmail,
      })
    } catch (error) {
      log.error("Error updating email", { userId: authUser.user.id }, error)
      return { success: false, error: "Unable to update email. Please try again." }
    }

    // Also update in profiles table
    const supabase = createServiceRoleClient()
    await supabase
      .from("profiles")
      .update({ email: newEmail })
      .eq("auth_user_id", authUser.user.id)

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

    const client = await clerkClient()
    try {
      // Clerk handles email verification automatically
      // Just need to trigger a new verification email via Clerk
      await client.emailAddresses.createEmailAddress({
        userId: authUser.user.id,
        emailAddress: authUser.user.email!,
      })

      return {
        success: true,
        message: "Verification email resent. Please check your inbox.",
      }
    } catch (error) {
      log.error("Error resending verification", { userId: authUser.user.id }, error)
      return { success: false, error: "Failed to resend verification email" }
    }
  } catch (error) {
    log.error("Unexpected error resending verification", {}, error)
    return { success: false, error: "Failed to resend verification email" }
  }
}
