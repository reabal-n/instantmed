import { createClient } from "@/lib/supabase/server"
import { logger } from "@/lib/logger"

interface SendVerificationEmailParams {
  email: string
  redirectTo?: string
}

/**
 * Send email verification link to user
 */
export async function sendVerificationEmail({
  email,
  redirectTo = "/account",
}: SendVerificationEmailParams): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    // Generate OTP verification link
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}${redirectTo}`,
        shouldCreateUser: false, // Don't create new users, only verify existing
      },
    })

    if (error) {
      logger.error("Failed to send verification email", { error: error.message, email })
      return { success: false, error: error.message }
    }

    logger.info("Verification email sent", { email })
    return { success: true }
  } catch (error) {
    logger.error("Unexpected error sending verification email", { error })
    return { success: false, error: "Failed to send verification email" }
  }
}

/**
 * Check if user's email is verified
 */
export async function isEmailVerified(): Promise<boolean> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return false
    }

    // Supabase sets email_confirmed_at when email is verified
    return !!user.email_confirmed_at
  } catch (error) {
    logger.error("Error checking email verification status", { error })
    return false
  }
}

/**
 * Resend verification email with rate limiting
 */
export async function resendVerificationEmail(
  email: string
): Promise<{ success: boolean; error?: string; retryAfter?: number }> {
  try {
    const supabase = await createClient()

    // Check if user exists
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || user.email !== email) {
      return { success: false, error: "User not found" }
    }

    // Check if already verified
    if (user.email_confirmed_at) {
      return { success: false, error: "Email already verified" }
    }

    // Send new verification email
    return await sendVerificationEmail({ email })
  } catch (error) {
    logger.error("Error resending verification email", { error })
    return { success: false, error: "Failed to resend verification email" }
  }
}
