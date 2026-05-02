/**
 * Authentication helpers using Supabase Auth
 *
 * This module provides authentication utilities that work with Supabase Auth
 * for both authentication and data storage. All server-side auth flows go
 * through this module - it is the single chokepoint.
 *
 * All server-side auth flows go through Supabase Auth (supabase.auth.getUser()).
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { createLogger } from "@/lib/observability/logger"
import { decryptField } from "@/lib/security/encryption"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import type { Profile } from "@/types/db"
import { asProfile } from "@/types/db"

const log = createLogger("auth")

/** Escape ILIKE special characters to prevent wildcard injection */
function escapeIlike(input: string): string {
  return input.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_")
}

// ============================================================================
// PROFILE SELECT COLUMNS
// Explicit column list for all profile queries (avoids select("*"))
// ============================================================================
const PROFILE_COLUMNS = `
  id, auth_user_id, email, full_name, first_name, last_name,
  date_of_birth, date_of_birth_encrypted, role, sex, phone, phone_encrypted,
  address_line1, suburb, state, postcode,
  medicare_number, medicare_number_encrypted, medicare_irn, medicare_expiry,
  phi_encrypted_at,
  ahpra_number, ahpra_verified, ahpra_verified_at, ahpra_verified_by,
  ahpra_verification_notes, ahpra_next_review_at, provider_number, nominals,
  consent_myhr, onboarding_completed,
  account_closed_at, account_closure_reason,
  email_verified, email_verified_at, email_bounced, email_bounced_at,
  email_bounce_reason, email_delivery_failures,
  avatar_url, stripe_customer_id, parchment_patient_id, certificate_identity_complete,
  signature_storage_path, created_at, updated_at
` as const

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const AUTH_PROFILE_RETRY_DELAYS_MS = [150, 400]

async function wait(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

function decryptProfilePhiForAuth<T extends Record<string, unknown>>(profile: T): T {
  const decrypted: Record<string, unknown> = { ...profile }

  if (profile.medicare_number_encrypted) {
    try {
      decrypted.medicare_number = decryptField<string>(profile.medicare_number_encrypted as string)
    } catch (error) {
      log.error("Failed to decrypt auth profile Medicare field", {}, error)
      throw new Error("Failed to decrypt patient identity")
    }
  }

  if (profile.date_of_birth_encrypted) {
    try {
      decrypted.date_of_birth = decryptField<string>(profile.date_of_birth_encrypted as string)
    } catch (error) {
      log.error("Failed to decrypt auth profile DOB field", {}, error)
      throw new Error("Failed to decrypt patient identity")
    }
  }

  if (profile.phone_encrypted) {
    try {
      decrypted.phone = decryptField<string>(profile.phone_encrypted as string)
    } catch (error) {
      log.error("Failed to decrypt auth profile phone field", {}, error)
      throw new Error("Failed to decrypt patient identity")
    }
  }

  delete decrypted.medicare_number_encrypted
  delete decrypted.date_of_birth_encrypted
  delete decrypted.phone_encrypted

  return decrypted as T
}

function isClosedProfile(profile: Record<string, unknown> | Profile | null): boolean {
  const closedAt = profile?.account_closed_at
  return typeof closedAt === "string" && closedAt.length > 0
}

async function fetchProfileByColumn(
  supabase: SupabaseClient,
  column: "id" | "auth_user_id",
  value: string,
  source: string,
): Promise<Record<string, unknown> | null> {
  for (let attempt = 0; attempt <= AUTH_PROFILE_RETRY_DELAYS_MS.length; attempt += 1) {
    const { data, error } = await supabase
      .from("profiles")
      .select(PROFILE_COLUMNS)
      .eq(column, value)
      .maybeSingle()

    if (!error) {
      return data ? decryptProfilePhiForAuth(data as Record<string, unknown>) : null
    }

    if (attempt === AUTH_PROFILE_RETRY_DELAYS_MS.length) {
      log.error("Failed to fetch authenticated profile", {
        column,
        source,
        attempts: attempt + 1,
        code: error.code,
      }, error)
      return null
    }

    log.warn("Retrying authenticated profile fetch", {
      column,
      source,
      attempt: attempt + 1,
      code: error.code,
    }, error)
    await wait(AUTH_PROFILE_RETRY_DELAYS_MS[attempt])
  }

  return null
}

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
  const isE2ETest = process.env.PLAYWRIGHT === "1"
  if (!isE2ETest && (process.env.VERCEL_ENV === "production" || process.env.VERCEL_ENV === "preview")) {
    return false
  }

  return process.env.NODE_ENV === "test" || process.env.PLAYWRIGHT === "1"
}

/**
 * Check for E2E test auth cookies (only in test mode).
 * Returns the test user's auth_user_id (UUID) if valid E2E session exists.
 */
