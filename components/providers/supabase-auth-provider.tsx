"use client"

import { createContext, useContext, useEffect, useState, useCallback, useMemo, type ReactNode } from "react"
import { createClient } from "@/lib/supabase/client"
import type { User, Session } from "@supabase/supabase-js"
import type { Profile } from "@/types/db"

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: Profile | null
  isLoading: boolean
  isSignedIn: boolean
  signOut: () => Promise<void>
  signInWithGoogle: (redirectTo?: string) => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>
  signUpWithEmail: (email: string, password: string, metadata?: { full_name?: string }) => Promise<{ error: Error | null }>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function SupabaseAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  
  const supabase = useMemo(() => {
    try {
      return createClient()
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[Auth] Failed to create Supabase client:', error)
      return null
    }
  }, [])

  const fetchProfile = useCallback(async (userId: string) => {
    if (!supabase) return
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('auth_user_id', userId)
      .single()
    
    setProfile(data as Profile | null)
  }, [supabase])

  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      await fetchProfile(user.id)
    }
  }, [user?.id, fetchProfile])

  useEffect(() => {
    // If Supabase client failed to initialize, stop loading
    if (!supabase) {
      setIsLoading(false)
      return
    }

    // Get initial session
    const initializeAuth = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession()
        
        setSession(initialSession)
        setUser(initialSession?.user ?? null)
        
        if (initialSession?.user?.id) {
          await fetchProfile(initialSession.user.id)
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('[Auth] Failed to initialize:', error)
      } finally {
        setIsLoading(false)
      }
    }

    initializeAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase!.auth.onAuthStateChange(
      async (event, newSession) => {
        setSession(newSession)
        setUser(newSession?.user ?? null)
        
        if (newSession?.user?.id) {
          await fetchProfile(newSession.user.id)
        } else {
          setProfile(null)
        }
        
        setIsLoading(false)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, fetchProfile])

  const signOut = useCallback(async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
    setProfile(null)
  }, [supabase])

  const signInWithGoogle = useCallback(async (redirectTo?: string) => {
    if (!supabase) {
      throw new Error('Supabase client not initialized')
    }
    const callbackUrl = redirectTo 
      ? `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirectTo)}`
      : `${window.location.origin}/auth/callback`
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: callbackUrl,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })
    
    if (error) {
      throw error
    }
  }, [supabase])

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    if (!supabase) {
      return { error: new Error('Supabase client not initialized') }
    }
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { error }
  }, [supabase])

  const signUpWithEmail = useCallback(async (
    email: string, 
    password: string, 
    metadata?: { full_name?: string }
  ) => {
    if (!supabase) {
      return { error: new Error('Supabase client not initialized') }
    }
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    return { error }
  }, [supabase])

  const value = useMemo(() => ({
    user,
    session,
    profile,
    isLoading,
    isSignedIn: !!user,
    signOut,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    refreshProfile,
  }), [user, session, profile, isLoading, signOut, signInWithGoogle, signInWithEmail, signUpWithEmail, refreshProfile])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within a SupabaseAuthProvider')
  }
  return context
}

// Convenience hooks that mirror common auth provider patterns
export function useUser() {
  const { user, profile, isLoading } = useAuth()
  return {
    user,
    profile,
    isLoaded: !isLoading,
    isSignedIn: !!user,
  }
}

