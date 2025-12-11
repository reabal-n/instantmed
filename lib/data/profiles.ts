import { createClient } from "@/lib/supabase/server"
import type { Profile, AustralianState } from "@/types/db"

/**
 * Fetch the profile for the currently logged-in user.
 * Returns null if not authenticated or profile doesn't exist.
 */
export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return null
  }

  const { data, error } = await supabase.from("profiles").select("*").eq("auth_user_id", user.id).single()

  if (error || !data) {
    return null
  }

  return data as Profile
}

/**
 * Fetch a profile by its ID.
 */
export async function getProfileById(profileId: string): Promise<Profile | null> {
  const supabase = await createClient()

  const { data, error } = await supabase.from("profiles").select("*").eq("id", profileId).single()

  if (error || !data) {
    return null
  }

  return data as Profile
}

/**
 * Create a new profile for a user.
 */
export async function createProfile(profile: {
  auth_user_id: string
  full_name: string
  date_of_birth: string
  role: "patient" | "doctor"
}): Promise<Profile | null> {
  const supabase = await createClient()

  const { data, error } = await supabase.from("profiles").insert(profile).select().single()

  if (error || !data) {
    console.error("Error creating profile:", error)
    return null
  }

  return data as Profile
}

/**
 * Update an existing profile.
 */
export async function updateProfile(
  profileId: string,
  updates: Partial<Omit<Profile, "id" | "created_at" | "auth_user_id" | "role">>,
): Promise<Profile | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("profiles")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", profileId)
    .select()
    .single()

  if (error || !data) {
    console.error("Error updating profile:", error)
    return null
  }

  return data as Profile
}

export interface OnboardingData {
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

export async function completeOnboarding(profileId: string, data: OnboardingData): Promise<Profile | null> {
  const supabase = await createClient()

  const { data: profile, error } = await supabase
    .from("profiles")
    .update({
      ...data,
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", profileId)
    .select()
    .single()

  if (error || !profile) {
    console.error("Error completing onboarding:", error)
    return null
  }

  return profile as Profile
}