async function getE2EAuthUser(): Promise<{ userId: string } | null> {
  if (!isE2ETestModeEnabled()) {
    return null
  }

  try {
    const cookieStore = await cookies()
    const e2eUserId = cookieStore.get("__e2e_auth_user_id")?.value

    if (e2eUserId) {
      return { userId: e2eUserId }
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
    let profile: Record<string, unknown> | null = null

    if (UUID_RE.test(e2eAuth.userId)) {
      profile = await fetchProfileByColumn(
        supabase,
        "id",
        e2eAuth.userId,
        "e2e_profile_id",
      )

      if (!profile) {
        profile = await fetchProfileByColumn(
          supabase,
          "auth_user_id",
          e2eAuth.userId,
          "e2e_auth_user_id",
        )
      }
    }

    if (profile && !isClosedProfile(profile)) {
      const typedProfile = asProfile(profile)
      return {
        user: {
          id: e2eAuth.userId,
          email: typedProfile.email ?? null,
          user_metadata: {
            full_name: typedProfile.full_name ?? undefined,
            date_of_birth: typedProfile.date_of_birth ?? undefined,
          },
        },
        profile: typedProfile,
      }
    }
  }

  // Supabase Auth flow - verify session via cookies
  const supabaseAuth = await createClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()

  if (!user) {
    return null
  }

  const supabase = createServiceRoleClient()

  // Find profile by auth_user_id (Supabase Auth UUID)
  const profile = await fetchProfileByColumn(
    supabase,
    "auth_user_id",
    user.id,
    "supabase_auth",
  )

  if (!profile || isClosedProfile(profile)) {
    return null
  }

  const typedProfile = asProfile(profile)
  return {
    user: {
      id: user.id,
      email: user.email ?? null,
      user_metadata: {
        full_name: typedProfile.full_name ?? undefined,
        date_of_birth: typedProfile.date_of_birth ?? undefined,
      },
    },
    profile: typedProfile,
  }
}

/**
 * Get authenticated user, creating a profile if one doesn't exist.
 * Used for onboarding and first-time user flows.
 * Also links guest profiles by email if found.
 *
 * Note: The handle_new_user() DB trigger normally creates profiles on
 * auth.users insert. This function is a safety net for race conditions
 * and guest profile linking.
 */
export async function getOrCreateAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  const supabaseAuth = await createClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()

  if (!user) {
    return null
  }

  const primaryEmail = user.email?.toLowerCase()
  const supabase = createServiceRoleClient()

  // Try to find existing profile by auth_user_id
  let { data: profile } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("auth_user_id", user.id)
    .single()

  // If no profile found, check for guest profile to link by email
  if (!profile && primaryEmail) {
    const { data: guestProfile } = await supabase
      .from("profiles")
      .select(PROFILE_COLUMNS)
      .ilike("email", escapeIlike(primaryEmail))
      .eq("role", "patient")
      .is("auth_user_id", null)
      .is("account_closed_at", null)
      .maybeSingle()

    if (guestProfile) {
      // Link the guest profile to this Supabase Auth user
      const fullName = user.user_metadata?.full_name
        || user.user_metadata?.name
        || primaryEmail.split('@')[0]

      const { data: linkedProfile, error: linkError } = await supabase
        .from("profiles")
        .update({
          auth_user_id: user.id,
          email: primaryEmail,
          full_name: fullName,
          first_name: user.user_metadata?.first_name || null,
          last_name: user.user_metadata?.last_name || null,
          avatar_url: user.user_metadata?.avatar_url || null,
          email_verified: true,
          email_verified_at: new Date().toISOString(),
        })
        .eq("id", guestProfile.id)
        .eq("role", "patient")
        .is("auth_user_id", null)
        .is("account_closed_at", null)
        .select(PROFILE_COLUMNS)
        .maybeSingle()

      if (!linkError && linkedProfile) {
        profile = linkedProfile
      } else {
        // If linking failed, another process may have linked it
        const { data: nowLinkedProfile } = await supabase
          .from("profiles")
          .select(PROFILE_COLUMNS)
          .eq("auth_user_id", user.id)
          .single()

        if (nowLinkedProfile) {
          profile = nowLinkedProfile
        }
      }
    }
  }

  // Create new profile if none exists and no guest profile to link
  // (safety net - handle_new_user() trigger should have created it)
  if (!profile && primaryEmail) {
    const fullName = user.user_metadata?.full_name
      || user.user_metadata?.name
      || primaryEmail.split('@')[0]

    const { data: newProfile, error } = await supabase
      .from("profiles")
      .insert({
        auth_user_id: user.id,
        email: primaryEmail,
        full_name: fullName,
        first_name: user.user_metadata?.first_name || null,
        last_name: user.user_metadata?.last_name || null,
        avatar_url: user.user_metadata?.avatar_url || null,
        role: "patient",
        onboarding_completed: false,
        email_verified: true,
        email_verified_at: new Date().toISOString(),
      })
      .select(PROFILE_COLUMNS)
      .single()

    if (error) {
      // Handle race condition - trigger or concurrent request may have created it
      if (error.code === '23505') {
        const { data: raceProfile } = await supabase
          .from("profiles")
          .select(PROFILE_COLUMNS)
          .eq("auth_user_id", user.id)
          .single()

        if (raceProfile) {
          profile = raceProfile
        }
      }
    } else if (newProfile) {
      profile = newProfile
    }
  }

  if (!profile || isClosedProfile(profile as Record<string, unknown>)) {
    return null
  }

  const typedProfile = asProfile(decryptProfilePhiForAuth(profile as Record<string, unknown>))
  return {
    user: {
      id: user.id,
      email: primaryEmail ?? null,
      user_metadata: {
        full_name: typedProfile.full_name ?? undefined,
        date_of_birth: typedProfile.date_of_birth ?? undefined,
      },
    },
    profile: typedProfile,
  }
}

