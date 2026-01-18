"use server"

import { createClient } from "@/lib/supabase/server"
import { createLogger } from "@/lib/observability/logger"

const logger = createLogger("resend-verification")

interface ResendVerificationResult {
  success: boolean
  error?: string
}

/**
 * Resend email verification link to the current user
 * Used in the email verification gate before document delivery
 */
export async function resendVerificationEmail(): Promise<ResendVerificationResult> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "Not authenticated" }
    }

    if (!user.email) {
      return { success: false, error: "No email associated with account" }
    }

    // Check if already verified
    if (user.email_confirmed_at) {
      return { success: false, error: "Email already verified" }
    }

    // Resend verification email via Supabase
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: user.email,
    })

    if (error) {
      logger.error("Failed to resend verification email", { userId: user.id }, error)
      
      // Handle rate limiting
      if (error.message?.includes("rate")) {
        return { success: false, error: "Please wait a minute before requesting another email" }
      }
      
      return { success: false, error: "Failed to send verification email" }
    }

    logger.info("Verification email resent", { userId: user.id, email: user.email })
    return { success: true }
  } catch (error) {
    logger.error("Unexpected error resending verification", {}, error instanceof Error ? error : new Error(String(error)))
    return { success: false, error: "Something went wrong. Try again?" }
  }
}

/**
 * Check if the current user's email is verified
 */
export async function checkEmailVerified(): Promise<{ verified: boolean; email?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { verified: false }
    }

    return {
      verified: !!user.email_confirmed_at,
      email: user.email || undefined,
    }
  } catch {
    return { verified: false }
  }
}
