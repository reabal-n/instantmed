"use client"

import { usePathname } from "next/navigation"
import type { PostHog } from "posthog-js"
import {
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react"

import { trackAIReferral } from "@/lib/analytics/ai-referral"
import { resolvePostHogClient } from "@/lib/analytics/posthog-client-resolver"
import { PostHogContext, usePostHog } from "@/lib/analytics/posthog-context"
import { onFirstInteraction } from "@/lib/browser/first-interaction"
import { sanitizeUrl } from "@/lib/observability/sanitize-phi"
import { useAuth } from "@/lib/supabase/auth-provider"

/**
 * Local PostHog React Context - replaces `posthog-js/react`'s provider.
 *
 * Why a custom context instead of `posthog-js/react`'s `PostHogProvider`:
 * the upstream provider statically imports posthog-js core (~50KB) into
 * whatever chunk uses it, AND the previous wrapper pattern of "render
 * `<>{children}</>` until the dynamic import resolves, then swap to
 * `<Provider>{children}</Provider>`" caused a structural component change
 * that unmounted and remounted the entire children tree on initial load.
 * Each remount reset every `useInView` ref → IntersectionObservers re-fired
 * -> scroll-reveal animations replayed (the visible "fade in twice" bug).
 *
 * This implementation keeps the lazy posthog-js load *and* a stable React
 * tree by transitioning a Context value from `null -> posthog instance`.
 * Context value changes re-render consumers; they don't remount children.
 *
 * PostHog itself is initialized once in `instrumentation-client.ts` - this
 * provider only exposes the singleton through React context for components
 * that call `usePostHog()`.
 */

// Re-export usePostHog so existing `import { usePostHog } from "@/components/providers/posthog-provider"` still works.
export { usePostHog }

const POSTHOG_CONTEXT_RETRY_MS = 100
const POSTHOG_CONTEXT_MAX_RETRIES = 50

/**
 * Page View Tracker - fires `$pageview` on every client-side navigation.
 * `capture_pageview: false` is set in instrumentation-client.ts so we own
 * pageview tracking here for SPA route changes.
 */
function PostHogPageView() {
  const pathname = usePathname()
  const posthog = usePostHog()
  const aiReferralTracked = useRef(false)

  useEffect(() => {
    if (!pathname || !posthog) return
    const url = window.location.origin + pathname + window.location.search
    posthog.capture("$pageview", { $current_url: sanitizeUrl(url) })

    // Track AI referral once per session (first pageview only)
    if (!aiReferralTracked.current) {
      aiReferralTracked.current = true
      trackAIReferral()
    }
  }, [pathname, posthog])

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
    let retryCount = 0
    let retryTimer: ReturnType<typeof setTimeout> | null = null

    const clearRetry = () => {
      if (retryTimer === null) return
      clearTimeout(retryTimer)
      retryTimer = null
    }

    const exposeClient = ({ requireLoaded }: { requireLoaded: boolean }) => {
      if (!process.env.NEXT_PUBLIC_POSTHOG_KEY || process.env.NEXT_PUBLIC_PLAYWRIGHT === "1") {
        return
      }

      import("posthog-js")
        .then((module) => {
          if (!mounted) return

          const posthog = resolvePostHogClient(module)
          if (!posthog) return

          if (posthog.__loaded || !requireLoaded) {
            clearRetry()
            setClient(posthog)
            return
          }

          if (retryCount >= POSTHOG_CONTEXT_MAX_RETRIES) return
          retryCount += 1
          clearRetry()
          retryTimer = setTimeout(
            () => exposeClient({ requireLoaded: true }),
            POSTHOG_CONTEXT_RETRY_MS,
          )
        })
        .catch(() => {
          // PostHog unavailable (missing env vars, network) - render without it
        })
    }

    // Handles post-conversion pages where instrumentation starts immediately.
    exposeClient({ requireLoaded: true })

    // Handles acquisition + request pages where instrumentation-client.ts
    // intentionally defers PostHog init until the first real interaction.
    const cancelFirstInteraction = onFirstInteraction(() => {
      retryCount = 0
      exposeClient({ requireLoaded: false })
    })

    return () => {
      mounted = false
      clearRetry()
      cancelFirstInteraction()
    }
  }, [])

  return (
    <PostHogContext.Provider value={client}>
      <PostHogPageView />
      <PostHogIdentify />
      {children}
    </PostHogContext.Provider>
  )
}
