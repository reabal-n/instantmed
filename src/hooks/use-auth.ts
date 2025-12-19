'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User, Session } from '@supabase/supabase-js'
import type { Profile } from '@/types/database'

interface AuthState {
  user: User | null
  profile: Profile | null
  session: Session | null
  isLoading: boolean
  isAuthenticated: boolean
  isAdmin: boolean
}

/**
 * Hook to access auth state and methods
 */
export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    session: null,
    isLoading: true,
    isAuthenticated: false,
    isAdmin: false,
  })

  const supabase = createClient()

  // Fetch profile for a user
  const fetchProfile = useCallback(async (userId: string) => {
    if (!supabase) return null
    
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('auth_user_id', userId)
      .single()
    
    return data as Profile | null
  }, [supabase])

  // Initialize auth state
  useEffect(() => {
    if (!supabase) {
      setState(prev => ({ ...prev, isLoading: false }))
      return
    }

    // Get initial session
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user) {
          const profile = await fetchProfile(session.user.id)
          setState({
            user: session.user,
            profile,
            session,
            isLoading: false,
            isAuthenticated: true,
            isAdmin: profile?.role === 'admin',
          })
        } else {
          setState({
            user: null,
            profile: null,
            session: null,
            isLoading: false,
            isAuthenticated: false,
            isAdmin: false,
          })
        }
      } catch (error) {
        console.error('Auth init error:', error)
        setState(prev => ({ ...prev, isLoading: false }))
      }
    }

    initAuth()

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          const profile = await fetchProfile(session.user.id)
          setState({
            user: session.user,
            profile,
            session,
            isLoading: false,
            isAuthenticated: true,
            isAdmin: profile?.role === 'admin',
          })
        } else {
          setState({
            user: null,
            profile: null,
            session: null,
            isLoading: false,
            isAuthenticated: false,
            isAdmin: false,
          })
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, fetchProfile])

  // Refresh profile data
  const refreshProfile = useCallback(async () => {
    if (!state.user) return null
    const profile = await fetchProfile(state.user.id)
    setState(prev => ({ ...prev, profile, isAdmin: profile?.role === 'admin' }))
    return profile
  }, [state.user, fetchProfile])

  return {
    ...state,
    refreshProfile,
  }
}

/**
 * Hook to check if user has a specific role
 */
export function useRole(requiredRole: 'patient' | 'admin') {
  const { profile, isLoading, isAuthenticated } = useAuth()
  
  return {
    hasRole: profile?.role === requiredRole,
    isLoading,
    isAuthenticated,
    profile,
  }
}

/**
 * Hook for protected pages - redirects if not authenticated
 */
export function useRequireAuth(redirectTo: string = '/login') {
  const { isAuthenticated, isLoading, user, profile } = useAuth()
  
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      window.location.href = `${redirectTo}?redirect=${encodeURIComponent(window.location.pathname)}`
    }
  }, [isLoading, isAuthenticated, redirectTo])
  
  return { user, profile, isLoading: isLoading || !isAuthenticated }
}
