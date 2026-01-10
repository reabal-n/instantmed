import { createLogger } from "@/lib/observability/logger"
const logger = createLogger("email-verification")

interface SendVerificationEmailParams {
  email: string
  redirectTo?: string
}

/**
 * Send email verification link to user
 * Note: With Supabase, email verification is handled automatically during signup.
 * This function is kept for backwards compatibility.
 */
export async function sendVerificationEmail({
  email,
}: SendVerificationEmailParams): Promise<{ success: boolean; error?: string }> {
  try {
    const { createClient } = await import("@/lib/supabase/server")
    const supabase = await createClient()
    
    // Resend verification email via Supabase
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
    })

    if (error) {
      logger.error("Error sending verification email", {}, error)
      return { success: false, error: "Failed to send verification email" }
    }

    logger.info("Email verification requested", { email })
    return { success: true }
  } catch (error) {
    logger.error("Unexpected error in email verification", {}, error instanceof Error ? error : new Error(String(error)))
    return { success: false, error: "Failed to send verification email" }
  }
}

/**
 * Check if user's email is verified
 */
export async function isEmailVerified(): Promise<boolean> {
  try {
    const { createClient } = await import("@/lib/supabase/server")
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return false
    }

    // Supabase verifies emails - check email_confirmed_at
    return !!user.email_confirmed_at
  } catch (error) {
    logger.error("Error checking email verification status", {}, error instanceof Error ? error : new Error(String(error)))
    return false
  }
}

/**
 * Resend verification email with rate limiting
 * Note: With Supabase, this sends a verification email
 */
export async function resendVerificationEmail(
  email: string
): Promise<{ success: boolean; error?: string; retryAfter?: number }> {
  try {
    const { createClient } = await import("@/lib/supabase/server")
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || user.email !== email) {
      return { success: false, error: "User not found" }
    }

    // Check if already verified
    if (user.email_confirmed_at) {
      return { success: false, error: "Email already verified" }
    }

    // Resend verification email via Supabase
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
    })

    if (error) {
      logger.error("Error resending verification email", {}, error)
      return { success: false, error: "Failed to resend verification email" }
    }

    logger.info("Verification email resend requested", { email })
    return { success: true }
  } catch (error) {
    logger.error("Error resending verification email", {}, error instanceof Error ? error : new Error(String(error)))
    return { success: false, error: "Failed to resend verification email" }
  }
}
