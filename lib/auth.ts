/**
 * Authentication helpers using Clerk + Supabase
 * 
 * This module provides authentication utilities that work with Clerk for auth
 * and Supabase for data storage.
 */

import { redirect } from "next/navigation"
import { auth as clerkAuth, currentUser } from "@clerk/nextjs/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import type { Profile } from "@/types/db"

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

  const primaryEmail = user.emailAddresses.find(
    e => e.id === user.primaryEmailAddressId
  )?.emailAddress

  const supabase = createServiceRoleClient()
  
  // Try to find existing profile
  let { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("clerk_user_id", userId)
    .single()
  
  // Create new profile if none exists
  if (!profile) {
    const fullName = user.fullName || [user.firstName, user.lastName].filter(Boolean).join(' ') || null
    
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
    
    if (error || !newProfile) {
      return null
    }
    
    profile = newProfile
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
 * Require authentication with a specific role.
 * Redirects to sign-in if not authenticated, or appropriate dashboard if wrong role.
 */
export async function requireAuth(
  requiredRole: "patient" | "doctor",
  options?: { allowIncompleteOnboarding?: boolean },
): Promise<AuthenticatedUser> {
  const authUser = await getAuthenticatedUserWithProfile()

  if (!authUser) {
    redirect("/sign-in")
  }

  // Admin role has access to doctor pages
  const effectiveRole = authUser.profile.role === "admin" ? "doctor" : authUser.profile.role
  
  if (effectiveRole !== requiredRole) {
    // Redirect to the correct dashboard based on role
    if (authUser.profile.role === "patient") {
      redirect("/patient")
    } else if (authUser.profile.role === "doctor" || authUser.profile.role === "admin") {
      redirect("/doctor")
    } else {
      redirect("/sign-in")
    }
  }

  // Check onboarding for patients (unless explicitly allowed)
  if (requiredRole === "patient" && !options?.allowIncompleteOnboarding && !authUser.profile.onboarding_completed) {
    redirect("/patient/onboarding")
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
  return requireAuth("patient", options)
}

/**
 * Sign out - redirects to home page
 */
export async function signOut() {
  redirect("/")
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
