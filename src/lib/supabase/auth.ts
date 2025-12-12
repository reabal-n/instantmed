import { createClient } from './server'
import { redirect } from 'next/navigation'
import type { Profile, UserRole } from '@/types/database'

// ============================================
// SERVER-SIDE AUTH HELPERS
// ============================================

/**
 * Get the current authenticated user
 * Returns null if not authenticated
 */
export async function getUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    return null
  }
  
  return user
}

/**
 * Get the current user's profile
 * Returns null if not authenticated or profile doesn't exist
 */
export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('auth_user_id', user.id)
    .single()
  
  return profile as Profile | null
}

/**
 * Require authentication - redirects to login if not authenticated
 */
export async function requireAuth(redirectTo?: string) {
  const user = await getUser()
  
  if (!user) {
    const params = redirectTo ? `?redirect=${encodeURIComponent(redirectTo)}` : ''
    redirect(`/login${params}`)
  }
  
  return user
}

/**
 * Require profile - ensures user has a profile created
 */
export async function requireProfile(): Promise<Profile> {
  const profile = await getProfile()
  
  if (!profile) {
    redirect('/auth/complete-profile')
  }
  
  return profile
}

/**
 * Require specific role - redirects if user doesn't have the required role
 */
export async function requireRole(requiredRole: UserRole, fallbackPath: string = '/') {
  const profile = await requireProfile()
  
  if (profile.role !== requiredRole) {
    redirect(fallbackPath)
  }
  
  return profile
}

/**
 * Require admin role
 */
export async function requireAdmin() {
  return requireRole('admin', '/patient')
}

/**
 * Require patient role
 */
export async function requirePatient() {
  return requireRole('patient', '/admin')
}

/**
 * Check if current user is admin (without redirect)
 */
export async function isAdmin(): Promise<boolean> {
  const profile = await getProfile()
  return profile?.role === 'admin'
}

/**
 * Check if current user can approve high-risk intakes
 */
export async function canApproveHighRisk(): Promise<boolean> {
  const profile = await getProfile()
  return profile?.role === 'admin' && profile?.can_approve_high_risk === true
}

// ============================================
// AUTH ACTIONS
// ============================================

export interface AuthResult {
  success: boolean
  error?: string
  needsVerification?: boolean
}

/**
 * Sign in with email magic link
 */
export async function signInWithMagicLink(
  email: string,
  redirectTo?: string
): Promise<AuthResult> {
  const supabase = await createClient()
  
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback${redirectTo ? `?redirect=${redirectTo}` : ''}`,
    },
  })
  
  if (error) {
    return { success: false, error: error.message }
  }
  
  return { success: true, needsVerification: true }
}

/**
 * Sign in with email and password
 */
export async function signInWithPassword(
  email: string,
  password: string
): Promise<AuthResult> {
  const supabase = await createClient()
  
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
 * Sign up with email and password
 */
export async function signUpWithPassword(
  email: string,
  password: string,
  fullName: string,
  role: UserRole = 'patient'
): Promise<AuthResult> {
  const supabase = await createClient()
  
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
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
 * Sign out
 */
export async function signOut(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
}

/**
 * Request password reset
 */
export async function requestPasswordReset(email: string): Promise<AuthResult> {
  const supabase = await createClient()
  
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
  })
  
  if (error) {
    return { success: false, error: error.message }
  }
  
  return { success: true }
}

/**
 * Update password (for authenticated users)
 */
export async function updatePassword(newPassword: string): Promise<AuthResult> {
  const supabase = await createClient()
  
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  })
  
  if (error) {
    return { success: false, error: error.message }
  }
  
  return { success: true }
}

/**
 * Update user profile
 */
export async function updateProfile(
  updates: Partial<Profile>
): Promise<{ success: boolean; error?: string; profile?: Profile }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }
  
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('auth_user_id', user.id)
    .select()
    .single()
  
  if (error) {
    return { success: false, error: error.message }
  }
  
  return { success: true, profile: data as Profile }
}
