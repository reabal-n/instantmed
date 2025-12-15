"use server"

import { createClient } from "@/lib/supabase/server"
import type { AustralianState } from "@/types/db"

interface OnboardingInput {
  phone: string
  address_line1: string
  suburb: string
  state: AustralianState
  postcode: string
  medicare_number: string
  medicare_irn: number
  medicare_expiry: string
  consent_myhr: boolean
}

export async function completeOnboardingAction(
  profileId: string,
  data: OnboardingInput,
): Promise<{ success: boolean; error?: string }> {
  const startTime = Date.now()
  
  console.log("[completeOnboardingAction] Starting:", { profileId })
  
  const supabase = await createClient()

  // Verify the user owns this profile
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError) {
    console.error("[completeOnboardingAction] Auth error:", {
      profileId,
      error: authError.message,
    })
  }

  if (!user) {
    console.warn("[completeOnboardingAction] Unauthenticated access attempt:", { profileId })
    return { success: false, error: "Not authenticated" }
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("auth_user_id")
    .eq("id", profileId)
    .single()

  if (profileError) {
    console.error("[completeOnboardingAction] Profile fetch error:", {
      profileId,
      userId: user.id,
      error: profileError.message,
    })
  }

  if (!profile || profile.auth_user_id !== user.id) {
    console.warn("[completeOnboardingAction] Unauthorized access:", {
      profileId,
      userId: user.id,
      profileAuthUserId: profile?.auth_user_id,
    })
    return { success: false, error: "Unauthorized" }
  }

  // Update profile with onboarding data
  const { error } = await supabase
    .from("profiles")
    .update({
      phone: data.phone,
      address_line1: data.address_line1,
      suburb: data.suburb,
      state: data.state,
      postcode: data.postcode,
      medicare_number: data.medicare_number,
      medicare_irn: data.medicare_irn,
      medicare_expiry: data.medicare_expiry,
      consent_myhr: data.consent_myhr,
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", profileId)

  if (error) {
    console.error("[completeOnboardingAction] Update failed:", {
      profileId,
      userId: user.id,
      error: error.message,
      code: error.code,
      duration: Date.now() - startTime,
    })
    return { success: false, error: "Failed to save your details. Please try again." }
  }

  console.log("[completeOnboardingAction] Success:", {
    profileId,
    userId: user.id,
    duration: Date.now() - startTime,
  })

  return { success: true }
}
