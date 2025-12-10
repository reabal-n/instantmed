"use server"

import { createServiceRoleClient } from "@/lib/supabase/service-role"

interface CreateProfileInput {
  userId: string
  email: string
  fullName: string
  dateOfBirth?: string
  medicareNumber?: string
  medicareIrn?: number
}

export async function createOrGetProfile(
  input: CreateProfileInput
): Promise<{ profileId: string | null; error: string | null }> {
  const supabase = createServiceRoleClient()

  try {
    // First verify the user exists in auth.users
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(input.userId)

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
      .eq("auth_user_id", input.userId)
      .single()

    if (existingProfile) {
      // Update with the provided info if we have it
      const updateData: Record<string, unknown> = {}
      if (input.fullName) updateData.full_name = input.fullName
      if (input.dateOfBirth) updateData.date_of_birth = input.dateOfBirth
      if (input.medicareNumber) updateData.medicare_number = input.medicareNumber
      if (input.medicareIrn) updateData.medicare_irn = input.medicareIrn

      if (Object.keys(updateData).length > 0) {
        await supabase
          .from("profiles")
          .update(updateData)
          .eq("id", existingProfile.id)
      }

      return { profileId: existingProfile.id, error: null }
    }

    // Create new profile - user is verified to exist
    const { data: newProfile, error: insertError } = await supabase
      .from("profiles")
      .insert({
        auth_user_id: input.userId,
        full_name: input.fullName || "User",
        date_of_birth: input.dateOfBirth || null,
        medicare_number: input.medicareNumber || null,
        medicare_irn: input.medicareIrn || null,
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
