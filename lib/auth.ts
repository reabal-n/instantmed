/**
 * Authentication helpers using Supabase
 * 
 * This module provides authentication utilities that work with Supabase Auth.
 */

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
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
  const supabase = await createClient()
  
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    return null
  }

  // Find profile by auth_user_id
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("auth_user_id", user.id)
    .single()

  if (!profile) {
    return null
  }

  return {
    user: {
      id: user.id,
      email: user.email ?? null,
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
  const supabase = await createClient()
  
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    return null
  }

  const email = user.email
  
  // Try to find existing profile
  let { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("auth_user_id", user.id)
    .single()
  
  // Create new profile if none exists
  if (!profile) {
    const fullName = user.user_metadata?.full_name || user.user_metadata?.name || null
    
    const { data: newProfile, error } = await supabase
      .from("profiles")
      .insert({
        auth_user_id: user.id,
        email: email,
        full_name: fullName,
        avatar_url: user.user_metadata?.avatar_url || null,
        role: "patient",
        onboarding_completed: false,
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
      id: user.id,
      email: email ?? null,
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
    redirect("/auth/login")
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
      redirect("/auth/login")
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
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) return null
  
  return {
    id: user.id,
    email: user.email ?? null,
    user_metadata: {
      full_name: user.user_metadata?.full_name || user.user_metadata?.name,
    },
  }
}

/**
 * Get a user's profile by their Supabase auth user ID
 */
export async function getUserProfile(authUserId: string): Promise<Profile | null> {
  const supabase = await createClient()
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("auth_user_id", authUserId)
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
 * Get the Supabase auth state (user, session)
 * Use this for lightweight auth checks without profile data
 */
export async function getSupabaseAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: { session } } = await supabase.auth.getSession()
  return { user, session, userId: user?.id ?? null }
}

/**
 * Clerk-compatible auth() function for server components/actions.
 * Returns { userId } to match Clerk's pattern.
 */
export async function auth(): Promise<{ userId: string | null; redirectToSignIn: () => never }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return { 
    userId: user?.id ?? null,
    redirectToSignIn: () => redirect("/auth/login") as never
  }
}

/**
 * Get authenticated user for API routes.
 * Returns the user ID and profile, or null if not authenticated.
 */
export async function getApiAuth(): Promise<{ userId: string; profile: Profile } | null> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    return null
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("auth_user_id", user.id)
    .single()
  
  if (!profile) {
    return null
  }

  return { userId: user.id, profile: profile as Profile }
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
