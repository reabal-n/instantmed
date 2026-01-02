"use server"

import { createClient } from "@/lib/supabase/server"
import { auth } from "@clerk/nextjs/server"
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
  const supabase = await createClient()

  // Verify the user owns this profile via Clerk
  const { userId } = await auth()

  if (!userId) {
    return { success: false, error: "Not authenticated" }
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("clerk_user_id")
    .eq("id", profileId)
    .single()

  if (profileError || !profile || profile.clerk_user_id !== userId) {
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
    return { success: false, error: "Failed to save your details. Please try again." }
  }

  return { success: true }
}
