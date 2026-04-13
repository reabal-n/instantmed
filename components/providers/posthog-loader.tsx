"use client"

import { type ReactNode,useEffect, useState } from "react"

/**
 * Lazy loader for PostHogProvider.
 *
 * Renders children immediately (SSR-safe), then dynamically imports
 * PostHogProvider on the client. This keeps posthog-provider.tsx and
 * its transitive dependencies out of the initial layout chunk, avoiding
 * the webpack chunk factory race condition in dev (Next.js #70703).
 */
export function PostHogLoader({ children }: { children: ReactNode }) {
  const [Provider, setProvider] = useState<React.ComponentType<{ children: ReactNode }> | null>(null)

  useEffect(() => {
    import("./posthog-provider")
      .then(mod => setProvider(() => mod.PostHogProvider))
      .catch(() => {})
  }, [])

  if (!Provider) return <>{children}</>
  return <Provider>{children}</Provider>
}
