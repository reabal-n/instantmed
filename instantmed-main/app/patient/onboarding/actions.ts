"use server"

import { createClient } from "@/lib/supabase/server"
import { onboardingSchema, validateInput } from "@/lib/validation/schemas"
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
): Promise<{ success: boolean; error?: string; fieldErrors?: Record<string, string[]> }> {
  // Validate input with Zod
  const validation = validateInput(onboardingSchema, { profileId, data })
  if (!validation.success) {
    return { success: false, error: validation.error, fieldErrors: validation.fieldErrors }
  }

  const supabase = await createClient()

  // Verify the user owns this profile
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  const { data: profile } = await supabase.from("profiles").select("auth_user_id").eq("id", profileId).single()

  if (!profile || profile.auth_user_id !== user.id) {
    return { success: false, error: "Unauthorized" }
  }

  // Update profile with validated onboarding data
  const validatedData = validation.data.data
  const { error } = await supabase
    .from("profiles")
    .update({
      phone: validatedData.phone,
      address_line1: validatedData.address_line1,
      suburb: validatedData.suburb,
      state: validatedData.state,
      postcode: validatedData.postcode,
      medicare_number: validatedData.medicare_number,
      medicare_irn: validatedData.medicare_irn,
      medicare_expiry: validatedData.medicare_expiry,
      consent_myhr: validatedData.consent_myhr,
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", profileId)

  if (error) {
    console.error("Error completing onboarding:", error)
    return { success: false, error: "Failed to save your details. Please try again." }
  }

  return { success: true }
}
