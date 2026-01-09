/**
 * Supabase Authentication Helpers
 * 
 * Server-side utilities for working with Supabase authentication.
 */

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/types/db'

export interface SupabaseAuthenticatedUser {
  userId: string
  email: string | null
  fullName: string | null
  avatarUrl: string | null
  profile: Profile | null
}

/**
 * Get the current authenticated user from Supabase with their database profile.
 * Returns null if not authenticated.
 */
export async function getSupabaseUserWithProfile(): Promise<SupabaseAuthenticatedUser | null> {
  const supabase = await createClient()
  
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    return null
  }

  // Fetch the profile from your database using Supabase user ID
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('auth_user_id', user.id)
    .single()

  return {
    userId: user.id,
    email: user.email ?? null,
    fullName: user.user_metadata?.full_name ?? null,
    avatarUrl: user.user_metadata?.avatar_url ?? null,
    profile: profile as Profile | null,
  }
}

/**
 * Get just the Supabase auth state (user session).
 * Faster than getSupabaseUserWithProfile when you don't need full user data.
 */
export async function getSupabaseAuth() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    return { userId: null, sessionId: null }
  }
  
  const { data: { session } } = await supabase.auth.getSession()
  
  return { 
    userId: user.id, 
    sessionId: session?.access_token ?? null 
  }
}

/**
 * Require authentication. Redirects to sign-in if not authenticated.
 */
export async function requireSupabaseAuth(): Promise<SupabaseAuthenticatedUser> {
  const user = await getSupabaseUserWithProfile()
  
  if (!user) {
    redirect('/auth/login')
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
    redirect('/auth/login')
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
 * Get user email from Supabase user ID
 */
export async function getUserEmailFromUserId(userId: string): Promise<string | null> {
  const supabase = await createClient()
  
  // Try to get from profile first (most common case)
  const { data: profile } = await supabase
    .from("profiles")
    .select("email")
    .eq("auth_user_id", userId)
    .single()
  
  return profile?.email ?? null
}

/**
 * Get full user info from Supabase user ID
 */
export async function getSupabaseUserInfo(userId: string) {
  const supabase = await createClient()
  
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("auth_user_id", userId)
    .single()
  
  if (!profile) return null
  
  return {
    id: userId,
    email: profile.email,
    firstName: profile.full_name?.split(' ')[0] ?? null,
    lastName: profile.full_name?.split(' ').slice(1).join(' ') ?? null,
    fullName: profile.full_name,
    imageUrl: profile.avatar_url,
  }
}

/**
 * Batch get user emails from user IDs
 */
export async function batchGetUserEmails(userIds: string[]): Promise<Map<string, string>> {
  const supabase = await createClient()
  const emailMap = new Map<string, string>()
  
  const { data: profiles } = await supabase
    .from("profiles")
    .select("auth_user_id, email")
    .in("auth_user_id", userIds)
  
  if (profiles) {
    for (const profile of profiles) {
      if (profile.auth_user_id && profile.email) {
        emailMap.set(profile.auth_user_id, profile.email)
      }
    }
  }
  
  return emailMap
}

