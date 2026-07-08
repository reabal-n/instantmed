"use client"

import { type ComponentType,type ReactNode,useEffect, useState } from "react"

import { onFirstInteraction } from "@/lib/browser/first-interaction"
import { isPostConversionPath } from "@/lib/browser/post-conversion-path"

/**
 * Lazy loader for PostHogProvider.
 *
 * Renders children immediately, then loads PostHog only after the first
 * interaction. This keeps posthog-js and session replay off the intake LCP/TBT
 * path while preserving analytics for users who actually engage.
 */
export function PostHogLoader({ children }: { children: ReactNode }) {
  const [Provider, setProvider] = useState<ComponentType<{ children: ReactNode }> | null>(null)

  useEffect(() => {
    let cancelIdleLoad: (() => void) | undefined

    const loadProvider = () => {
      import("./posthog-provider")
        .then(mod => setProvider(() => mod.PostHogProvider))
        .catch(() => {})
    }

    const scheduleIdleLoad = () => {
      if (typeof requestIdleCallback !== "undefined") {
        const id = requestIdleCallback(loadProvider, { timeout: 1500 })
        cancelIdleLoad = () => cancelIdleCallback(id)
        return
      }

      const id = setTimeout(loadProvider, 0)
      cancelIdleLoad = () => clearTimeout(id)
    }

    // Post-conversion pages must NOT gate the provider behind first interaction:
    // a no-click bounce on the success / account-link page would never mount the
    // provider, so the funnel `purchase_completed` event would never fire. Load
    // immediately there (still deferred to idle). Mirrors isPostConversionPath()
    // in instrumentation-client.ts. Elsewhere the first-interaction gate stays to
    // protect intake LCP/TBT.
    if (isPostConversionPath()) {
      scheduleIdleLoad()
      return () => cancelIdleLoad?.()
    }

    const cancelInteraction = onFirstInteraction(scheduleIdleLoad)

    return () => {
      cancelInteraction()
      cancelIdleLoad?.()
    }
  }, [])

  if (!Provider) return <>{children}</>
  return <Provider>{children}</Provider>
}
