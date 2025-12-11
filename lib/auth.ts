import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import type { Profile } from "@/types/db"
import type { User } from "@supabase/supabase-js"

export interface AuthenticatedUser {
  user: User
  profile: Profile
}

/**
 * Get the authenticated user and their profile.
 * Returns null if not authenticated or profile doesn't exist.
 */
export async function getAuthenticatedUserWithProfile(): Promise<AuthenticatedUser | null> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return null
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("auth_user_id", user.id)
    .single()

  if (profileError || !profile) {
    return null
  }

  return { user, profile: profile as Profile }
}

/**
 * Require authentication with a specific role.
 * Redirects to login if not authenticated, or appropriate dashboard if wrong role.
 */
export async function requireAuth(
  requiredRole: "patient" | "doctor",
  options?: { allowIncompleteOnboarding?: boolean },
): Promise<AuthenticatedUser> {
  const authUser = await getAuthenticatedUserWithProfile()

  if (!authUser) {
    redirect("/auth/login")
  }

  if (authUser.profile.role !== requiredRole) {
    // Redirect to the correct dashboard based on role
    if (authUser.profile.role === "patient") {
      redirect("/patient")
    } else if (authUser.profile.role === "doctor") {
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
 * Sign out the current user
 */
export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/")
}

export async function getOptionalAuth(): Promise<AuthenticatedUser | null> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return null
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("auth_user_id", user.id)
    .single()

  if (profileError || !profile) {
    return null
  }

  return { user, profile: profile as Profile }
}

/**
 * Get the current authenticated user (without profile)
 */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) return null
  return user
}

/**
 * Get a user's profile by their auth user ID
 */
export async function getUserProfile(authUserId: string): Promise<Profile | null> {
  const supabase = await createClient()
  const { data: profile, error } = await supabase.from("profiles").select("*").eq("auth_user_id", authUserId).single()
  if (error || !profile) return null
  return profile as Profile
}

export async function checkOnboardingRequired(authUser: AuthenticatedUser): Promise<boolean> {
  return authUser.profile.role === "patient" && !authUser.profile.onboarding_completed
}

export async function requirePatientAuth(options?: {
  allowIncompleteOnboarding?: boolean
}): Promise<AuthenticatedUser> {
  return requireAuth("patient", options)
}
