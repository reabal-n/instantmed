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

  // Profile doesn't exist - create it from Clerk user data
  const user = await currentUser()
  if (!user) {
    return null
  }

  const primaryEmail = user.emailAddresses.find(
    (e: { id: string }) => e.id === user.primaryEmailAddressId
  )?.emailAddress

  if (!primaryEmail) {
    console.error('No primary email for Clerk user')
    return null
  }

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || primaryEmail.split('@')[0]

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
    })
    .select()
    .single()

  if (error) {
    console.error('Failed to create profile:', error)
    return null
  }

  return data as ClerkProfile
}
