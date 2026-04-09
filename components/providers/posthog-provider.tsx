"use client"

import {
  Suspense,
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { useAuth } from "@/lib/supabase/auth-provider"
import type { PostHog } from "posthog-js"
import { trackAIReferral } from "@/lib/analytics/ai-referral"

/**
 * Local PostHog React Context — replaces `posthog-js/react`'s provider.
 *
 * Why a custom context instead of `posthog-js/react`'s `PostHogProvider`:
 * the upstream provider statically imports posthog-js core (~50KB) into
 * whatever chunk uses it, AND the previous wrapper pattern of "render
 * `<>{children}</>` until the dynamic import resolves, then swap to
 * `<Provider>{children}</Provider>`" caused a structural component change
 * that unmounted and remounted the entire children tree on initial load.
 * Each remount reset every `useInView` ref → IntersectionObservers re-fired
 * → scroll-reveal animations replayed (the visible "fade in twice" bug).
 *
 * This implementation keeps the lazy posthog-js load *and* a stable React
 * tree by transitioning a Context value from `null → posthog instance`.
 * Context value changes re-render consumers; they don't remount children.
 *
 * PostHog itself is initialized once in `instrumentation-client.ts` — this
 * provider only exposes the singleton through React context for components
 * that call `usePostHog()`.
 */
const PostHogContext = createContext<PostHog | null>(null)

export function usePostHog(): PostHog | null {
  return useContext(PostHogContext)
}

/**
 * Page View Tracker — fires `$pageview` on every client-side navigation.
 * `capture_pageview: false` is set in instrumentation-client.ts so we own
 * pageview tracking here for SPA route changes.
 */
function PostHogPageView() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const posthog = usePostHog()
  const aiReferralTracked = useRef(false)

  useEffect(() => {
    if (!pathname || !posthog) return
    let url = window.origin + pathname
    if (searchParams.toString()) url += "?" + searchParams.toString()
    posthog.capture("$pageview", { $current_url: url })

    // Track AI referral once per session (first pageview only)
    if (!aiReferralTracked.current) {
      aiReferralTracked.current = true
      trackAIReferral()
    }
  }, [pathname, searchParams, posthog])

  return null
}

/**
 * Identify users in PostHog when they sign in. Reset on sign-out.
 */
function PostHogIdentify() {
  const { user, isLoaded, isSignedIn } = useAuth()
  const posthog = usePostHog()
  const identifiedRef = useRef<string | null>(null)

  useEffect(() => {
    if (!isLoaded || !posthog) return

    if (isSignedIn && user) {
      if (identifiedRef.current === user.id) return
      identifiedRef.current = user.id

      posthog.identify(user.id, {
        email: user.email,
        name: user.user_metadata?.full_name || user.email?.split("@")[0],
        created_at: user.created_at,
        is_internal: user.email?.endsWith("@instantmed.com.au") ?? false,
      })
    } else if (!isSignedIn && identifiedRef.current) {
      posthog.reset()
      identifiedRef.current = null
    }
  }, [isLoaded, isSignedIn, user, posthog])

  return null
}

export function PostHogProvider({ children }: { children: ReactNode }) {
  const [client, setClient] = useState<PostHog | null>(null)

  useEffect(() => {
    let mounted = true
    import("posthog-js")
      .then(({ default: posthog }) => {
        if (mounted && posthog.__loaded) setClient(posthog)
      })
      .catch(() => {
        // PostHog unavailable (missing env vars, network) — render without it
      })
    return () => {
      mounted = false
    }
  }, [])

  return (
    <PostHogContext.Provider value={client}>
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      <PostHogIdentify />
      {children}
    </PostHogContext.Provider>
  )
}
