"use server"
import { createLogger } from "@/lib/observability/logger"
import { getAuthenticatedUserWithProfile } from "@/lib/auth"

const log = createLogger("change-email")

interface ChangeEmailResult {
  success: boolean
  error?: string
  message?: string
}

/**
 * Request email change - now handled by Clerk
 * Email management is done through Clerk's Account Portal
 */
export async function requestEmailChangeAction(_newEmail: string): Promise<ChangeEmailResult> {
  try {
    const authUser = await getAuthenticatedUserWithProfile()
    if (!authUser) {
      return { success: false, error: "You must be logged in to change your email" }
    }

    // Email changes are now handled by Clerk Account Portal
    // Users should visit: https://accounts.instantmed.com.au/user
    log.info("Email change requested - redirecting to Clerk", { userId: authUser.user.id })
    
    return {
      success: false,
      error: "Email changes are managed through your account settings. Please visit the account portal to update your email.",
    }
  } catch (error) {
    log.error("Unexpected error in email change request", {}, error)
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    }
  }
}

/**
 * Resend email verification - now handled by Clerk
 * Clerk automatically handles email verification
 */
export async function resendEmailVerificationAction(): Promise<ChangeEmailResult> {
  try {
    const authUser = await getAuthenticatedUserWithProfile()
    if (!authUser) {
      return { success: false, error: "You must be logged in" }
    }

    // Email verification is handled automatically by Clerk
    log.info("Email verification requested - handled by Clerk", { userId: authUser.user.id })
    
    return {
      success: false,
      error: "Email verification is managed through your account settings. Please visit the account portal.",
    }
  } catch (error) {
    log.error("Unexpected error resending verification", {}, error)
    return { success: false, error: "Failed to process request" }
  }
}
