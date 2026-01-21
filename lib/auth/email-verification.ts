import { createLogger } from "@/lib/observability/logger"
const logger = createLogger("email-verification")

/**
 * @deprecated Email verification is now handled by Clerk.
 * These functions are kept for backward compatibility but are no longer functional.
 * Clerk automatically handles email verification during signup.
 */

interface SendVerificationEmailParams {
  email: string
  redirectTo?: string
}

/**
 * @deprecated Clerk handles email verification automatically.
 * This function is kept for backward compatibility.
 */
export async function sendVerificationEmail({
  email,
}: SendVerificationEmailParams): Promise<{ success: boolean; error?: string }> {
  logger.info("sendVerificationEmail called - Clerk handles this automatically", { email })
  // Clerk handles email verification - this is a no-op
  return { success: true }
}

/**
 * @deprecated Clerk handles email verification.
 * All Clerk users have verified emails by default.
 */
export async function isEmailVerified(): Promise<boolean> {
  // Clerk requires email verification by default
  return true
}

/**
 * @deprecated Clerk handles email verification.
 * Users can resend verification from Clerk's Account Portal.
 */
export async function resendVerificationEmail(
  _email: string
): Promise<{ success: boolean; error?: string; retryAfter?: number }> {
  logger.info("resendVerificationEmail called - redirect user to Clerk Account Portal")
  // Clerk handles this - direct users to Account Portal
  return { 
    success: false, 
    error: "Please use the Account Portal to manage email verification" 
  }
}
