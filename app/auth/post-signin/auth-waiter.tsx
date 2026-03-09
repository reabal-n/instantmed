"use client"

import { useAuth } from "@clerk/nextjs"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { Loader2 } from "lucide-react"

/**
 * Client-side auth waiter for post-signin.
 *
 * Handles the race condition where Clerk's hosted sign-up/sign-in
 * redirects back to the app before the session cookie is established.
 *
 * Strategy: if the client SDK detects a session, redirect through
 * Clerk's sign-in URL to force the handshake (which sets the server
 * cookie). A simple page reload won't work because the handshake
 * tokens aren't in the URL.
 *
 * Uses sessionStorage with a 30-second timestamp window to track
 * attempts. Stale counters from previous sign-ins reset automatically.
 *
 * Accepts search params as a prop to avoid useSearchParams() which
 * requires a Suspense boundary in Next.js 15 and can cause hydration issues.
 */
export function PostSignInAuthWaiter({ paramsString = "" }: { paramsString?: string }) {
  const { isSignedIn, isLoaded } = useAuth()
  const hasNavigated = useRef(false)
  const [timedOut, setTimedOut] = useState(false)

  // Master timeout: if nothing resolves within 20 seconds (including Clerk
  // failing to load entirely), show the error/retry UI. Without this, the
  // spinner is infinite when Clerk's JS fails to initialise.
  // 20s accounts for the full redirect chain: middleware → post-signin →
  // auth-waiter → Clerk handshake → back to post-signin → profile link → cookie set.
  useEffect(() => {
    const masterTimer = setTimeout(() => {
      if (!hasNavigated.current) {
        setTimedOut(true)
      }
    }, 20000)

    return () => clearTimeout(masterTimer)
  }, [])

  useEffect(() => {
    if (!isLoaded || hasNavigated.current) return

    if (isSignedIn) {
      // Track retry attempts within a 30-second window to prevent infinite loops.
      // Counter resets automatically if it's stale (from a previous sign-in session).
      const attemptKey = "post-signin-attempts"
      let stored: { count: number; ts: number } = { count: 0, ts: 0 }
      try {
        stored = JSON.parse(
          sessionStorage.getItem(attemptKey) || '{"count":0,"ts":0}'
        ) as { count: number; ts: number }
      } catch {
        // Corrupted sessionStorage value — reset and start fresh
        sessionStorage.removeItem(attemptKey)
      }

      const now = Date.now()
      const count = now - stored.ts > 30000 ? 0 : stored.count

      if (count >= 3) {
        sessionStorage.removeItem(attemptKey)
        setTimedOut(true)
        return
      }

      sessionStorage.setItem(attemptKey, JSON.stringify({ count: count + 1, ts: now }))
      hasNavigated.current = true

      // Redirect through Clerk to force the handshake and set server cookies.
      // A simple page reload won't work because the handshake tokens
      // (which the middleware needs to establish the session) aren't in the URL.
      const currentOrigin = window.location.origin
      const postSignInUrl = paramsString
        ? `${currentOrigin}/auth/post-signin?${paramsString}`
        : `${currentOrigin}/auth/post-signin`
      const clerkSignInUrl =
        process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL ||
        "https://accounts.instantmed.com.au/sign-in"
      window.location.href = `${clerkSignInUrl}?redirect_url=${encodeURIComponent(postSignInUrl)}`
      return
    }

    // Give Clerk up to 8s to establish the session (after it has loaded)
    const timer = setTimeout(() => {
      if (!hasNavigated.current) {
        setTimedOut(true)
      }
    }, 8000)

    return () => clearTimeout(timer)
  }, [isLoaded, isSignedIn, paramsString])

  if (timedOut) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" role="alert" aria-live="assertive">
        <div className="max-w-sm w-full text-center space-y-4">
          <p className="text-muted-foreground">
            Having trouble signing in. Please try again.
          </p>
          <Link
            href="/sign-in"
            className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground"
            onClick={() => {
              // Clear attempt counter so next sign-in starts fresh
              sessionStorage.removeItem("post-signin-attempts")
            }}
          >
            Sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center" aria-live="polite">
      <div className="text-center space-y-4" role="status">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" aria-hidden="true" />
        <p className="text-muted-foreground">Setting up your account...</p>
      </div>
    </div>
  )
}
