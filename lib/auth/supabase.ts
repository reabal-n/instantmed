/**
 * Authentication Helpers using Clerk + Supabase
 * 
 * Server-side utilities for working with Clerk authentication
 * and Supabase for data storage.
 */

import { redirect } from 'next/navigation'
import { auth as clerkAuth, currentUser } from '@clerk/nextjs/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import type { Profile } from '@/types/db'

export interface SupabaseAuthenticatedUser {
  userId: string
  email: string | null
  fullName: string | null
  avatarUrl: string | null
  profile: Profile | null
}

/**
 * Get the current authenticated user from Clerk with their database profile.
 * Returns null if not authenticated.
 */
export async function getSupabaseUserWithProfile(): Promise<SupabaseAuthenticatedUser | null> {
  const { userId } = await clerkAuth()
  
  if (!userId) {
    return null
  }

  const user = await currentUser()
  if (!user) {
    return null
  }

  const supabase = createServiceRoleClient()

  // Fetch the profile from your database using Clerk user ID
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('clerk_user_id', userId)
    .single()

  const primaryEmail = user.emailAddresses.find(
    e => e.id === user.primaryEmailAddressId
  )?.emailAddress

  return {
    userId,
    email: primaryEmail ?? null,
    fullName: user.fullName ?? null,
    avatarUrl: user.imageUrl ?? null,
    profile: profile as Profile | null,
  }
}

/**
 * Get just the Clerk auth state.
 * Faster than getSupabaseUserWithProfile when you don't need full user data.
 */
export async function getSupabaseAuth() {
  const { userId } = await clerkAuth()
  return { userId: userId ?? null, sessionId: null }
}

/**
 * Require authentication. Redirects to sign-in if not authenticated.
 */
export async function requireSupabaseAuth(): Promise<SupabaseAuthenticatedUser> {
  const user = await getSupabaseUserWithProfile()
  
  if (!user) {
    redirect('/sign-in')
  }

  return user
}

/**
 * Require authentication with a specific role.
 * Redirects to sign-in if not authenticated, or to the correct dashboard if wrong role.
 */
export async function requireSupabaseAuthWithRole(
  requiredRole: 'patient' | 'doctor' | 'admin'
): Promise<SupabaseAuthenticatedUser> {
  const user = await getSupabaseUserWithProfile()
  
  if (!user) {
    redirect('/sign-in')
  }

  if (!user.profile) {
    // No profile yet - redirect to onboarding
    redirect('/patient/onboarding')
  }

  const effectiveRole = user.profile.role === 'admin' ? 'doctor' : user.profile.role

  if (effectiveRole !== requiredRole && user.profile.role !== 'admin') {
    // Redirect to the correct dashboard based on role
    if (user.profile.role === 'patient') {
      redirect('/patient')
    } else if (user.profile.role === 'doctor') {
      redirect('/doctor')
    } else if (user.profile.role === 'admin') {
      redirect('/doctor')
    }
  }

  return user
}

/**
 * Check if user has completed onboarding.
 * Redirects to onboarding if not complete.
 */
export async function requireOnboardingComplete(): Promise<SupabaseAuthenticatedUser> {
  const user = await requireSupabaseAuth()

  if (!user.profile?.onboarding_completed) {
    redirect('/patient/onboarding')
  }

  return user
}

/**
 * Get user email from Clerk user ID
 */
export async function getUserEmailFromUserId(clerkUserId: string): Promise<string | null> {
  const supabase = createServiceRoleClient()
  
  // Get from profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("email")
    .eq("clerk_user_id", clerkUserId)
    .single()
  
  return profile?.email ?? null
}

/**
 * Get full user info from Clerk user ID
 */
export async function getSupabaseUserInfo(clerkUserId: string) {
  const supabase = createServiceRoleClient()
  
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("clerk_user_id", clerkUserId)
    .single()
  
  if (!profile) return null
  
  return {
    id: clerkUserId,
    email: profile.email,
    firstName: profile.first_name ?? profile.full_name?.split(' ')[0] ?? null,
    lastName: profile.last_name ?? profile.full_name?.split(' ').slice(1).join(' ') ?? null,
    fullName: profile.full_name,
    imageUrl: profile.avatar_url,
  }
}

/**
 * Batch get user emails from Clerk user IDs
 */
export async function batchGetUserEmails(clerkUserIds: string[]): Promise<Map<string, string>> {
  const supabase = createServiceRoleClient()
  const emailMap = new Map<string, string>()
  
  const { data: profiles } = await supabase
    .from("profiles")
    .select("clerk_user_id, email")
    .in("clerk_user_id", clerkUserIds)
  
  if (profiles) {
    for (const profile of profiles) {
      if (profile.clerk_user_id && profile.email) {
        emailMap.set(profile.clerk_user_id, profile.email)
      }
    }
  }
  
  return emailMap
}

