"use server"

import { createServiceRoleClient } from "@/lib/supabase/service-role"

export async function createOrGetProfile(
  authUserId: string,
  fullName: string,
  dateOfBirth: string,
): Promise<{ profileId: string | null; error: string | null }> {
  const supabase = createServiceRoleClient()

  try {
    console.log("[v0] createOrGetProfile called for user:", authUserId)

    const { data: existingProfile, error: selectError } = await supabase
      .from("profiles")
      .select("id, full_name, date_of_birth")
      .eq("auth_user_id", authUserId)
      .maybeSingle()

    if (selectError) {
      console.error("[v0] Error checking for existing profile:", selectError)
      return { profileId: null, error: `Database error: ${selectError.message}` }
    }

    if (existingProfile) {
      console.log("[v0] Found existing profile:", existingProfile.id)

      const needsUpdate =
        (fullName && fullName !== existingProfile.full_name) ||
        (dateOfBirth && dateOfBirth !== existingProfile.date_of_birth)

      if (needsUpdate) {
        console.log("[v0] Updating existing profile with new data")
        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            ...(fullName && { full_name: fullName }),
            ...(dateOfBirth && { date_of_birth: dateOfBirth }),
          })
          .eq("id", existingProfile.id)

        if (updateError) {
          console.error("[v0] Error updating profile:", updateError)
        }
      }

      return { profileId: existingProfile.id, error: null }
    }

    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(authUserId)

    if (authError) {
      console.warn("[v0] Could not verify auth user (might be pending email confirmation):", authError.message)
      // Don't return error here - user might be pending email confirmation
    }

    if (!authUser?.user) {
      console.warn("[v0] Auth user not found - might be pending email confirmation")
      return {
        profileId: null,
        error: "Please confirm your email before continuing. Check your inbox for a confirmation link.",
      }
    }

    console.log("[v0] Creating new profile for confirmed user")

    const profileData = {
      auth_user_id: authUserId,
      full_name: fullName || authUser.user.user_metadata?.full_name || "User",
      date_of_birth: dateOfBirth || authUser.user.user_metadata?.date_of_birth || null,
      role: "patient",
      onboarding_completed: false,
    }

    console.log("[v0] Inserting profile with data:", { ...profileData, auth_user_id: "***" })

    const { data: newProfile, error: insertError } = await supabase
      .from("profiles")
      .insert(profileData)
      .select("id")
      .single()

    if (insertError) {
      console.error("[v0] Profile insert error:", {
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        code: insertError.code,
      })

      if (insertError.code === "23505") {
        return { profileId: null, error: "A profile already exists for this account. Please try signing in instead." }
      }

      if (insertError.message.includes("auth_user_id")) {
        return { profileId: null, error: "Invalid user ID. Please try signing up again." }
      }

      return {
        profileId: null,
        error: `Failed to create profile: ${insertError.message}. Please contact support if this persists.`,
      }
    }

    if (!newProfile) {
      console.error("[v0] Profile was not returned after insert")
      return { profileId: null, error: "Profile created but could not be retrieved. Please try signing in." }
    }

    console.log("[v0] Successfully created profile:", newProfile.id)
    return { profileId: newProfile.id, error: null }
  } catch (err) {
    console.error("[v0] Unexpected error in createOrGetProfile:", err)
    return {
      profileId: null,
      error: err instanceof Error ? err.message : "An unexpected error occurred. Please try again.",
    }
  }
}
