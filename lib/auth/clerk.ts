/**
 * Clerk Authentication Helpers
 * 
 * STUB FILE: Clerk is not currently installed.
 * This project uses Supabase auth via @/lib/auth instead.
 * These exports throw errors if called - use @/lib/auth instead.
 */

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

const STUB_ERROR = 'Clerk is not installed. Use @/lib/auth instead.'

export async function getClerkUserWithProfile(): Promise<ClerkAuthenticatedUser | null> {
  throw new Error(STUB_ERROR)
}

export async function getClerkAuth() {
  throw new Error(STUB_ERROR)
}

export async function requireClerkAuth(): Promise<ClerkAuthenticatedUser> {
  throw new Error(STUB_ERROR)
}

export async function requireClerkAuthWithRole(
  _requiredRole: 'patient' | 'doctor' | 'admin'
): Promise<ClerkAuthenticatedUser> {
  throw new Error(STUB_ERROR)
}

export async function requireOnboardingComplete(): Promise<ClerkAuthenticatedUser> {
  throw new Error(STUB_ERROR)
}
