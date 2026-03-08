"use client"

import { useUser } from "@clerk/nextjs"
import { AppSignInButton } from "@/components/shared/app-sign-in-button"
import Link from "next/link"

/**
 * Auth controls for the footer — must be a client component to use Clerk hooks.
 * Shows "Sign in" when signed out, "My account" when signed in.
 *
 * Uses conditional rendering (not <SignedOut>/<SignedIn>) so the sign-in link
 * is visible immediately — Clerk's wrapper components render nothing until
 * their JS bundle loads, which can take several seconds.
 */
export function FooterAuth() {
  const { user, isLoaded } = useUser()

  if (isLoaded && user) {
    return (
      <Link href="/patient" className="hover:text-foreground transition-colors">
        My account
      </Link>
    )
  }

  return (
    <AppSignInButton>
      <button className="hover:text-foreground transition-colors">Sign in</button>
    </AppSignInButton>
  )
}
