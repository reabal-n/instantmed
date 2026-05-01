"use server"

import { revalidatePath } from "next/cache"

import { auth } from "@/lib/auth/helpers"
import { verifyAddress } from "@/lib/google-places/geocoding"
import { encryptField } from "@/lib/security/encryption"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { validatePostcodeState } from "@/lib/validation/australian-address"
import { validateAustralianPhone } from "@/lib/validation/australian-phone"
import { validateMedicareExpiry,validateMedicareNumber } from "@/lib/validation/medicare"
import type { AustralianState } from "@/types/db"
import type { ActionResult } from "@/types/shared"

/**
 * Verify that the authenticated user owns the given profile.
 * Returns the Supabase client or an error result.
 */
async function verifyProfileOwnership(profileId: string) {
  const { userId } = await auth()

  if (!userId) {
    return { error: { success: false, error: "Not authenticated" } as ActionResult }
  }

  const supabase = createServiceRoleClient()
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("auth_user_id")
    .eq("id", profileId)
    .single()

  if (profileError || !profile || profile.auth_user_id !== userId) {
    return { error: { success: false, error: "Unauthorized" } as ActionResult }
  }

  return { supabase }
}

/**
 * Update phone number for a patient profile.
 * Validates Australian phone format and stores in E.164.
 */
export async function updatePhoneAction(
  profileId: string,
  phone: string,
): Promise<ActionResult> {
  const result = await verifyProfileOwnership(profileId)
  if (result.error) return result.error

  const { supabase } = result

  // Validate phone
  const phoneValidation = validateAustralianPhone(phone)
  if (!phoneValidation.valid) {
    return {
      success: false,
      error: "Please correct the errors below",
      fieldErrors: { phone: phoneValidation.error || "Invalid phone number" },
    }
  }

  const normalizedPhone = phoneValidation.e164 || phone
  const now = new Date().toISOString()

  const { error } = await supabase
    .from("profiles")
    .update({
      phone: normalizedPhone,
      phone_encrypted: encryptField(normalizedPhone),
      phi_encrypted_at: now,
      updated_at: now,
    })
    .eq("id", profileId)

  if (error) {
    return { success: false, error: "Failed to save your phone number. Please try again." }
  }

  revalidatePath("/patient")
  return { success: true }
}

/**
 * Update address for a patient profile.
 * Validates postcode-state match and verifies via Google Geocoding.
 */
export async function updateAddressAction(
  profileId: string,
  data: {
    addressLine1: string
    suburb: string
    state: AustralianState
    postcode: string
  },
): Promise<ActionResult> {
  const result = await verifyProfileOwnership(profileId)
  if (result.error) return result.error

  const { supabase } = result
  const fieldErrors: Record<string, string> = {}

  // Validate required fields
  if (!data.addressLine1.trim()) {
    fieldErrors.addressLine1 = "Address is required"
  }
  if (!data.suburb.trim()) {
    fieldErrors.suburb = "Suburb is required"
  }
  if (!data.postcode.trim()) {
    fieldErrors.postcode = "Postcode is required"
  }

  // Validate postcode-state match
  if (data.postcode && data.state) {
    const postcodeValidation = validatePostcodeState(data.postcode, data.state)
    if (!postcodeValidation.valid) {
      fieldErrors.postcode = postcodeValidation.error || "Postcode doesn't match state"
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { success: false, error: "Please correct the errors below", fieldErrors }
  }

  // Verify address with Google Geocoding API
  const addressVerification = await verifyAddress({
    addressLine1: data.addressLine1,
    suburb: data.suburb,
    state: data.state,
    postcode: data.postcode,
  })

  // Use canonical address if verified, otherwise use input
  const finalAddress =
    addressVerification.verified && addressVerification.address
      ? {
          address_line1: addressVerification.address.canonical.addressLine1,
          suburb: addressVerification.address.canonical.suburb,
          state: addressVerification.address.canonical.state as AustralianState,
          postcode: addressVerification.address.canonical.postcode,
        }
      : {
          address_line1: data.addressLine1,
          suburb: data.suburb,
          state: data.state,
          postcode: data.postcode,
        }

  const { error } = await supabase
    .from("profiles")
    .update({
      ...finalAddress,
      updated_at: new Date().toISOString(),
    })
    .eq("id", profileId)

  if (error) {
    return { success: false, error: "Failed to save your address. Please try again." }
  }

  revalidatePath("/patient")
  return { success: true }
}

/**
 * Update Medicare details for a patient profile.
 * Validates Medicare number format, encrypts, and saves with IRN + expiry.
 */
export async function updateMedicareAction(
  profileId: string,
  data: {
    medicareNumber: string | null
    medicareIrn: number | null
    medicareExpiry: string | null
    consentMyhr: boolean
  },
): Promise<ActionResult> {
  const result = await verifyProfileOwnership(profileId)
  if (result.error) return result.error

  const { supabase } = result
  const fieldErrors: Record<string, string> = {}

  // Validate Medicare number (if provided)
  if (data.medicareNumber) {
    const medicareValidation = validateMedicareNumber(data.medicareNumber)
    if (!medicareValidation.valid) {
      fieldErrors.medicare = medicareValidation.error || "Invalid Medicare number"
    }

    if (!data.medicareIrn) {
      fieldErrors.irn = "Please select your IRN"
    }

    if (data.medicareExpiry) {
      const expiryValidation = validateMedicareExpiry(data.medicareExpiry)
      if (!expiryValidation.valid) {
        fieldErrors.expiry = expiryValidation.error || "Invalid expiry date"
      }
    }
  } else if (data.medicareIrn || data.medicareExpiry) {
    fieldErrors.medicare = "Medicare number is required when saving card details"
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { success: false, error: "Please correct the errors below", fieldErrors }
  }

  const now = new Date().toISOString()
  const medicareNumber = data.medicareNumber || null

  const { error } = await supabase
    .from("profiles")
    .update({
      medicare_number: medicareNumber,
      medicare_number_encrypted: medicareNumber ? encryptField(medicareNumber) : null,
      medicare_irn: data.medicareIrn || null,
      medicare_expiry: data.medicareExpiry || null,
      consent_myhr: data.consentMyhr,
      ...(medicareNumber ? { phi_encrypted_at: now } : {}),
      updated_at: now,
    })
    .eq("id", profileId)

  if (error) {
    return { success: false, error: "Failed to save your Medicare details. Please try again." }
  }

  revalidatePath("/patient")
  revalidatePath("/patient/settings")
  return { success: true }
}
