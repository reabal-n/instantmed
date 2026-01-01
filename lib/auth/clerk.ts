/**
 * Clerk Authentication Helpers
 * 
 * Server-side utilities for working with Clerk authentication.
 * Replaces the previous Supabase auth helpers.
 */

import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/types/db'

export interface ClerkAuthenticatedUser {
  userId: string
  email: string | null
  firstName: string | null
  lastName: string | null
  fullName: string | null
  imageUrl: string
  profile: Profile | null
}

/**
 * Get the current authenticated user from Clerk with their database profile.
 * Returns null if not authenticated.
 */
export async function getClerkUserWithProfile(): Promise<ClerkAuthenticatedUser | null> {
  const user = await currentUser()
  
  if (!user) {
    return null
  }

  // Fetch the profile from your database using Clerk user ID
  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('clerk_user_id', user.id)
    .single()

  return {
    userId: user.id,
    email: user.emailAddresses[0]?.emailAddress ?? null,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: user.fullName,
    imageUrl: user.imageUrl,
    profile: profile as Profile | null,
  }
}

/**
 * Get just the Clerk auth state (userId, sessionId).
 * Faster than getClerkUserWithProfile when you don't need full user data.
 */
export async function getClerkAuth() {
  return await auth()
}

/**
 * Require authentication. Redirects to sign-in if not authenticated.
 */
export async function requireClerkAuth(): Promise<ClerkAuthenticatedUser> {
  const user = await getClerkUserWithProfile()
  
  if (!user) {
    redirect('/sign-in')
  }

  return user
}

/**
 * Require authentication with a specific role.
 * Redirects to sign-in if not authenticated, or to the correct dashboard if wrong role.
 */
export async function requireClerkAuthWithRole(
  requiredRole: 'patient' | 'doctor' | 'admin'
): Promise<ClerkAuthenticatedUser> {
  const user = await getClerkUserWithProfile()
  
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
      redirect('/admin')
    }
  }

  return user
}

/**
 * Check if user has completed onboarding.
 * Redirects to onboarding if not complete.
 */
export async function requireOnboardingComplete(): Promise<ClerkAuthenticatedUser> {
  const user = await requireClerkAuth()

  if (!user.profile?.onboarding_completed) {
    redirect('/patient/onboarding')
  }

  return user
}
