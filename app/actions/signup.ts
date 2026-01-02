"use server"

import { logger } from "@/lib/logger"

/**
 * Server-side signup action.
 * 
 * NOTE: With Clerk migration, signup is now handled by Clerk's signUp flow.
 * This action is deprecated and will redirect to Clerk's sign-up page.
 * 
 * The profile creation is handled by the Clerk webhook when a user is created.
 */
export async function signupAction(
  email: string,
  _password: string,
  _options?: {
    fullName?: string
    dateOfBirth?: string
  }
): Promise<{ userId: string | null; profileId: string | null; error: string | null }> {
  // Log deprecation warning
  logger.warn("[Signup Action] This action is deprecated. Use Clerk sign-up flow instead.", { email })
  
  // Return error directing to Clerk
  return { 
    userId: null, 
    profileId: null, 
    error: "CLERK_SIGNUP_REQUIRED" 
  }
}
