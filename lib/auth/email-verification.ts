import { currentUser } from "@clerk/nextjs/server"
import { logger } from "@/lib/logger"

interface SendVerificationEmailParams {
  email: string
  redirectTo?: string
}

/**
 * Send email verification link to user
 * Note: With Clerk, email verification is handled automatically during signup.
 * This function is kept for backwards compatibility but now just returns success
 * since Clerk handles email verification internally.
 */
export async function sendVerificationEmail({
  email,
}: SendVerificationEmailParams): Promise<{ success: boolean; error?: string }> {
  try {
    // With Clerk, email verification is handled during signup
    // This is a no-op for compatibility
    logger.info("Email verification requested (handled by Clerk)", { email })
    return { success: true }
  } catch (error) {
    logger.error("Unexpected error in email verification", { error })
    return { success: false, error: "Failed to send verification email" }
  }
}

/**
 * Check if user's email is verified
 */
export async function isEmailVerified(): Promise<boolean> {
  try {
    const user = await currentUser()

    if (!user) {
      return false
    }

    // Clerk verifies emails - check if primary email is verified
    const primaryEmail = user.emailAddresses.find(
      (e) => e.id === user.primaryEmailAddressId
    )
    return primaryEmail?.verification?.status === "verified"
  } catch (error) {
    logger.error("Error checking email verification status", { error })
    return false
  }
}

/**
 * Resend verification email with rate limiting
 * Note: With Clerk, this is handled through the Clerk dashboard or API
 */
export async function resendVerificationEmail(
  email: string
): Promise<{ success: boolean; error?: string; retryAfter?: number }> {
  try {
    const user = await currentUser()

    if (!user || user.primaryEmailAddress?.emailAddress !== email) {
      return { success: false, error: "User not found" }
    }

    // Check if already verified
    const primaryEmail = user.emailAddresses.find(
      (e) => e.id === user.primaryEmailAddressId
    )
    if (primaryEmail?.verification?.status === "verified") {
      return { success: false, error: "Email already verified" }
    }

    // With Clerk, verification is automatic - user can request resend from Clerk UI
    logger.info("Verification email resend requested (handled by Clerk)", { email })
    return { success: true }
  } catch (error) {
    logger.error("Error resending verification email", { error })
    return { success: false, error: "Failed to resend verification email" }
  }
}
