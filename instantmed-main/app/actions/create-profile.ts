"use server"

import { createServiceRoleClient } from "@/lib/supabase/service-role"

export async function createOrGetProfile(
  authUserId: string,
  fullName: string,
  dateOfBirth: string,
): Promise<{ profileId: string | null; error: string | null }> {
  const supabase = createServiceRoleClient()

  try {
    // First verify the user exists in auth.users
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(authUserId)

    if (authError || !authUser?.user) {
      return {
        profileId: null,
        error: "User not found. Please confirm your email first.",
      }
    }

    // Check if profile already exists
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("auth_user_id", authUserId)
      .single()

    if (existingProfile) {
      // Update with the provided info if we have it
      if (fullName || dateOfBirth) {
        await supabase
          .from("profiles")
          .update({
            ...(fullName && { full_name: fullName }),
            ...(dateOfBirth && { date_of_birth: dateOfBirth }),
          })
          .eq("id", existingProfile.id)
      }

      return { profileId: existingProfile.id, error: null }
    }

    // Create new profile - user is verified to exist
    const { data: newProfile, error: insertError } = await supabase
      .from("profiles")
      .insert({
        auth_user_id: authUserId,
        full_name: fullName || "User",
        date_of_birth: dateOfBirth || null,
        role: "patient",
        onboarding_completed: false,
      })
      .select("id")
      .single()

    if (insertError) {
      console.error("Profile insert error:", insertError)
      return { profileId: null, error: insertError.message }
    }

    return { profileId: newProfile.id, error: null }
  } catch (err) {
    console.error("createOrGetProfile error:", err)
    return { profileId: null, error: err instanceof Error ? err.message : "Failed to create profile" }
  }
}
