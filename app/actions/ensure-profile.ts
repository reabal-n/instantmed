"use server"

import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createLogger } from "@/lib/observability/logger"

const log = createLogger("ensure-profile")

/**
 * Ensures a profile exists for an authenticated user.
 * This is the ONLY place where profiles are created - server-side only using service role.
 * 
 * Flow:
 * 1. Check if profile exists (by auth_user_id)
 * 2. If found: do nothing, return existing profile ID
 * 3. If not found: create profile server-side using service role client
 * 
 * IMPORTANT:
 * - This is a server action ("use server") - can ONLY be called from server
 * - Uses service role client to bypass RLS
 * - Never create profiles on the client - always use this function
 * - Uses auth_user_id (Supabase user ID format: UUID)
 */
export async function ensureProfile(
  userId: string, // Supabase auth user ID (UUID)
  userEmail: string,
  options?: {
    fullName?: string
    dateOfBirth?: string
  }
): Promise<{ profileId: string | null; error: string | null }> {
  try {
    const supabase = createServiceRoleClient()

    // Step 1: Check if profile exists by auth_user_id
    const { data: existingProfile, error: selectError } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .eq("auth_user_id", userId)
      .maybeSingle()

    if (selectError) {
      return { profileId: null, error: `Database error: ${selectError.message}` }
    }

    // Step 2: If profile exists, return it
    if (existingProfile) {
      return { profileId: existingProfile.id, error: null }
    }

    // Step 3: Profile doesn't exist - create it
    // Use provided email (should always be available from Supabase auth)
    if (!userEmail) {
      log.error("No email provided for profile creation", { userId })
      return {
        profileId: null,
        error: "Email is required to create a profile.",
      }
    }

    const profileData = {
      auth_user_id: userId, // Use auth_user_id for Supabase authentication
      email: userEmail,
      full_name: options?.fullName || userEmail.split("@")[0] || "User",
      date_of_birth: options?.dateOfBirth || null,
      role: "patient" as const,
      onboarding_completed: false,
    }

    const { data: newProfile, error: insertError } = await supabase
      .from("profiles")
      .insert(profileData)
      .select("id")
      .single()

    if (insertError) {
      // Check if it's a duplicate (trigger might have created it)
      if (insertError.code === "23505") {
        const { data: existingAfterError } = await supabase
          .from("profiles")
          .select("id")
          .eq("auth_user_id", userId)
          .single()

        if (existingAfterError) {
          return { profileId: existingAfterError.id, error: null }
        }
      }

      log.error("Failed to create profile", { userId, code: insertError.code }, insertError)
      throw new Error(`Failed to create profile: ${insertError.message} (code: ${insertError.code})`)
    }

    if (!newProfile) {
      throw new Error("Profile created but could not be retrieved")
    }

    return { profileId: newProfile.id, error: null }
  } catch (err) {
    throw err instanceof Error ? err : new Error("An unexpected error occurred during profile creation")
  }
}
