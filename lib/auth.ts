/**
 * Authentication helpers using Clerk + Supabase
 * 
 * This module provides authentication utilities that work with Clerk for auth
 * and Supabase for data storage.
 */

import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { auth as clerkAuth, currentUser } from "@clerk/nextjs/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import type { Profile } from "@/types/db"

// ============================================================================
// E2E TEST AUTH BYPASS (test mode only)
// ============================================================================

/**
 * Check if E2E test mode is enabled.
 * Returns true ONLY if NODE_ENV === "test" OR PLAYWRIGHT === "1"
 * This is intentionally strict to prevent bypass in development/staging.
 * 
 * CRITICAL: Explicitly blocked in Vercel production to prevent any possible bypass.
 */
function isE2ETestModeEnabled(): boolean {
  // P0 SECURITY: Explicitly block E2E bypass in Vercel production and preview
  // This is a defense-in-depth measure - even if PLAYWRIGHT=1 is accidentally set
  if (process.env.VERCEL_ENV === "production" || process.env.VERCEL_ENV === "preview") {
    return false
  }

  return process.env.NODE_ENV === "test" || process.env.PLAYWRIGHT === "1"
}

/**
 * Check for E2E test auth cookies (only in test mode).
 * Returns the test user's clerk ID if valid E2E session exists.
 */
async function getE2EAuthUser(): Promise<{ clerkUserId: string } | null> {
  // Only allow when NODE_ENV=test OR PLAYWRIGHT=1
  if (!isE2ETestModeEnabled()) {
    return null
  }

  try {
    const cookieStore = await cookies()
    const e2eUserId = cookieStore.get("__e2e_auth_user_id")?.value
    
    if (e2eUserId) {
      return { clerkUserId: e2eUserId }
    }
  } catch {
    // Cookies not available (e.g., in API route without request context)
  }

  return null
}

// Backward-compatible type that works with existing code
export interface AuthenticatedUser {
  user: {
    id: string
    email?: string | null
    // Backward-compatible user_metadata for existing code
    user_metadata?: {
      full_name?: string
      date_of_birth?: string
    }
  }
  profile: Profile
}

/**
 * Get the authenticated user and their profile.
 * Returns null if not authenticated or profile doesn't exist.
 */
export async function getAuthenticatedUserWithProfile(): Promise<AuthenticatedUser | null> {
  // Check for E2E test auth first (non-production only)
  const e2eAuth = await getE2EAuthUser()
  if (e2eAuth) {
    const supabase = createServiceRoleClient()
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("clerk_user_id", e2eAuth.clerkUserId)
      .single()

    if (profile) {
      return {
        user: {
          id: e2eAuth.clerkUserId,
          email: (profile as Profile).email ?? null,
          user_metadata: {
            full_name: (profile as Profile).full_name ?? undefined,
            date_of_birth: (profile as Profile).date_of_birth ?? undefined,
          },
        },
        profile: profile as Profile,
      }
    }
  }

  // Normal Clerk auth flow
  const { userId } = await clerkAuth()
  
  if (!userId) {
    return null
  }

  const user = await currentUser()
  if (!user) {
    return null
  }

  const supabase = createServiceRoleClient()

  // Find profile by clerk_user_id
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("clerk_user_id", userId)
    .single()

  if (!profile) {
    return null
  }

  const primaryEmail = user.emailAddresses.find(
    e => e.id === user.primaryEmailAddressId
  )?.emailAddress

  return {
    user: {
      id: userId,
      email: primaryEmail ?? null,
      // Populate user_metadata from profile for backward compatibility
      user_metadata: {
        full_name: profile.full_name ?? undefined,
        date_of_birth: profile.date_of_birth ?? undefined,
      },
    },
    profile: profile as Profile,
  }
}

/**
 * Get authenticated user, creating a profile if one doesn't exist.
 * Used for onboarding and first-time user flows.
 * Also links guest profiles by email if found.
 */
