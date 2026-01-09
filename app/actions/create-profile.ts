"use server"
import { createLogger } from "@/lib/observability/logger"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { getUserEmailFromAuthUserId } from "@/lib/data/profiles"

const log = createLogger("create-profile")

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
      log.error("Failed to create service role client", {}, clientError)
      return { profileId: null, error: "Server configuration error. Please contact support." }
    }

    const { data: existingProfile, error: selectError } = await supabase
      .from("profiles")
      .select("id, full_name, date_of_birth")
      .eq("auth_user_id", authUserId)
      .maybeSingle()

    if (selectError) {
      log.error("Error checking for existing profile", {
        code: selectError.code,
        authUserId,
      }, selectError)
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

    // Get user email from Supabase auth
    const userEmail = await getUserEmailFromAuthUserId(authUserId)
    
    if (!userEmail) {
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
      full_name: fullName || "User",
      date_of_birth: dateOfBirth || null,
      email: userEmail,
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
