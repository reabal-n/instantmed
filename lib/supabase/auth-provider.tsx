'use client'

import type { Session, User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

import { onFirstInteraction } from '@/lib/browser/first-interaction'

const AUTH_IMMEDIATE_PATH_PREFIXES = [
  '/account',
  '/admin',
  '/auth',
  '/dashboard',
  '/doctor',
  '/patient',
  '/sign-in',
  '/sign-up',
]

// Public marketing routes also need a fast auth check so the nav can show
// "Dashboard" instead of "Log in" for already-signed-in users. The cost is
// one Supabase session read (~100ms typical) that runs in the background;
// the gain is no auth flicker on the homepage / service pages. Anonymous
// users hit the same call but the provider resolves to `isLoaded=true`
// with `user=null` and the nav settles on "Log in".
const AUTH_IMMEDIATE_ROOT_PATHS = new Set([
  '/',
  '/medical-certificate',
  '/prescriptions',
  '/consult',
  '/erectile-dysfunction',
  '/hair-loss',
  '/about',
  '/pricing',
  '/contact',
  '/request',
])

function shouldLoadAuthImmediately(pathname: string) {
  if (AUTH_IMMEDIATE_ROOT_PATHS.has(pathname)) return true
  return AUTH_IMMEDIATE_PATH_PREFIXES.some((prefix) =>
    pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
}

function scheduleIdle(callback: () => void, timeout = 1500) {
  if (typeof requestIdleCallback !== 'undefined') {
    const id = requestIdleCallback(callback, { timeout })
    return () => cancelIdleCallback(id)
  }

  const id = setTimeout(callback, 0)
  return () => clearTimeout(id)
}

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

  useEffect(() => {
    let cancelled = false
    let subscription: { unsubscribe: () => void } | null = null
    let cancelInteraction: (() => void) | null = null
    let cancelIdleLoad: (() => void) | null = null

    // E2E bypass: __e2e_auth_role cookie is readable client-side (non-httpOnly).
    // Skip Supabase session check to prevent SIGNED_OUT → router.refresh() redirect chain.
    if (typeof document !== 'undefined' && document.cookie.includes('__e2e_auth_role=')) {
      setIsLoaded(true)
      return
    }

    const loadAuth = () => {
      void import('@/lib/supabase/client')
        .then(async ({ createClient }) => {
          if (cancelled) return

          const supabase = createClient()
          const { data } = supabase.auth.onAuthStateChange(
            (_event, newSession) => {
              setSession(newSession)
              setUser(newSession?.user ?? null)
              setIsLoaded(true)

              // Refresh server-side state when auth changes
              if (_event === 'SIGNED_IN' || _event === 'SIGNED_OUT' || _event === 'TOKEN_REFRESHED') {
                router.refresh()
              }

              // Sentry user context. Signed-out clears, signed-in tags
              // future events with the user id so the next portal error
              // is attributable. Email + role kept out of the tag set —
              // role is read server-side in Sentry beforeSend if needed,
              // and email would expand the user-data fingerprint past
              // what we want to ship to Sentry per PHI policy.
              void import('@sentry/nextjs')
                .then((Sentry) => {
                  if (newSession?.user) {
                    Sentry.setUser({ id: newSession.user.id })
                  } else {
                    Sentry.setUser(null)
                  }
                })
                .catch(() => undefined)
            }
          )

          if (cancelled) {
            data.subscription.unsubscribe()
            return
          }

          subscription = data.subscription

          const { data: { session: initialSession } } = await supabase.auth.getSession()
          if (cancelled) return

          setSession(initialSession)
          setUser(initialSession?.user ?? null)
          setIsLoaded(true)
        })
        .catch(() => {
          if (!cancelled) setIsLoaded(true)
        })
    }

    const pathname = typeof window !== 'undefined' ? window.location.pathname : ''
    if (shouldLoadAuthImmediately(pathname)) {
      loadAuth()
    } else {
      cancelInteraction = onFirstInteraction(() => {
        cancelIdleLoad = scheduleIdle(loadAuth)
      })
    }

    return () => {
      cancelled = true
      cancelInteraction?.()
      cancelIdleLoad?.()
      subscription?.unsubscribe()
    }
  }, [router])

  const signOut = useCallback(async () => {
    // Always clear local state and navigate, even if the network revoke fails.
    // - scope: 'local' clears this device only and skips the revoke RPC, so an
    //   expired/invalid refresh token can't 401 us into a stuck UI.
    // - The /api/auth/sign-out POST clears the httpOnly `profile_linked` cookie
    //   so the next sign-in's profile-linking safety net runs again.
    // - window.location.assign performs a full document load: kills any race
    //   with onAuthStateChange's router.refresh() that would otherwise trip
    //   middleware into redirecting to /sign-in?redirect=/patient.
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()

      await Promise.allSettled([
        supabase.auth.signOut({ scope: 'local' }),
        fetch('/api/auth/sign-out', { method: 'POST', credentials: 'same-origin' }),
      ])
    } finally {
      if (typeof window !== 'undefined') {
        window.location.assign('/')
      } else {
        router.push('/')
        router.refresh()
      }
    }
  }, [router])

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
