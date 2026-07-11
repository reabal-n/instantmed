'use client'

import type { Session, User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

import { onFirstInteraction } from '@/lib/browser/first-interaction'
import {
  AUTH_HANDOFF_EVENT,
  AUTH_HANDOFF_REFRESH_SUPPRESSION_MS,
  AUTH_HANDOFF_STORAGE_KEY,
  createAuthHandoffRefreshGuard,
} from '@/lib/navigation/auth-handoff'
import { clearInstantMedBrowserCaches } from '@/lib/security/browser-cache-cleanup'

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
//
// /request is intentionally excluded. The server component already resolves
// the cookie-backed user/profile for intake prefill, and loading the Supabase
// browser client during hydration adds a mobile TBT long task to the paid flow.
const AUTH_IMMEDIATE_ROOT_PATHS = new Set([
  '/',
  '/medical-certificate',
  '/prescriptions',
  '/consult',
  '/erectile-dysfunction',
  '/hair-loss',
  '/womens-health',
  '/about',
  '/pricing',
  '/contact',
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

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null

  const prefix = `${name}=`
  return document.cookie
    .split(';')
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(prefix))
    ?.slice(prefix.length) ?? null
}

function buildE2EClientUser(): User | null {
  const role = readCookie('__e2e_auth_role')
  if (!role) return null

  const isAdmin = readCookie('__e2e_auth_is_admin') === 'true'
  const label = isAdmin
    ? 'E2E Operator'
    : role === 'support'
      ? 'E2E Support'
      : role === 'doctor'
        ? 'E2E Doctor'
        : 'E2E Patient'

  return {
    id: `e2e-${role}`,
    app_metadata: { provider: 'e2e', providers: ['e2e'] },
    aud: 'authenticated',
    created_at: '1970-01-01T00:00:00.000Z',
    user_metadata: { full_name: label, role },
  } as User
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
  // Tracks the prior auth user id so we only router.refresh() on a real identity
  // transition (see the onAuthStateChange handler below).
  const prevUserIdRef = useRef<string | null>(null)
  const initialAuthResolvedRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    let subscription: { unsubscribe: () => void } | null = null
    let cancelInteraction: (() => void) | null = null
    let cancelIdleLoad: (() => void) | null = null
    let cancelSentryUserInteraction: (() => void) | null = null
    let cancelSentryUserIdle: (() => void) | null = null
    const authHandoffRefreshGuard = createAuthHandoffRefreshGuard()

    // Check whether a full-page navigation was initiated by navigateToPostSignIn.
    // The in-memory AUTH_HANDOFF_EVENT guard doesn't survive hard navigation —
    // sessionStorage does. If the flag is recent (< suppression window), activate
    // the guard now so that the initial TOKEN_REFRESHED/SIGNED_IN event from the
    // Supabase SDK does NOT call router.refresh() while React is still hydrating
    // the server-rendered HTML. That race produces "Application error: a
    // client-side exception has occurred" on every Dashboard click from a
    // marketing page.
    try {
      const storedTs = sessionStorage.getItem(AUTH_HANDOFF_STORAGE_KEY)
      if (storedTs) {
        const elapsed = Date.now() - Number(storedTs)
        if (elapsed >= 0 && elapsed < AUTH_HANDOFF_REFRESH_SUPPRESSION_MS) {
          authHandoffRefreshGuard.suppress()
        }
        // Always clear — one-shot flag; stale entries should not linger.
        sessionStorage.removeItem(AUTH_HANDOFF_STORAGE_KEY)
      }
    } catch {
      // sessionStorage unavailable — proceed without the cross-nav guard.
    }

    const suppressAuthRefreshForHandoff = () => {
      authHandoffRefreshGuard.suppress()
    }

    const syncSentryUserContext = (newSession: Session | null) => {
      cancelSentryUserInteraction?.()
      cancelSentryUserIdle?.()

      // Keep the Sentry browser bundle off the anonymous /request critical path.
      // Error capture is initialized from instrumentation-client.ts after user
      // interaction; this only adds user attribution when telemetry is already
      // worth paying for.
      cancelSentryUserInteraction = onFirstInteraction(() => {
        cancelSentryUserIdle = scheduleIdle(() => {
          void import('@sentry/nextjs')
            .then((Sentry) => {
              if (newSession?.user) {
                Sentry.setUser({ id: newSession.user.id })
              } else {
                Sentry.setUser(null)
              }
            })
            .catch(() => undefined)
        }, 2500)
      })
    }

    // E2E bypass: __e2e_auth_role cookie is readable client-side (non-httpOnly).
    // Skip Supabase session check to prevent SIGNED_OUT → router.refresh() redirect chain.
    const e2eUser = buildE2EClientUser()
    if (e2eUser) {
      setUser(e2eUser)
      setIsLoaded(true)
      return
    }

    window.addEventListener(AUTH_HANDOFF_EVENT, suppressAuthRefreshForHandoff)

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

              const nextUserId = newSession?.user?.id ?? null
              const prevUserId = prevUserIdRef.current
              const hasResolvedInitialAuth = initialAuthResolvedRef.current
              prevUserIdRef.current = nextUserId

              if (!hasResolvedInitialAuth) {
                syncSentryUserContext(newSession)
                return
              }

              // Refresh server-side state when auth changes
              if (_event === 'SIGNED_IN' || _event === 'SIGNED_OUT' || _event === 'TOKEN_REFRESHED') {
                if (authHandoffRefreshGuard.shouldSuppress()) return
                // A guest with a stale/dead session cookie fires SIGNED_OUT with no
                // real identity change (null -> null). Refreshing then visibly
                // reloads the page (e.g. mid-/request) for nothing — skip it.
                if (prevUserId === null && nextUserId === null) return
                router.refresh()
              }

              syncSentryUserContext(newSession)
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
          prevUserIdRef.current = initialSession?.user?.id ?? null
          initialAuthResolvedRef.current = true
          setIsLoaded(true)
          syncSentryUserContext(initialSession)
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
      cancelSentryUserInteraction?.()
      cancelSentryUserIdle?.()
      window.removeEventListener(AUTH_HANDOFF_EVENT, suppressAuthRefreshForHandoff)
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
        clearInstantMedBrowserCaches(),
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
