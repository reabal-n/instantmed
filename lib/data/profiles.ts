import { createClient } from "../supabase/server"
import { createServiceRoleClient } from "../supabase/service-role"
import type { Profile, AustralianState } from "../../types/db"

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
 * @deprecated Use ensureProfile server action instead.
 * This function uses regular client which may fail due to RLS.
 * Profile creation MUST happen server-side using service role client.
 */
export async function createProfile(profile: {
  auth_user_id: string
  full_name: string
  date_of_birth: string
  role: "patient" | "doctor"
}): Promise<Profile | null> {
  console.warn("[DEPRECATED] createProfile called - use ensureProfile server action instead")
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

/**
 * Get the email address for a patient associated with a request.
 * Looks up the request → profile → auth.users to get the email.
 * Uses service role client for auth.admin access.
 */
export async function getPatientEmailFromRequest(requestId: string): Promise<string | null> {
  const supabase = await createClient()

  // Get the request with patient profile
  const { data: request, error: requestError } = await supabase
    .from("requests")
    .select(`
      patient_id,
      patient:profiles!patient_id (
        auth_user_id
      )
    `)
    .eq("id", requestId)
    .single()

  if (requestError || !request || !request.patient) {
    console.error("Error fetching request for email lookup:", requestError)
    return null
  }

  const authUserId = (request.patient as { auth_user_id: string | null }).auth_user_id

  // For guest profiles (no auth_user_id), we can't get email this way
  // In that case, email should be stored elsewhere (e.g., checkout metadata)
  if (!authUserId) {
    console.log("[Email] Guest profile - no auth_user_id available")
    return null
  }

  // Get user email from auth.users via admin API
  // Must use service role client for auth.admin access
  const serviceClient = createServiceRoleClient()
  const { data: authUser, error: authError } = await serviceClient.auth.admin.getUserById(authUserId)

  if (authError || !authUser?.user?.email) {
    console.error("Error fetching auth user email:", authError)
    return null
  }

  return authUser.user.email
}