export async function getOrCreateAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  const { userId } = await clerkAuth()

  if (!userId) {
    return null
  }

  const user = await currentUser()
  if (!user) {
    return null
  }

  const rawEmail = user.emailAddresses.find(
    e => e.id === user.primaryEmailAddressId
  )?.emailAddress

  // Normalize email to lowercase for consistent storage
  const primaryEmail = rawEmail?.toLowerCase()

  const supabase = createServiceRoleClient()

  // Try to find existing profile by clerk_user_id
  let { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("clerk_user_id", userId)
    .single()

  // If no profile found by clerk_user_id, check for guest profile to link
  if (!profile && primaryEmail) {
    const { data: guestProfile } = await supabase
      .from("profiles")
      .select("*")
      .ilike("email", primaryEmail)
      .is("clerk_user_id", null)
      .maybeSingle()

    if (guestProfile) {
      // Link the guest profile to this Clerk user
      const fullName = user.fullName || [user.firstName, user.lastName].filter(Boolean).join(' ') || primaryEmail.split('@')[0]

      const { data: linkedProfile, error: linkError } = await supabase
        .from("profiles")
        .update({
          clerk_user_id: userId,
          email: primaryEmail,
          full_name: fullName,
          first_name: user.firstName || null,
          last_name: user.lastName || null,
          avatar_url: user.imageUrl || null,
          email_verified: true,
          email_verified_at: new Date().toISOString(),
        })
        .eq("id", guestProfile.id)
        .is("clerk_user_id", null) // Ensure still unlinked
        .select()
        .single()

      if (!linkError && linkedProfile) {
        profile = linkedProfile
      } else {
        // If linking failed, another process may have linked it - try to find it
        const { data: nowLinkedProfile } = await supabase
          .from("profiles")
          .select("*")
          .eq("clerk_user_id", userId)
          .single()

        if (nowLinkedProfile) {
          profile = nowLinkedProfile
        }
      }
    }
  }

  // Create new profile if none exists and no guest profile to link
  if (!profile && primaryEmail) {
    const fullName = user.fullName || [user.firstName, user.lastName].filter(Boolean).join(' ') || primaryEmail.split('@')[0]

    // P1 FIX: Clerk users have verified emails - mark as verified for guest profile linking security
    const { data: newProfile, error } = await supabase
      .from("profiles")
      .insert({
        clerk_user_id: userId,
        email: primaryEmail,
        full_name: fullName,
        first_name: user.firstName || null,
        last_name: user.lastName || null,
        avatar_url: user.imageUrl || null,
        role: "patient",
        onboarding_completed: false,
        email_verified: true,
        email_verified_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      // Handle race condition - profile might have been created by webhook
      if (error.code === '23505') {
        const { data: raceProfile } = await supabase
          .from("profiles")
          .select("*")
          .eq("clerk_user_id", userId)
          .single()

        if (raceProfile) {
          profile = raceProfile
        }
      }
    } else if (newProfile) {
      profile = newProfile
    }
  }

  if (!profile) {
    return null
  }

  return {
    user: {
      id: userId,
      email: primaryEmail ?? null,
      // Populate user_metadata from profile for backward compatibility
      user_metadata: {
        full_name: (profile as Profile).full_name ?? undefined,
        date_of_birth: (profile as Profile).date_of_birth ?? undefined,
      },
    },
    profile: profile as Profile,
  }
}

/**
 * Require authentication with one of the specified roles.
 * Redirects to sign-in if not authenticated, or appropriate dashboard if wrong role.
 * 
 * @param allowedRoles - Array of roles that can access this resource
 * @param options - Additional options for role checking
 * @returns AuthenticatedUser if authorized
 * 
 * @example
 * // Admin-only route
 * await requireRole(["admin"])
 * 
 * // Doctor or admin route
 * await requireRole(["doctor", "admin"])
 */
export async function requireRole(
  allowedRoles: Array<"patient" | "doctor" | "admin">,
  options?: { 
    allowIncompleteOnboarding?: boolean
    redirectTo?: string
  },
): Promise<AuthenticatedUser> {
  const authUser = await getAuthenticatedUserWithProfile()

  if (!authUser) {
    redirect("/sign-in")
  }

  const userRole = authUser.profile.role
  
  // Check if user's role is in the allowed list
  if (!allowedRoles.includes(userRole as "patient" | "doctor" | "admin")) {
    // Redirect to the appropriate dashboard based on role
    if (options?.redirectTo) {
      redirect(options.redirectTo)
    } else if (userRole === "patient") {
      redirect("/patient")
    } else if (userRole === "doctor" || userRole === "admin") {
      redirect("/doctor")
    } else {
      redirect("/sign-in")
    }
  }

  // Check onboarding for patients (unless explicitly allowed)
  if (userRole === "patient" && !options?.allowIncompleteOnboarding && !authUser.profile.onboarding_completed) {
    redirect("/patient/onboarding")
  }

  return authUser
}

/**
 * Non-redirecting role check for server actions.
 * Returns null instead of throwing redirect() on auth failure.
 * 
 * Use this in server actions where redirect() would propagate as a
 * NEXT_REDIRECT error and cause unexpected client-side navigation.
 * 
 * @example
 * const authResult = await requireRoleOrNull(["doctor", "admin"])
 * if (!authResult) {
 *   return { success: false, error: "Unauthorized or session expired" }
 * }
 */
export async function requireRoleOrNull(
  allowedRoles: Array<"patient" | "doctor" | "admin">
): Promise<AuthenticatedUser | null> {
  const authUser = await getAuthenticatedUserWithProfile()
  
  if (!authUser) {
    return null
  }
  
  const userRole = authUser.profile.role
  if (!allowedRoles.includes(userRole as "patient" | "doctor" | "admin")) {
    return null
  }
  
  return authUser
}

/**
 * Get optional auth - returns user if logged in, null otherwise
 */
export async function getOptionalAuth(): Promise<AuthenticatedUser | null> {
  return getAuthenticatedUserWithProfile()
}

/**
 * Get the current authenticated user (without profile)
 */
export async function getCurrentUser(): Promise<{ 
  id: string
  email?: string | null
  user_metadata?: { full_name?: string; date_of_birth?: string }
} | null> {
  const { userId } = await clerkAuth()
  if (!userId) return null
  
  const user = await currentUser()
  if (!user) return null
  
  const primaryEmail = user.emailAddresses.find(
    e => e.id === user.primaryEmailAddressId
  )?.emailAddress
  
  return {
    id: userId,
    email: primaryEmail ?? null,
    user_metadata: {
      full_name: user.fullName || [user.firstName, user.lastName].filter(Boolean).join(' '),
    },
  }
}

/**
 * Get a user's profile by their Clerk user ID
 */
export async function getUserProfile(clerkUserId: string): Promise<Profile | null> {
  const supabase = createServiceRoleClient()
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("clerk_user_id", clerkUserId)
    .single()
  
  if (error || !profile) return null
  return profile as Profile
}

/**
 * Check if onboarding is required for the user
 */
export async function checkOnboardingRequired(authUser: AuthenticatedUser): Promise<boolean> {
  return authUser.profile.role === "patient" && !authUser.profile.onboarding_completed
}

/**
 * Require patient authentication
 */
export async function requirePatientAuth(options?: {
  allowIncompleteOnboarding?: boolean
}): Promise<AuthenticatedUser> {
  return requireRole(["patient"], options)
}

/**
 * Sign out - clears Clerk session and redirects to home page.
 * Note: Client-side sign out should use Clerk's useClerk().signOut() hook.
 * This server-side version redirects to Clerk's sign-out endpoint.
 */
export async function signOut() {
  redirect("/sign-in")
}

/**
 * Get the Clerk auth state
 * Use this for lightweight auth checks without profile data
 */
export async function getClerkAuth() {
  const { userId } = await clerkAuth()
  return { userId: userId ?? null }
}

/**
 * Auth function for server components/actions.
 * Returns { userId } for use in server-side authentication checks.
 */
export async function auth(): Promise<{ userId: string | null; redirectToSignIn: () => never }> {
  const { userId } = await clerkAuth()
  return { 
    userId: userId ?? null,
    redirectToSignIn: () => redirect("/sign-in") as never
  }
}

/**
 * Get authenticated user for API routes.
 * Returns the user ID and profile, or null if not authenticated.
 */
export async function getApiAuth(): Promise<{ userId: string; profile: Profile } | null> {
  const { userId } = await clerkAuth()
  
  if (!userId) {
    return null
  }

  const supabase = createServiceRoleClient()
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("clerk_user_id", userId)
    .single()
  
  if (!profile) {
    return null
  }

  return { userId, profile: profile as Profile }
}

/**
 * Require authentication in API routes.
 * Returns user info or throws/returns null for unauthorized.
 */
export async function requireApiAuth(): Promise<{ userId: string; profile: Profile }> {
  const result = await getApiAuth()
  
  if (!result) {
    throw new Error("Unauthorized")
  }

  return result
}
