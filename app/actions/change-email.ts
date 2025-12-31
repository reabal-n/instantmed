"use server"
import { logger } from "@/lib/logger"

import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { getAuthenticatedUserWithProfile } from "@/lib/auth"

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

    // Check if email is already in use
    const adminClient = createServiceRoleClient()
    const { data: existingUsers } = await adminClient.auth.admin.listUsers()
    const emailInUse = existingUsers?.users.some(
      (u) => u.email?.toLowerCase() === newEmail.toLowerCase() && u.id !== authUser.user.id
    )

    if (emailInUse) {
      return { success: false, error: "This email address is already in use" }
    }

    // Use Supabase Auth to update email (sends verification to new email)
    const supabase = await createClient()
    const { error } = await supabase.auth.updateUser({
      email: newEmail,
    })

    if (error) {
      logger.error("[ChangeEmail] Error", { error: String(error) })
      if (error.message.includes("email")) {
        return { success: false, error: "Unable to update email. Please try again." }
      }
      return { success: false, error: error.message }
    }

    return {
      success: true,
      message: `A verification email has been sent to ${newEmail}. Please click the link to confirm your new email address.`,
    }
  } catch (error) {
    logger.error("[ChangeEmail] Unexpected error", { error: String(error) })
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
    const { error } = await supabase.auth.resend({
      type: "email_change",
      email: authUser.user.email!,
    })

    if (error) {
      return { success: false, error: error.message }
    }

    return {
      success: true,
      message: "Verification email resent. Please check your inbox.",
    }
  } catch (error) {
    logger.error("[ResendVerification] Error", { error: String(error) })
    return { success: false, error: "Failed to resend verification email" }
  }
}
