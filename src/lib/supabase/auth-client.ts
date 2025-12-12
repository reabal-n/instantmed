'use client'

import { createClient } from './client'
import type { UserRole } from '@/types/database'

// ============================================
// CLIENT-SIDE AUTH HELPERS
// ============================================

/**
 * Sign in with email magic link (client-side)
 */
export async function signInWithMagicLink(
  email: string,
  redirectTo?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()
  
  if (!supabase) {
    return { success: false, error: 'Supabase client not available' }
  }
  
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback${redirectTo ? `?redirect=${encodeURIComponent(redirectTo)}` : ''}`,
    },
  })
  
  if (error) {
    return { success: false, error: error.message }
  }
  
  return { success: true }
}

/**
 * Sign in with email and password (client-side)
 */
export async function signInWithPassword(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()
  
  if (!supabase) {
    return { success: false, error: 'Supabase client not available' }
  }
  
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  
  if (error) {
    if (error.message.includes('Invalid login credentials')) {
      return { success: false, error: 'Invalid email or password' }
    }
    return { success: false, error: error.message }
  }
  
  return { success: true }
}

/**
 * Sign up with email and password (client-side)
 */
export async function signUpWithPassword(
  email: string,
  password: string,
  fullName: string,
  role: UserRole = 'patient'
): Promise<{ success: boolean; error?: string; needsVerification?: boolean }> {
  const supabase = createClient()
  
  if (!supabase) {
    return { success: false, error: 'Supabase client not available' }
  }
  
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
      data: {
        full_name: fullName,
        role,
      },
    },
  })
  
  if (error) {
    if (error.message.includes('already registered')) {
      return { success: false, error: 'An account with this email already exists' }
    }
    return { success: false, error: error.message }
  }
  
  return { success: true, needsVerification: true }
}

/**
 * Sign out (client-side)
 */
export async function signOut(): Promise<void> {
  const supabase = createClient()
  
  if (supabase) {
    await supabase.auth.signOut()
  }
  
  // Redirect to home after sign out
  window.location.href = '/'
}

/**
 * Request password reset (client-side)
 */
export async function requestPasswordReset(
  email: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()
  
  if (!supabase) {
    return { success: false, error: 'Supabase client not available' }
  }
  
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  })
  
  if (error) {
    return { success: false, error: error.message }
  }
  
  return { success: true }
}

/**
 * Get current session (client-side)
 */
export async function getSession() {
  const supabase = createClient()
  
  if (!supabase) {
    return null
  }
  
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

/**
 * Get current user (client-side)
 */
export async function getUser() {
  const supabase = createClient()
  
  if (!supabase) {
    return null
  }
  
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

/**
 * Subscribe to auth state changes
 */
export function onAuthStateChange(
  callback: (event: string, session: unknown) => void
) {
  const supabase = createClient()
  
  if (!supabase) {
    return { data: { subscription: { unsubscribe: () => {} } } }
  }
  
  return supabase.auth.onAuthStateChange(callback)
}
