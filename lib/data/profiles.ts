import { createClient } from "../supabase/server"
import { createServiceRoleClient } from "../supabase/service-role"
import { createLogger } from "@/lib/observability/logger"
const logger = createLogger("data-profiles")
import { currentUser } from "@clerk/nextjs/server"
import type { Profile, AustralianState } from "../../types/db"

/**
 * Fetch the profile for the currently logged-in user.
 * Returns null if not authenticated or profile doesn't exist.
 */
export async function getCurrentProfile(): Promise<Profile | null> {
  const user = await currentUser()
  
  if (!user) {
    return null
  }

  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from("profiles")
    .select(`
      id,
      auth_user_id,
      clerk_user_id,
      full_name,
      date_of_birth,
      email,
      phone,
      role,
      medicare_number,
      medicare_irn,
      medicare_expiry,
      address_line1,
      address_line2,
      suburb,
      state,
      postcode,
      stripe_customer_id,
      onboarding_completed,
      created_at,
      updated_at
    `)
    .eq("clerk_user_id", user.id)
    .single()

  if (error || !data) {
    return null
  }

  return data as unknown as Profile
}

/**
 * Fetch a profile by its ID.
 */
export async function getProfileById(profileId: string): Promise<Profile | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("profiles")
    .select(`
      id,
      auth_user_id,
      full_name,
      date_of_birth,
      email,
      phone,
      role,
      medicare_number,
      medicare_irn,
      medicare_expiry,
      address_line1,
      address_line2,
      suburb,
      state,
      postcode,
      stripe_customer_id,
      onboarding_completed,
      created_at,
      updated_at
    `)
    .eq("id", profileId)
    .single()

  if (error || !data) {
    return null
  }

  return data as unknown as Profile
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

  return data as unknown as Profile
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

  return profile as unknown as Profile
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
    logger.error("Error fetching request for email lookup", {}, requestError instanceof Error ? requestError : new Error(String(requestError)))
    return null
  }

  const patient = request.patient as unknown as { auth_user_id: string | null }
  const authUserId = patient.auth_user_id

  // For guest profiles (no auth_user_id), we can't get email this way
  // In that case, email should be stored elsewhere (e.g., checkout metadata)
  if (!authUserId) {
    logger.debug("[Email] Guest profile - no auth_user_id available")
    return null
  }

  // Get user email from auth.users via admin API
  // Must use service role client for auth.admin access
  const serviceClient = createServiceRoleClient()
  const { data: authUser, error: authError } = await serviceClient.auth.admin.getUserById(authUserId)

  if (authError || !authUser?.user?.email) {
    logger.error("Error fetching auth user email", {}, authError instanceof Error ? authError : new Error(String(authError)))
    return null
  }

  return authUser.user.email
}
