'use client'

import type { Session,User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef,useState } from 'react'

import { createClient } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────────────────────

interface AuthContext {
  /** Supabase Auth user object (null if not signed in) */
  user: User | null
  /** Active session (null if not signed in) */
  session: Session | null
  /** True once the initial auth state has been resolved */
  isLoaded: boolean
  /** Convenience - true when user is non-null */
  isSignedIn: boolean
  /** Sign out and redirect to home */
  signOut: () => Promise<void>
}

const AuthCtx = createContext<AuthContext | null>(null)

// ─── Provider ─────────────────────────────────────────────────────────

interface SupabaseAuthProviderProps {
  children: React.ReactNode
}

export function SupabaseAuthProvider({ children }: SupabaseAuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const initializedRef = useRef(false)

  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    // E2E bypass: __e2e_auth_role cookie is readable client-side (non-httpOnly).
    // Skip Supabase session check to prevent SIGNED_OUT → router.refresh() redirect chain.
    if (typeof document !== 'undefined' && document.cookie.includes('__e2e_auth_role=')) {
      setIsLoaded(true)
      return
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession)
      setUser(initialSession?.user ?? null)
      setIsLoaded(true)
    })

    // Listen for auth state changes (sign in, sign out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession)
        setUser(newSession?.user ?? null)
        setIsLoaded(true)

        // Refresh server-side state when auth changes
        if (_event === 'SIGNED_IN' || _event === 'SIGNED_OUT' || _event === 'TOKEN_REFRESHED') {
          router.refresh()
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, router])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }, [supabase, router])

  const value = useMemo<AuthContext>(() => ({
    user,
    session,
    isLoaded,
    isSignedIn: !!user,
    signOut,
  }), [user, session, isLoaded, signOut])

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}

// ─── Hook ─────────────────────────────────────────────────────────────

/**
 * Access auth state in client components.
 * Client-side auth hook providing user, session, and sign-out.
 *
 * @example
 * const { user, isSignedIn, signOut } = useAuth()
 */
export function useAuth(): AuthContext {
  const ctx = useContext(AuthCtx)
  if (!ctx) {
    throw new Error('useAuth must be used within <SupabaseAuthProvider>')
  }
  return ctx
}
