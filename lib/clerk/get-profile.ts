/* eslint-disable no-console -- Profile lookup needs console for error logging */
import { auth, currentUser } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

// Server-side helper to get the current user's profile from Supabase
// Uses Clerk user ID to look up the profile

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export interface ClerkProfile {
  id: string
  clerk_user_id: string
  email: string
  full_name: string
  first_name: string | null
  last_name: string | null
  role: 'patient' | 'doctor' | 'admin'
  is_verified: boolean
  is_active: boolean
  avatar_url: string | null
  // Add other fields as needed
}

/**
 * Get the current authenticated user's profile from Supabase
 * Returns null if not authenticated or profile not found
 */
export async function getClerkProfile(): Promise<ClerkProfile | null> {
  const { userId } = await auth()
  
  if (!userId) {
    return null
  }

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('clerk_user_id', userId)
    .single()

  if (error || !data) {
    console.error('Profile not found for Clerk user', error?.message)
    return null
  }

  return data as ClerkProfile
}

/**
 * Get profile by Clerk user ID (for webhook/admin use)
 */
export async function getProfileByClerkId(clerkUserId: string): Promise<ClerkProfile | null> {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('clerk_user_id', clerkUserId)
    .single()

  if (error || !data) {
    return null
  }

  return data as ClerkProfile
}

/**
 * Ensure a profile exists for the current Clerk user
 * Creates one if it doesn't exist (fallback for webhook failures)
 * Also links guest profiles by email if found
 */
export async function ensureClerkProfile(): Promise<ClerkProfile | null> {
  const { userId } = await auth()

  if (!userId) {
    return null
  }

  // Check if profile exists
  const existing = await getProfileByClerkId(userId)
  if (existing) {
    return existing
  }

  // Profile doesn't exist - get Clerk user data
  const user = await currentUser()
  if (!user) {
    return null
  }

  const rawEmail = user.emailAddresses.find(
    (e: { id: string }) => e.id === user.primaryEmailAddressId
  )?.emailAddress

  if (!rawEmail) {
    console.error('No primary email for Clerk user')
    return null
  }

  // Normalize email to lowercase for consistent storage
  const primaryEmail = rawEmail.toLowerCase()
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || primaryEmail.split('@')[0]

  // Check for guest profile to link (case-insensitive email match)
  const { data: guestProfile } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .ilike('email', primaryEmail)
    .is('clerk_user_id', null)
    .maybeSingle()

  if (guestProfile) {
    // Link the guest profile to this Clerk user
    const { data: linkedProfile, error: linkError } = await supabaseAdmin
      .from('profiles')
      .update({
        clerk_user_id: userId,
        email: primaryEmail,
        full_name: fullName,
        first_name: user.firstName || null,
        last_name: user.lastName || null,
        avatar_url: user.imageUrl || null,
        email_verified: true,
        email_verified_at: new Date().toISOString(),
      })
      .eq('id', guestProfile.id)
      .is('clerk_user_id', null) // Ensure still unlinked
      .select()
      .single()

    if (!linkError && linkedProfile) {
      return linkedProfile as ClerkProfile
    }
    // If linking failed, another process may have linked it - try to find it
    const nowLinked = await getProfileByClerkId(userId)
    if (nowLinked) {
      return nowLinked
    }
  }

  // No guest profile found - create new one
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .insert({
      clerk_user_id: userId,
      email: primaryEmail,
      full_name: fullName,
      first_name: user.firstName || null,
      last_name: user.lastName || null,
      avatar_url: user.imageUrl || null,
      role: 'patient',
      onboarding_completed: false,
      email_verified: true,
      email_verified_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    // Handle race condition - profile might have been created by webhook
    if (error.code === '23505') {
      const raceProfile = await getProfileByClerkId(userId)
      if (raceProfile) {
        return raceProfile
      }
    }
    console.error('Failed to create profile:', error)
    return null
  }

  return data as ClerkProfile
}
