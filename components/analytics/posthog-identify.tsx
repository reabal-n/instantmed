"use client"

import { useEffect, useRef } from "react"
import { useUser } from "@clerk/nextjs"
import posthog from "posthog-js"

/**
 * PostHog User Identification Component
 *
 * This component handles PostHog user identification when a user signs in with Clerk.
 * Place this in your root layout to ensure users are identified across the app.
 */
export function PostHogIdentify() {
  const { user, isSignedIn, isLoaded } = useUser()
  const identifiedRef = useRef<string | null>(null)

  useEffect(() => {
    if (!isLoaded) return

    if (isSignedIn && user) {
      // Avoid re-identifying if already identified with same user
      if (identifiedRef.current === user.id) return
      identifiedRef.current = user.id

      // Identify user in PostHog
      posthog.identify(user.id, {
        email: user.primaryEmailAddress?.emailAddress,
        name: user.fullName,
        first_name: user.firstName,
        last_name: user.lastName,
        created_at: user.createdAt?.toISOString(),
      })
    } else if (!isSignedIn && identifiedRef.current) {
      // User logged out - reset PostHog
      posthog.reset()
      identifiedRef.current = null
    }
  }, [isLoaded, isSignedIn, user])

  return null
}
