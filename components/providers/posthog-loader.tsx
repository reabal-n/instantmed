"use client"

import type { ReactNode } from "react"

import { PostHogProvider } from "./posthog-provider"

/**
 * Stable PostHog provider boundary.
 *
 * `PostHogProvider` keeps the heavy `posthog-js` client interaction-gated and
 * dynamically imported. The boundary itself must remain mounted from the first
 * render: swapping a fragment for a provider after interaction remounts every
 * child, which can discard form state and close active clinical panels.
 */
export function PostHogLoader({ children }: { children: ReactNode }) {
  return <PostHogProvider>{children}</PostHogProvider>
}
