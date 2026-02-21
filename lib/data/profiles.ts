import { createServiceRoleClient } from "../supabase/service-role"
import { auth } from "@/lib/auth"
import { createLogger } from "@/lib/observability/logger"
import { encryptField, decryptField } from "@/lib/security/encryption"
const logger = createLogger("data-profiles")
import type { Profile, AustralianState } from "../../types/db"

/**
 * Check if encryption is available (ENCRYPTION_KEY is set)
 */
function isEncryptionEnabled(): boolean {
  return !!process.env.ENCRYPTION_KEY
}

/**
 * Decrypt PHI fields in a profile object
 * P0 FIX: Fails loudly on decryption errors instead of silent fallback
 * This prevents returning corrupted/wrong data to users
 */
function decryptProfilePhi<T extends Record<string, unknown>>(profile: T): T {
  if (!profile) return profile

  const decrypted: Record<string, unknown> = { ...profile }

  // Decrypt medicare_number
  if (profile.medicare_number_encrypted) {
    try {
      decrypted.medicare_number = decryptField<string>(
        profile.medicare_number_encrypted as string
      )
    } catch (error) {
      // P0 FIX: Log error with context and throw - do not silently use plaintext
      logger.error("PHI decryption failed for medicare_number", {
        profileId: profile.id,
        hasPlaintext: !!profile.medicare_number,
      }, error instanceof Error ? error : new Error(String(error)))
      throw new Error("Failed to decrypt sensitive data. Please contact support.")
    }
  }

  // Decrypt date_of_birth
  if (profile.date_of_birth_encrypted) {
    try {
      decrypted.date_of_birth = decryptField<string>(
        profile.date_of_birth_encrypted as string
      )
    } catch (error) {
      logger.error("PHI decryption failed for date_of_birth", {
        profileId: profile.id,
      }, error instanceof Error ? error : new Error(String(error)))
      throw new Error("Failed to decrypt sensitive data. Please contact support.")
    }
  }

  // Decrypt phone
  if (profile.phone_encrypted) {
    try {
      decrypted.phone = decryptField<string>(profile.phone_encrypted as string)
    } catch (error) {
      logger.error("PHI decryption failed for phone", {
        profileId: profile.id,
      }, error instanceof Error ? error : new Error(String(error)))
      throw new Error("Failed to decrypt sensitive data. Please contact support.")
    }
  }

  // Remove encrypted fields from response
  delete decrypted.medicare_number_encrypted
  delete decrypted.date_of_birth_encrypted
  delete decrypted.phone_encrypted

  return decrypted as T
}

/**
 * Encrypt PHI fields before writing to database
 * Only encrypts if ENCRYPTION_KEY is available
 */
function encryptProfilePhi<T extends Record<string, unknown>>(
  data: T
): T & {
  medicare_number_encrypted?: string
  date_of_birth_encrypted?: string
  phone_encrypted?: string
  phi_encrypted_at?: string
} {
  if (!isEncryptionEnabled()) {
    return data
  }

  const encrypted: Record<string, unknown> = { ...data }

  // Encrypt medicare_number
  if (data.medicare_number) {
    encrypted.medicare_number_encrypted = encryptField(data.medicare_number)
    // Keep plaintext during migration for backward compatibility
    // Remove this line after migration is complete:
    // delete encrypted.medicare_number
  }

  // Encrypt date_of_birth
  if (data.date_of_birth) {
    const dobString =
      data.date_of_birth instanceof Date
        ? data.date_of_birth.toISOString().split("T")[0]
        : String(data.date_of_birth)
    encrypted.date_of_birth_encrypted = encryptField(dobString)
  }

  // Encrypt phone
  if (data.phone) {
    encrypted.phone_encrypted = encryptField(data.phone)
  }

  // Mark when PHI was encrypted
  if (
    encrypted.medicare_number_encrypted ||
    encrypted.date_of_birth_encrypted ||
    encrypted.phone_encrypted
  ) {
    encrypted.phi_encrypted_at = new Date().toISOString()
  }

  return encrypted as T & {
    medicare_number_encrypted?: string
    date_of_birth_encrypted?: string
    phone_encrypted?: string
    phi_encrypted_at?: string
  }
}

/**
 * Fetch the profile for the currently logged-in user.
 * Returns null if not authenticated or profile doesn't exist.
 */
