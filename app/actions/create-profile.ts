"use server"

import { createServiceRoleClient } from "@/lib/supabase/service-role"

export async function createOrGetProfile(
  authUserId: string,
  fullName: string,
  dateOfBirth: string,
): Promise<{ profileId: string | null; error: string | null }> {
  try {
    console.log("[Profile Action] createOrGetProfile called", {
      authUserId,
      fullName,
      dateOfBirth,
      hasSupabaseUrl: !!process.env.SUPABASE_URL,
      hasPublicSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    })

    let supabase
    try {
      supabase = createServiceRoleClient()
      console.log("[Profile Action] Service role client created successfully")
    } catch (clientError) {
      console.error("[Profile Action] Failed to create service role client:", clientError)
      return { profileId: null, error: "Server configuration error. Please contact support." }
    }

    const { data: existingProfile, error: selectError } = await supabase
      .from("profiles")
      .select("id, full_name, date_of_birth")
      .eq("auth_user_id", authUserId)
      .maybeSingle()

    if (selectError) {
      console.error("[Profile Action] Error checking for existing profile:", {
        code: selectError.code,
        message: selectError.message,
        details: selectError.details,
        hint: selectError.hint,
      })
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

    console.log("[Profile Action] Verifying auth user exists")
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(authUserId)

    if (authError) {
      console.warn("[Profile Action] Could not verify auth user:", {
        message: authError.message,
        status: authError.status,
        code: authError.code,
      })
      // Don't return error here - user might be pending email confirmation
    }

    if (!authUser?.user) {
      console.warn("[Profile Action] Auth user not found - might be pending email confirmation")
      return {
        profileId: null,
        error: "Please confirm your email before continuing. Check your inbox for a confirmation link.",
      }
    }

    console.log("[Profile Action] Auth user verified:", {
      userId: authUser.user.id,
      email: authUser.user.email,
      emailConfirmed: authUser.user.email_confirmed_at ? true : false,
    })

    console.log("[Profile Action] Creating new profile for confirmed user")
    // Note: A database trigger may auto-create profiles, so we check again before inserting
    // and handle race conditions gracefully

    // Double-check profile doesn't exist (trigger might have created it between checks)
    const { data: doubleCheckProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("auth_user_id", authUserId)
      .maybeSingle()

    if (doubleCheckProfile) {
      console.log("[Profile Action] Profile found on double-check (likely created by trigger):", doubleCheckProfile.id)
      return { profileId: doubleCheckProfile.id, error: null }
    }

    const profileData = {
      auth_user_id: authUserId,
      full_name: fullName || authUser.user.user_metadata?.full_name || "User",
      date_of_birth: dateOfBirth || authUser.user.user_metadata?.date_of_birth || null,
      role: "patient",
      onboarding_completed: false,
    }

    console.log("[Profile Action] Inserting profile with data:", { ...profileData, auth_user_id: "***" })

    const { data: newProfile, error: insertError } = await supabase
      .from("profiles")
      .insert(profileData)
      .select("id")
      .single()

    if (insertError) {
      console.error("[Profile Action] Profile insert error:", {
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        fullError: insertError,
      })

      if (insertError.code === "23505") {
        console.log("[Profile Action] Duplicate profile detected (unique constraint violation) - fetching existing")
        // Try to fetch the existing profile (trigger likely created it)
        const { data: existing } = await supabase
          .from("profiles")
          .select("id")
          .eq("auth_user_id", authUserId)
          .single()
        if (existing) {
          console.log("[Profile Action] Found existing profile after duplicate error:", existing.id)
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
        console.log("[Profile Action] Found profile on last attempt:", lastChance.id)
        return { profileId: lastChance.id, error: null }
      }

      return {
        profileId: null,
        error: `Failed to create profile: ${insertError.message}. Please contact support if this persists.`,
      }
    }

    if (!newProfile) {
      console.error("[Profile Action] Profile was not returned after insert")
      return { profileId: null, error: "Profile created but could not be retrieved. Please try signing in." }
    }

    console.log("[Profile Action] Successfully created profile:", newProfile.id)
    return { profileId: newProfile.id, error: null }
  } catch (err) {
    console.error("[Profile Action] Unexpected error in createOrGetProfile:", err)
    return {
      profileId: null,
      error: err instanceof Error ? err.message : "An unexpected error occurred. Please try again.",
    }
  }
}
