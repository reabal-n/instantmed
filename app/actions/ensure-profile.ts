"use server"

import { createServiceRoleClient } from "@/lib/supabase/service-role"

/**
 * Ensures a profile exists for an authenticated user.
 * This is the single source of truth for profile creation after auth.
 * 
 * Flow:
 * 1. Check if profile exists (by auth_user_id)
 * 2. If not found, insert with auth_user_id = user.id and email = user.email
 * 3. If found, update email if missing
 * 
 * This function uses service role to bypass RLS, ensuring it works reliably.
 */
export async function ensureProfile(
  userId: string,
  userEmail: string,
  options?: {
    fullName?: string
    dateOfBirth?: string
  }
): Promise<{ profileId: string | null; error: string | null }> {
  const startTime = Date.now()
  console.log("[EnsureProfile] Starting", {
    userId,
    userEmail,
    hasFullName: !!options?.fullName,
    hasDateOfBirth: !!options?.dateOfBirth,
  })

  try {
    const supabase = createServiceRoleClient()

    // Step 1: Check if profile exists
    console.log("[EnsureProfile] Checking for existing profile")
    const { data: existingProfile, error: selectError } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .eq("auth_user_id", userId)
      .maybeSingle()

    if (selectError) {
      console.error("[EnsureProfile] Error checking profile:", {
        code: selectError.code,
        message: selectError.message,
        details: selectError.details,
        hint: selectError.hint,
      })
      return { profileId: null, error: `Database error: ${selectError.message}` }
    }

    // Step 2: If profile exists, update email if missing and return
    if (existingProfile) {
      console.log("[EnsureProfile] Profile found:", existingProfile.id)
      
      // Update email if missing
      if (!existingProfile.email && userEmail) {
        console.log("[EnsureProfile] Updating missing email")
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ email: userEmail })
          .eq("id", existingProfile.id)

        if (updateError) {
          console.error("[EnsureProfile] Error updating email:", {
            code: updateError.code,
            message: updateError.message,
          })
          // Don't fail - email update is not critical
        }
      }

      return { profileId: existingProfile.id, error: null }
    }

    // Step 3: Profile doesn't exist - create it
    console.log("[EnsureProfile] Profile not found, creating new profile")
    
    // Verify user exists in auth.users
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId)
    
    if (authError || !authUser?.user) {
      console.error("[EnsureProfile] Auth user not found:", {
        authError: authError?.message,
        hasUser: !!authUser?.user,
      })
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

    console.log("[EnsureProfile] Inserting profile:", {
      ...profileData,
      auth_user_id: "***",
    })

    const { data: newProfile, error: insertError } = await supabase
      .from("profiles")
      .insert(profileData)
      .select("id")
      .single()

    if (insertError) {
      // Check if it's a duplicate (trigger might have created it)
      if (insertError.code === "23505") {
        console.log("[EnsureProfile] Duplicate key error - fetching existing profile")
        const { data: existingAfterError } = await supabase
          .from("profiles")
          .select("id")
          .eq("auth_user_id", userId)
          .single()

        if (existingAfterError) {
          console.log("[EnsureProfile] Found profile after duplicate error:", existingAfterError.id)
          return { profileId: existingAfterError.id, error: null }
        }
      }

      console.error("[EnsureProfile] Profile insert error:", {
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
      })

      // Hard error - profile creation must succeed
      throw new Error(`Failed to create profile: ${insertError.message} (code: ${insertError.code})`)
    }

    if (!newProfile) {
      console.error("[EnsureProfile] Profile insert succeeded but no data returned")
      throw new Error("Profile created but could not be retrieved")
    }

    const duration = Date.now() - startTime
    console.log("[EnsureProfile] Success", {
      profileId: newProfile.id,
      duration: `${duration}ms`,
    })

    return { profileId: newProfile.id, error: null }
  } catch (err) {
    console.error("[EnsureProfile] Unexpected error:", err)
    // Re-throw as hard error
    throw err instanceof Error ? err : new Error("An unexpected error occurred during profile creation")
  }
}
