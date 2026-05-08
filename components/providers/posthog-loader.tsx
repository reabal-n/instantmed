"use client"

import { type ComponentType,type ReactNode,useEffect, useState } from "react"

import { onFirstInteraction } from "@/lib/browser/first-interaction"

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

    const cancelInteraction = onFirstInteraction(() => {
      const loadProvider = () => {
        import("./posthog-provider")
          .then(mod => setProvider(() => mod.PostHogProvider))
          .catch(() => {})
      }

      if (typeof requestIdleCallback !== "undefined") {
        const id = requestIdleCallback(loadProvider, { timeout: 1500 })
        cancelIdleLoad = () => cancelIdleCallback(id)
        return
      }

      const id = setTimeout(loadProvider, 0)
      cancelIdleLoad = () => clearTimeout(id)
    })

    return () => {
      cancelInteraction()
      cancelIdleLoad?.()
    }
  }, [])

  if (!Provider) return <>{children}</>
  return <Provider>{children}</Provider>
}
