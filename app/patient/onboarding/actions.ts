"use server"

import { createClient } from "@/lib/supabase/server"
import { auth } from "@/lib/auth"
import type { AustralianState } from "@/types/db"
import { validateAustralianPhone } from "@/lib/validation/australian-phone"
import { validatePostcodeState } from "@/lib/validation/australian-address"
import { validateMedicareNumber } from "@/lib/validation/medicare"
import { verifyAddress } from "@/lib/addressfinder/server"

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
): Promise<{ success: boolean; error?: string; fieldErrors?: Record<string, string> }> {
  const supabase = await createClient()

  // Verify the user owns this profile
  const { userId } = await auth()

  if (!userId) {
    return { success: false, error: "Not authenticated" }
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("auth_user_id")
    .eq("id", profileId)
    .single()

  if (profileError || !profile || profile.auth_user_id !== userId) {
    return { success: false, error: "Unauthorized" }
  }

  // Server-side validation
  const fieldErrors: Record<string, string> = {}

  // Validate phone
  const phoneValidation = validateAustralianPhone(data.phone)
  if (!phoneValidation.valid) {
    fieldErrors.phone = phoneValidation.error || "Invalid phone number"
  }

  // Validate postcode-state match
  const postcodeValidation = validatePostcodeState(data.postcode, data.state)
  if (!postcodeValidation.valid) {
    fieldErrors.postcode = postcodeValidation.error || "Invalid postcode"
  }

  // Validate Medicare (if provided)
  if (data.medicare_number) {
    const medicareValidation = validateMedicareNumber(data.medicare_number)
    if (!medicareValidation.valid) {
      fieldErrors.medicare = medicareValidation.error || "Invalid Medicare number"
    }
  }

  // Return early if validation errors
  if (Object.keys(fieldErrors).length > 0) {
    return { success: false, error: "Please correct the errors below", fieldErrors }
  }

  // Verify address with AddressFinder (GNAF verification)
  const addressVerification = await verifyAddress({
    addressLine1: data.address_line1,
    suburb: data.suburb,
    state: data.state,
    postcode: data.postcode,
  })

  // Use canonical address if verified, otherwise use input
  const finalAddress = addressVerification.verified && addressVerification.address
    ? {
        address_line1: addressVerification.address.canonical.addressLine1,
        suburb: addressVerification.address.canonical.suburb,
        state: addressVerification.address.canonical.state as AustralianState,
        postcode: addressVerification.address.canonical.postcode,
      }
    : {
        address_line1: data.address_line1,
        suburb: data.suburb,
        state: data.state,
        postcode: data.postcode,
      }

  // Update profile with onboarding data
  const { error } = await supabase
    .from("profiles")
    .update({
      phone: phoneValidation.e164 || data.phone, // Use E.164 format if available
      address_line1: finalAddress.address_line1,
      suburb: finalAddress.suburb,
      state: finalAddress.state,
      postcode: finalAddress.postcode,
      medicare_number: data.medicare_number || null,
      medicare_irn: data.medicare_irn || null,
      medicare_expiry: data.medicare_expiry || null,
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
