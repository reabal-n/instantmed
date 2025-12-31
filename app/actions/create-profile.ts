"use server"
import { logger } from "@/lib/logger"

import { createServiceRoleClient } from "@/lib/supabase/service-role"

export async function createOrGetProfile(
  authUserId: string,
  fullName: string,
  dateOfBirth: string,
): Promise<{ profileId: string | null; error: string | null }> {
  try {
    let supabase
    try {
      supabase = createServiceRoleClient()
    } catch (clientError) {
      logger.error("[Profile Action] Failed to create service role client", { error: String(clientError) })
      return { profileId: null, error: "Server configuration error. Please contact support." }
    }

    const { data: existingProfile, error: selectError } = await supabase
      .from("profiles")
      .select("id, full_name, date_of_birth")
      .eq("auth_user_id", authUserId)
      .maybeSingle()

    if (selectError) {
      logger.error("[Profile Action] Error checking for existing profile:", {
        code: selectError.code,
        message: selectError.message,
        details: selectError.details,
        hint: selectError.hint,
      })
      return { profileId: null, error: `Database error: ${selectError.message}` }
    }

    if (existingProfile) {
      const needsUpdate =
        (fullName && fullName !== existingProfile.full_name) ||
        (dateOfBirth && dateOfBirth !== existingProfile.date_of_birth)

      if (needsUpdate) {
        await supabase
          .from("profiles")
          .update({
            ...(fullName && { full_name: fullName }),
            ...(dateOfBirth && { date_of_birth: dateOfBirth }),
          })
          .eq("id", existingProfile.id)

        // Silently ignore update errors - profile exists and that's what matters
      }

      return { profileId: existingProfile.id, error: null }
    }

    const { data: authUser } = await supabase.auth.admin.getUserById(authUserId)
    // Don't return error - user might be pending email confirmation

    if (!authUser?.user) {
      return {
        profileId: null,
        error: "Please confirm your email before continuing. Check your inbox for a confirmation link.",
      }
    }

    // Note: A database trigger may auto-create profiles, so we check again before inserting
    // and handle race conditions gracefully

    // Double-check profile doesn't exist (trigger might have created it between checks)
    const { data: doubleCheckProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("auth_user_id", authUserId)
      .maybeSingle()

    if (doubleCheckProfile) {
      return { profileId: doubleCheckProfile.id, error: null }
    }

    const profileData = {
      auth_user_id: authUserId,
      full_name: fullName || authUser.user.user_metadata?.full_name || "User",
      date_of_birth: dateOfBirth || authUser.user.user_metadata?.date_of_birth || null,
      role: "patient",
      onboarding_completed: false,
    }

    const { data: newProfile, error: insertError } = await supabase
      .from("profiles")
      .insert(profileData)
      .select("id")
      .single()

    if (insertError) {
      // Handle duplicate key (profile created by trigger)
      if (insertError.code === "23505") {
        // Try to fetch the existing profile (trigger likely created it)
        const { data: existing } = await supabase
          .from("profiles")
          .select("id")
          .eq("auth_user_id", authUserId)
          .single()
        if (existing) {
          return { profileId: existing.id, error: null }
        }
        return { profileId: null, error: "A profile already exists for this account. Please try signing in instead." }
      }

      if (insertError.message.includes("auth_user_id") || insertError.code === "23503") {
        return { profileId: null, error: "Invalid user ID. Please try signing up again." }
      }

      // Last attempt: try fetching one more time in case trigger created it
      const { data: lastChance } = await supabase
        .from("profiles")
        .select("id")
        .eq("auth_user_id", authUserId)
        .maybeSingle()
      
      if (lastChance) {
        return { profileId: lastChance.id, error: null }
      }

      return {
        profileId: null,
        error: `Failed to create profile: ${insertError.message}. Please contact support if this persists.`,
      }
    }

    if (!newProfile) {
      return { profileId: null, error: "Profile created but could not be retrieved. Please try signing in." }
    }

    return { profileId: newProfile.id, error: null }
  } catch (err) {
    return {
      profileId: null,
      error: err instanceof Error ? err.message : "An unexpected error occurred. Please try again.",
    }
  }
}
