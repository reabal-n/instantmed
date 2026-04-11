"use client"

import { useAuth } from "@/lib/supabase/auth-provider"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { Loader2 } from "lucide-react"

/**
 * Client-side auth waiter for post-signin.
 *
 * With Supabase Auth the session cookie is set by the callback route,
 * so this mostly handles the race condition where the page renders
 * before the auth state listener fires. If the user is signed in,
 * we reload the page so the server component can read the session
 * and redirect. If auth never resolves, show retry UI.
 */
export function PostSignInAuthWaiter({ paramsString = "" }: { paramsString?: string }) {
  const { isSignedIn, isLoaded } = useAuth()
  const hasNavigated = useRef(false)
  const [timedOut, setTimedOut] = useState(false)

  // Master timeout: 15s for Supabase session to establish
  useEffect(() => {
    const masterTimer = setTimeout(() => {
      if (!hasNavigated.current) {
        setTimedOut(true)
      }
    }, 15000)

    return () => clearTimeout(masterTimer)
  }, [])

  useEffect(() => {
    if (!isLoaded || hasNavigated.current) return

    if (isSignedIn) {
      hasNavigated.current = true
      // Session is established - reload so server component handles redirect
      const destination = paramsString
        ? `/auth/post-signin?${paramsString}`
        : `/auth/post-signin`
      window.location.href = destination
      return
    }

    // Give auth 8s after SDK loads to establish session
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