/**
 * Require authentication with one of the specified roles.
 * Redirects to sign-in if not authenticated, or appropriate dashboard if wrong role.
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
    // Check if user is authenticated but has no profile yet
    const supabaseAuth = await createClient()
    const { data: { user } } = await supabaseAuth.auth.getUser()
    if (user) {
      // Authenticated but no profile - send to post-signin for profile creation
      redirect("/auth/post-signin")
    }
    redirect("/sign-in")
  }

  const userRole = authUser.profile.role

  if (!allowedRoles.includes(userRole as "patient" | "doctor" | "admin")) {
    if (options?.redirectTo) {
      redirect(options.redirectTo)
    } else if (userRole === "patient") {
      redirect("/patient")
    } else if (userRole === "doctor" || userRole === "admin") {
      redirect("/doctor/dashboard")
    } else {
      redirect("/sign-in")
    }
  }

  return authUser
}

/**
 * Non-redirecting role check for server actions.
 * Returns null instead of throwing redirect() on auth failure.
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
  const supabaseAuth = await createClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return null

  return {
    id: user.id,
    email: user.email ?? null,
    user_metadata: {
      full_name: user.user_metadata?.full_name || user.user_metadata?.name,
    },
  }
}

/**
 * Get a user's profile by their auth_user_id (Supabase Auth UUID)
 */
export async function getUserProfile(authUserId: string): Promise<Profile | null> {
  const supabase = createServiceRoleClient()
  const { data: profile, error } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("auth_user_id", authUserId)
    .single()

  if (error || !profile || isClosedProfile(profile as Record<string, unknown>)) return null
  return asProfile(decryptProfilePhiForAuth(profile as Record<string, unknown>))
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
 * Sign out - redirect to sign-in page.
 * Note: Client-side sign out should use useAuth().signOut() from the auth provider.
 */
export async function signOut() {
  redirect("/sign-in")
}

/**
 * Auth function for server components/actions and API routes.
 * Returns { userId } for server components/actions and API routes.
 *
 * Used by API routes that import { auth } from "@/lib/auth/helpers".
 */
export async function auth(): Promise<{ userId: string | null; redirectToSignIn: () => never }> {
  // Check E2E bypass first
  const e2eAuth = await getE2EAuthUser()
  if (e2eAuth) {
    return {
      userId: e2eAuth.userId,
      redirectToSignIn: () => redirect("/sign-in") as never,
    }
  }

  const supabaseAuth = await createClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()

  return {
    userId: user?.id ?? null,
    redirectToSignIn: () => redirect("/sign-in") as never,
  }
}

/**
 * Get authenticated user for API routes.
 * Returns the user ID and profile, or null if not authenticated.
 */
export async function getApiAuth(): Promise<{ userId: string; profile: Profile } | null> {
  // Check for E2E test auth first (non-production only)
  const e2eAuth = await getE2EAuthUser()

  let userId: string | null = null

  if (e2eAuth) {
    userId = e2eAuth.userId
  } else {
    const supabaseAuth = await createClient()
    const { data: { user } } = await supabaseAuth.auth.getUser()
    userId = user?.id ?? null
  }

  if (!userId) {
    return null
  }

  const supabase = createServiceRoleClient()
  let profile: Record<string, unknown> | null = null

  if (e2eAuth && UUID_RE.test(userId)) {
    const byProfileId = await supabase
      .from("profiles")
      .select(PROFILE_COLUMNS)
      .eq("id", userId)
      .maybeSingle()

    profile = byProfileId.data as Record<string, unknown> | null
  }

  if (!profile) {
    const byAuthId = await supabase
      .from("profiles")
      .select(PROFILE_COLUMNS)
      .eq("auth_user_id", userId)
      .maybeSingle()

    profile = byAuthId.data as Record<string, unknown> | null
  }

  if (!profile || isClosedProfile(profile)) {
    return null
  }

  return { userId, profile: asProfile(profile) }
}

/**
 * Require authentication in API routes.
 * Returns user info or throws for unauthorized.
 */
export async function requireApiAuth(): Promise<{ userId: string; profile: Profile }> {
  const result = await getApiAuth()

  if (!result) {
    throw new Error("Unauthorized")
  }

  return result
}

/**
 * Require authentication AND role check for API routes.
 * Returns null if not authenticated or role doesn't match.
 */
export async function requireApiRole(
  allowedRoles: Array<"patient" | "doctor" | "admin">
): Promise<{ userId: string; profile: Profile } | null> {
  const result = await getApiAuth()
  if (!result) return null
  if (!allowedRoles.includes(result.profile.role as "patient" | "doctor" | "admin")) return null
  return result
}
