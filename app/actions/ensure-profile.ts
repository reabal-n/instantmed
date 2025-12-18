"use server"

import { createServiceRoleClient } from "@/lib/supabase/service-role"

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
 */
export async function ensureProfile(
  userId: string,
  userEmail: string,
  options?: {
    fullName?: string
    dateOfBirth?: string
  }
): Promise<{ profileId: string | null; error: string | null }> {
  try {
    const supabase = createServiceRoleClient()

    // Step 1: Check if profile exists
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
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId)
    
    if (authError || !authUser?.user) {
      return {
        profileId: null,
        error: "User not found. Please sign in again.",
      }
    }

    const profileData = {
      auth_user_id: userId,
      email: userEmail || authUser.user.email || "",
      full_name: options?.fullName || 
                 authUser.user.user_metadata?.full_name || 
                 authUser.user.user_metadata?.name ||
                 userEmail?.split("@")[0] || 
                 "User",
      date_of_birth: options?.dateOfBirth || authUser.user.user_metadata?.date_of_birth || null,
      role: (authUser.user.user_metadata?.role as "patient" | "doctor") || "patient",
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
