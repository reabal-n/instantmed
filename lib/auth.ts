/**
 * Authentication helpers using Clerk
 * 
 * This module provides authentication utilities that work with Clerk.
 * It maintains backward compatibility with the previous Supabase auth API.
 */

import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import type { Profile } from "@/types/db"

// Backward-compatible type that works with existing code
export interface AuthenticatedUser {
  user: {
    id: string
    email?: string | null
    // Backward-compatible user_metadata for existing code that relied on Supabase
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
  const user = await currentUser()
  
  if (!user) {
    return null
  }

  const supabase = await createClient()
  
  // Try to find profile by clerk_user_id first, then fall back to email
  let profile: Profile | null = null
  
  const { data: clerkProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("clerk_user_id", user.id)
    .single()
  
  if (clerkProfile) {
    profile = clerkProfile as Profile
  } else {
    // Fallback: try to find by email (for migrated users)
    const email = user.emailAddresses[0]?.emailAddress
    if (email) {
      const { data: emailProfile } = await supabase
        .from("profiles")
        .select("*")
        .eq("email", email)
        .single()
      
      if (emailProfile) {
        // Update the profile with clerk_user_id for future lookups
        await supabase
          .from("profiles")
          .update({ clerk_user_id: user.id })
          .eq("id", emailProfile.id)
        
        profile = emailProfile as Profile
      }
    }
  }

  if (!profile) {
    return null
  }

  return {
    user: {
      id: user.id,
      email: user.emailAddresses[0]?.emailAddress ?? null,
      // Populate user_metadata from profile for backward compatibility
      user_metadata: {
        full_name: profile.full_name ?? undefined,
        date_of_birth: profile.date_of_birth ?? undefined,
      },
    },
    profile,
  }
}

/**
 * Get authenticated user, creating a profile if one doesn't exist.
 * Used for onboarding and first-time user flows.
 */
export async function getOrCreateAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  const user = await currentUser()
  
  if (!user) {
    return null
  }

  const supabase = await createClient()
  const email = user.emailAddresses[0]?.emailAddress
  
  // Try to find existing profile
  let { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("clerk_user_id", user.id)
    .single()
  
  if (!profile && email) {
    // Try by email
    const { data: emailProfile } = await supabase
      .from("profiles")
      .select("*")
      .eq("email", email)
      .single()
    
    if (emailProfile) {
      // Update existing profile with clerk_user_id
      await supabase
        .from("profiles")
        .update({ clerk_user_id: user.id })
        .eq("id", emailProfile.id)
      profile = emailProfile
    }
  }
  
  // Create new profile if none exists
  if (!profile) {
    const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || null
    
    const { data: newProfile, error } = await supabase
      .from("profiles")
      .insert({
        clerk_user_id: user.id,
        email: email,
        full_name: fullName,
        avatar_url: user.imageUrl || null,
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
  const user = await currentUser()
  if (!user) return null
  
  // Build full name from Clerk user data
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || undefined
  
  return {
    id: user.id,
    email: user.emailAddresses[0]?.emailAddress ?? null,
    user_metadata: {
      full_name: fullName,
    },
  }
}

/**
 * Get a user's profile by their Clerk user ID
 */
export async function getUserProfile(clerkUserId: string): Promise<Profile | null> {
  const supabase = await createClient()
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
 * Note: Clerk handles sign out via the UserButton or SignOutButton components
 */
export async function signOut() {
  redirect("/")
}

/**
 * Get the Clerk auth state (userId, sessionId, etc.)
 * Use this for lightweight auth checks without profile data
 */
export async function getClerkAuth() {
  return await auth()
}

/**
 * Get authenticated user for API routes.
 * Returns the Clerk user ID and profile, or null if not authenticated.
 */
export async function getApiAuth(): Promise<{ userId: string; profile: Profile } | null> {
  const { userId } = await auth()
  
  if (!userId) {
    return null
  }

  const supabase = await createClient()
  
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