export async function getCurrentProfile(): Promise<Profile | null> {
  const { userId } = await auth()

  if (!userId) {
    return null
  }

  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from("profiles")
    .select(`
      id,
      auth_user_id,
      full_name,
      date_of_birth,
      date_of_birth_encrypted,
      email,
      phone,
      phone_encrypted,
      role,
      medicare_number,
      medicare_number_encrypted,
      medicare_irn,
      medicare_expiry,
      address_line1,
      address_line2,
      suburb,
      state,
      postcode,
      stripe_customer_id,
      onboarding_completed,
      provider_number,
      created_at,
      updated_at
    `)
    .eq("clerk_user_id", userId)
    .single()

  if (error || !data) {
    return null
  }

  // Decrypt PHI fields
  const decryptedData = decryptProfilePhi(data)

  return decryptedData as unknown as Profile
}

/**
 * Fetch a profile by its ID.
 */
export async function getProfileById(profileId: string): Promise<Profile | null> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from("profiles")
    .select(`
      id,
      auth_user_id,
      full_name,
      date_of_birth,
      date_of_birth_encrypted,
      email,
      phone,
      phone_encrypted,
      role,
      medicare_number,
      medicare_number_encrypted,
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

  // Decrypt PHI fields
  const decryptedData = decryptProfilePhi(data)

  return decryptedData as unknown as Profile
}


/**
 * Update an existing profile.
 */
export async function updateProfile(
  profileId: string,
  updates: Partial<Omit<Profile, "id" | "created_at" | "auth_user_id" | "role">>,
): Promise<Profile | null> {
  const supabase = createServiceRoleClient()

  // Encrypt PHI fields if encryption is enabled
  const encryptedUpdates = encryptProfilePhi({
    ...updates,
    updated_at: new Date().toISOString(),
  })

  const { data, error } = await supabase
    .from("profiles")
    .update(encryptedUpdates)
    .eq("id", profileId)
    .select(`
      id,
      auth_user_id,
      full_name,
      date_of_birth,
      date_of_birth_encrypted,
      email,
      phone,
      phone_encrypted,
      role,
      medicare_number,
      medicare_number_encrypted,
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
    .single()

  if (error || !data) {
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.error("Error updating profile:", error)
    }
    return null
  }

  // Decrypt PHI fields before returning
  const decryptedData = decryptProfilePhi(data)

  return decryptedData as unknown as Profile
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

export async function completeOnboarding(
  profileId: string,
  data: OnboardingData
): Promise<Profile | null> {
  const supabase = createServiceRoleClient()

  // Encrypt PHI fields if encryption is enabled
  const encryptedData = encryptProfilePhi({
    ...data,
    onboarding_completed: true,
    updated_at: new Date().toISOString(),
  })

  const { data: profile, error } = await supabase
    .from("profiles")
    .update(encryptedData)
    .eq("id", profileId)
    .select(`
      id,
      auth_user_id,
      full_name,
      date_of_birth,
      date_of_birth_encrypted,
      email,
      phone,
      phone_encrypted,
      role,
      medicare_number,
      medicare_number_encrypted,
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
    .single()

  if (error || !profile) {
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.error("Error completing onboarding:", error)
    }
    return null
  }

  // Decrypt PHI fields before returning
  const decryptedProfile = decryptProfilePhi(profile)

  return decryptedProfile as unknown as Profile
}

/**
 * Get user email from auth_user_id
 */
export async function getUserEmailFromAuthUserId(authUserId: string): Promise<string | null> {
  const supabase = createServiceRoleClient()
  
  // Try to get from profile first (most common case)
  const { data: profile } = await supabase
    .from("profiles")
    .select("email")
    .eq("auth_user_id", authUserId)
    .single()
  
  if (profile?.email) {
    return profile.email
  }
  
  // Fallback to auth.users
  const serviceClient = createServiceRoleClient()
  const { data: authUser, error: authError } = await serviceClient.auth.admin.getUserById(authUserId)
  
  if (authError || !authUser?.user?.email) {
    return null
  }
  
  return authUser.user.email
}

/**
 * Get user email from clerk_user_id (primary method for Clerk auth)
 */
export async function getUserEmailFromClerkUserId(clerkUserId: string): Promise<string | null> {
  const serviceClient = createServiceRoleClient()
  
  // Get email from profile
  const { data: profile } = await serviceClient
    .from("profiles")
    .select("email")
    .eq("clerk_user_id", clerkUserId)
    .single()
  
  return profile?.email ?? null
}
