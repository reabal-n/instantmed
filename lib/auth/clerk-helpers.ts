/**
 * Clerk Auth Helper Functions
 * 
 * Centralized utilities for migrating from Supabase auth to Clerk.
 * Use these to get user emails when you only have clerk_user_id.
 */

import { clerkClient } from "@clerk/nextjs/server"
import { createClient } from "@/lib/supabase/server"

/**
 * Get user email from Clerk user ID
 * Fallback to profile email if Clerk lookup fails
 */
export async function getUserEmailFromClerkId(clerkUserId: string): Promise<string | null> {
  try {
    // Try to get from Clerk first
    const client = await clerkClient()
    const user = await client.users.getUser(clerkUserId)
    return user.emailAddresses[0]?.emailAddress ?? null
  } catch {
    // Fallback: try to get from profile
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
}

/**
 * Get user email from auth_user_id (legacy Supabase user ID)
 * Useful for migration period
 */
export async function getUserEmailFromAuthUserId(authUserId: string): Promise<string | null> {
  try {
    const supabase = await createClient()
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, clerk_user_id")
      .eq("auth_user_id", authUserId)
      .single()
    
    if (!profile?.email) {
      return null
    }

    // If we have clerk_user_id, verify with Clerk (more reliable)
    if (profile.clerk_user_id) {
      return getUserEmailFromClerkId(profile.clerk_user_id)
    }

    return profile.email
  } catch {
    return null
  }
}

/**
 * Get full user info from Clerk ID
 */
export async function getClerkUserInfo(clerkUserId: string) {
  try {
    const client = await clerkClient()
    const user = await client.users.getUser(clerkUserId)
    
    return {
      id: user.id,
      email: user.emailAddresses[0]?.emailAddress ?? null,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: [user.firstName, user.lastName].filter(Boolean).join(' '),
      imageUrl: user.imageUrl,
    }
  } catch {
    return null
  }
}

/**
 * Batch get user emails from Clerk IDs
 * Useful for admin panels and lists
 */
export async function batchGetUserEmails(clerkUserIds: string[]): Promise<Map<string, string>> {
  const emailMap = new Map<string, string>()
  
  // Process in batches of 10 to avoid rate limits
  const batchSize = 10
  for (let i = 0; i < clerkUserIds.length; i += batchSize) {
    const batch = clerkUserIds.slice(i, i + batchSize)
    const promises = batch.map(async (id) => {
      const email = await getUserEmailFromClerkId(id)
      if (email) {
        emailMap.set(id, email)
      }
    })
    await Promise.all(promises)
  }
  
  return emailMap
}
