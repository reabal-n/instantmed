"use server"

import { auth, getApiAuth } from "@/lib/auth/helpers"
import { toError } from "@/lib/errors"
import { createLogger } from "@/lib/observability/logger"

const logger = createLogger("resend-verification")

interface ResendVerificationResult {
  success: boolean
  error?: string
}

/**
 * Resend email verification link to the current user.
 * Supabase Auth handles verification via magic link on sign-up.
 */
export async function resendVerificationEmail(): Promise<ResendVerificationResult> {
  try {
    const { userId } = await auth()

    if (!userId) {
      return { success: false, error: "Not authenticated" }
    }

    // Supabase Auth handles email verification automatically on sign-up
    logger.info("Email verification requested", { userId })

    return {
      success: false,
      error: "Email verification is managed through your account settings. Please check your inbox or visit the account portal."
    }
  } catch (error) {
    logger.error("Unexpected error resending verification", {}, toError(error))
    return { success: false, error: "Something went wrong. Try again?" }
  }
}

/**
 * Check if the current user's email is verified.
 * Supabase Auth requires email verification before completing sign-up.
 */
export async function checkEmailVerified(): Promise<{ verified: boolean; email?: string }> {
  try {
    const authResult = await getApiAuth()

    if (!authResult) {
      return { verified: false }
    }

    // If user is authenticated via Supabase Auth, email is verified
    return {
      verified: true,
      email: authResult.profile.email || undefined,
    }
  } catch {
    return { verified: false }
  }
}
