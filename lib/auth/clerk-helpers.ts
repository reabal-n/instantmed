/**
 * Clerk Auth Helper Functions
 * 
 * STUB FILE: Clerk is not currently installed.
 * This project uses Supabase auth via @/lib/auth instead.
 * For email lookups, use getUserEmailFromAuthUserId from @/lib/data/profiles.
 */

import { createClient } from "@/lib/supabase/server"

/**
 * Get user email from Clerk user ID - falls back to profile lookup
 */
export async function getUserEmailFromClerkId(clerkUserId: string): Promise<string | null> {
  try {
    const supabase = await createClient()
    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("clerk_user_id", clerkUserId)
      .single()
    
    return profile?.email ?? null
  } catch {
    return null
  }
}

/**
 * Get user email from auth_user_id (Supabase user ID)
 */
export async function getUserEmailFromAuthUserId(authUserId: string): Promise<string | null> {
  try {
    const supabase = await createClient()
    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("auth_user_id", authUserId)
      .single()
    
    return profile?.email ?? null
  } catch {
    return null
  }
}

/**
 * Get full user info from Clerk ID - stub that returns profile data
 */
export async function getClerkUserInfo(clerkUserId: string) {
  try {
    const supabase = await createClient()
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("clerk_user_id", clerkUserId)
      .single()
    
    if (!profile) return null
    
    return {
      id: clerkUserId,
      email: profile.email ?? null,
      firstName: profile.full_name?.split(' ')[0] ?? null,
      lastName: profile.full_name?.split(' ').slice(1).join(' ') ?? null,
      fullName: profile.full_name ?? '',
      imageUrl: profile.avatar_url ?? '',
    }
  } catch {
    return null
  }
}

/**
 * Batch get user emails from Clerk IDs
 */
export async function batchGetUserEmails(clerkUserIds: string[]): Promise<Map<string, string>> {
  const emailMap = new Map<string, string>()
  
  for (const id of clerkUserIds) {
    const email = await getUserEmailFromClerkId(id)
    if (email) {
      emailMap.set(id, email)
    }
  }
  
  return emailMap
}
