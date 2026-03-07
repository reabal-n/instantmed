"use client"

import { useEffect, useRef } from "react"
import { useUser } from "@clerk/nextjs"

/**
 * PostHog User Identification Component
 *
 * This component handles PostHog user identification when a user signs in with Clerk.
 * Place this in your root layout to ensure users are identified across the app.
 *
 * Uses dynamic import to avoid module evaluation crashes when posthog-js
 * isn't properly initialized (e.g., missing NEXT_PUBLIC_POSTHOG_KEY in dev).
 */
export function PostHogIdentify() {
  const { user, isLoaded, isSignedIn } = useUser()
  const identifiedRef = useRef<string | null>(null)

  useEffect(() => {
    if (!isLoaded) return

    // Dynamic import to avoid module-level crash when PostHog isn't configured
    import("posthog-js").then(({ default: posthog }) => {
      // Skip if PostHog wasn't initialized
      if (!posthog.__loaded) return

      if (isSignedIn && user) {
        // Avoid re-identifying if already identified with same user
        if (identifiedRef.current === user.id) return
        identifiedRef.current = user.id

        const primaryEmail = user.emailAddresses.find(
          e => e.id === user.primaryEmailAddressId
        )?.emailAddress

        // Identify user in PostHog
        posthog.identify(user.id, {
          email: primaryEmail,
          name: user.fullName || `${user.firstName} ${user.lastName}`.trim(),
          created_at: user.createdAt,
          is_internal: primaryEmail?.endsWith("@instantmed.com.au") ?? false,
        })
      } else if (!isSignedIn && identifiedRef.current) {
        // User logged out - reset PostHog
        posthog.reset()
        identifiedRef.current = null
      }
    }).catch(() => {
      // PostHog not available — skip silently
    })
  }, [isLoaded, isSignedIn, user])

  return null
}
