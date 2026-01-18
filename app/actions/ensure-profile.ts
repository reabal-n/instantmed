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
    let supabase
    try {
      supabase = createServiceRoleClient()
    } catch (clientError) {
      log.error("Failed to create service role client", {}, clientError)
      return { profileId: null, error: "Server configuration error. Please contact support." }
    }

    // Helper function to check for existing profile
    const checkExistingProfile = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .eq("auth_user_id", userId)
        .maybeSingle()
      return { data, error }
    }

    // Step 1: Wait for database trigger with exponential backoff retry
    // The trigger runs AFTER INSERT on auth.users
    let existingProfile = null
    let selectError = null
    const maxAttempts = 3
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const result = await checkExistingProfile()
      existingProfile = result.data
      selectError = result.error
      
      if (existingProfile || selectError) break
      
      // Exponential backoff: 100ms, 200ms, 400ms
      const delay = 100 * Math.pow(2, attempt)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
    
    // Step 2: Check result after retries

    if (selectError) {
      log.error("Error checking for existing profile", { userId, code: selectError.code }, selectError)
      return { profileId: null, error: `Database error: ${selectError.message}` }
    }

    // If profile exists (created by trigger), return it
    if (existingProfile) {
      log.info("Found existing profile (likely from trigger)", { userId, profileId: existingProfile.id })
      return { profileId: existingProfile.id, error: null }
    }

    // Step 3: Profile doesn't exist - create it manually
    if (!userEmail) {
      log.error("No email provided for profile creation", { userId })
      return { profileId: null, error: "Email is required to create a profile." }
    }

    log.info("Creating new profile manually", { userId, email: userEmail })

    // Only include required fields - onboarding_completed has a default value in DB
    const profileData: Record<string, unknown> = {
      auth_user_id: userId,
      email: userEmail,
      full_name: options?.fullName || userEmail.split("@")[0] || "User",
      role: "patient",
    }
    
    // Only add optional fields if provided
    if (options?.dateOfBirth) {
      profileData.date_of_birth = options.dateOfBirth
    }

    const { data: newProfile, error: insertError } = await supabase
      .from("profiles")
      .insert(profileData)
      .select("id")
      .single()

    if (insertError) {
      // Handle duplicate key (trigger created it between our check and insert)
      if (insertError.code === "23505") {
        log.info("Duplicate key - profile was created by trigger", { userId })
        // Retry fetch
        const { data: existingAfterError } = await checkExistingProfile()
        if (existingAfterError) {
          return { profileId: existingAfterError.id, error: null }
        }
      }

      log.error("Failed to create profile", { 
        userId, 
        code: insertError.code, 
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint
      }, insertError)
      
      return { 
        profileId: null, 
        error: `Failed to create profile: ${insertError.message} (code: ${insertError.code})` 
      }
    }

    if (!newProfile) {
      return { profileId: null, error: "Profile created but could not be retrieved" }
    }

    log.info("Profile created successfully", { userId, profileId: newProfile.id })
    return { profileId: newProfile.id, error: null }
  } catch (err) {
    log.error("Unexpected error in ensureProfile", { userId }, err)
    return { 
      profileId: null, 
      error: err instanceof Error ? err.message : "An unexpected error occurred during profile creation" 
    }
  }
}
