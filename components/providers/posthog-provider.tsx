"use client"

import { Suspense, useEffect, useState, useRef, type ReactNode } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { useUser } from "@clerk/nextjs"

/**
 * PostHog Page View Tracker
 *
 * Uses dynamic import to avoid module-level crash when posthog-js
 * can't initialize (e.g., missing env vars, preview environments).
 */
function PostHogPageView() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const posthogRef = useRef<any>(null)

  useEffect(() => {
    import("posthog-js").then(({ default: posthog }) => {
      if (posthog.__loaded) posthogRef.current = posthog
    }).catch(() => {})
  }, [])

  useEffect(() => {
    const posthog = posthogRef.current
    if (pathname && posthog) {
      let url = window.origin + pathname
      if (searchParams.toString()) {
        url = url + "?" + searchParams.toString()
      }
      posthog.capture("$pageview", { $current_url: url })
    }
  }, [pathname, searchParams])

  return null
}

/**
 * PostHog User Identification (inlined)
 *
 * Identifies Clerk users in PostHog. Inlined here instead of a separate module
 * to avoid webpack chunk factory race condition (Next.js #70703) where
 * splitChunks: false in dev forces all modules into one chunk, and a separate
 * module's factory could be undefined when layout.js evaluates.
 */
function PostHogIdentify() {
  const { user, isLoaded, isSignedIn } = useUser()
  const identifiedRef = useRef<string | null>(null)

  useEffect(() => {
    if (!isLoaded) return

    import("posthog-js").then(({ default: posthog }) => {
      if (!posthog.__loaded) return

      if (isSignedIn && user) {
        if (identifiedRef.current === user.id) return
        identifiedRef.current = user.id

        const primaryEmail = user.emailAddresses.find(
          e => e.id === user.primaryEmailAddressId
        )?.emailAddress

        posthog.identify(user.id, {
          email: primaryEmail,
          name: user.fullName || `${user.firstName} ${user.lastName}`.trim(),
          created_at: user.createdAt,
          is_internal: primaryEmail?.endsWith("@instantmed.com.au") ?? false,
        })
      } else if (!isSignedIn && identifiedRef.current) {
        posthog.reset()
        identifiedRef.current = null
      }
    }).catch(() => {
      // PostHog not available — skip silently
    })
  }, [isLoaded, isSignedIn, user])

  return null
}

/**
 * PostHog Provider
 *
 * Wraps children with PostHog context provider when available.
 * Uses dynamic imports to prevent posthog-js module-level crashes
 * from blocking the entire app.
 *
 * PostHog is initialized in instrumentation-client.ts — this provider
 * only sets up the React context and page view tracking.
 */
export function PostHogProvider({ children }: { children: ReactNode }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [providerState, setProviderState] = useState<{
    Provider: React.ComponentType<any>
    client: unknown
  } | null>(null)
  const loaded = useRef(false)

  useEffect(() => {
    if (loaded.current) return
    loaded.current = true

    Promise.all([
      import("posthog-js"),
      import("posthog-js/react"),
    ]).then(([posthogMod, reactMod]) => {
      const posthog = posthogMod.default
      if (posthog.__loaded) {
        setProviderState({
          Provider: reactMod.PostHogProvider,
          client: posthog,
        })
      }
    }).catch(() => {
      // PostHog not available — render without provider
    })
  }, [])

  const pageView = (
    <Suspense fallback={null}>
      <PostHogPageView />
    </Suspense>
  )

  if (!providerState) {
    return (
      <>
        {pageView}
        <PostHogIdentify />
        {children}
      </>
    )
  }

  const { Provider, client } = providerState
  return (
    <Provider client={client}>
      {pageView}
      <PostHogIdentify />
      {children}
    </Provider>
  )
}
