"use server"

import { auth, getAuthenticatedUserWithProfile } from "@/lib/auth"
import { createLogger } from "@/lib/observability/logger"

const logger = createLogger("resend-verification")

interface ResendVerificationResult {
  success: boolean
  error?: string
}

/**
 * Resend email verification link to the current user
 * Now handled by Clerk - email verification is automatic
 */
export async function resendVerificationEmail(): Promise<ResendVerificationResult> {
  try {
    const { userId } = await auth()

    if (!userId) {
      return { success: false, error: "Not authenticated" }
    }

    // Email verification is handled automatically by Clerk
    // Users can manage verification via Clerk Account Portal
    logger.info("Email verification requested - handled by Clerk", { userId })
    
    return { 
      success: false, 
      error: "Email verification is managed through your account settings. Please check your inbox or visit the account portal." 
    }
  } catch (error) {
    logger.error("Unexpected error resending verification", {}, error instanceof Error ? error : new Error(String(error)))
    return { success: false, error: "Something went wrong. Try again?" }
  }
}

/**
 * Check if the current user's email is verified
 * With Clerk, email verification status comes from Clerk user object
 */
export async function checkEmailVerified(): Promise<{ verified: boolean; email?: string }> {
  try {
    const authUser = await getAuthenticatedUserWithProfile()

    if (!authUser) {
      return { verified: false }
    }

    // Clerk handles email verification - if user is authenticated, email is verified
    // Clerk requires email verification before completing sign-up by default
    return {
      verified: true,
      email: authUser.user.email || undefined,
    }
  } catch {
    return { verified: false }
  }
}
