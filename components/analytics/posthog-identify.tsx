"use client"

import { useEffect, useRef } from "react"
import { useAuth } from "@/components/providers/supabase-auth-provider"
import posthog from "posthog-js"

/**
 * PostHog User Identification Component
 *
 * This component handles PostHog user identification when a user signs in with Supabase.
 * Place this in your root layout to ensure users are identified across the app.
 */
export function PostHogIdentify() {
  const { user, profile, isLoading, isSignedIn } = useAuth()
  const identifiedRef = useRef<string | null>(null)

  useEffect(() => {
    if (isLoading) return

    if (isSignedIn && user) {
      // Avoid re-identifying if already identified with same user
      if (identifiedRef.current === user.id) return
      identifiedRef.current = user.id

      // Identify user in PostHog
      posthog.identify(user.id, {
        email: user.email,
        name: profile?.full_name || user.user_metadata?.full_name,
        created_at: user.created_at,
      })
    } else if (!isSignedIn && identifiedRef.current) {
      // User logged out - reset PostHog
      posthog.reset()
      identifiedRef.current = null
    }
  }, [isLoading, isSignedIn, user, profile])

  return null
}
