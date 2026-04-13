"use client"

/**
 * PostHog React context -- shared between the provider (components/) and
 * any lib/ hooks that need the client-side PostHog instance.
 *
 * Extracted here so lib/ can call `usePostHog()` without importing from components/.
 */

import type { PostHog } from "posthog-js"
import { createContext, useContext } from "react"

export const PostHogContext = createContext<PostHog | null>(null)

export function usePostHog(): PostHog | null {
  return useContext(PostHogContext)
}
