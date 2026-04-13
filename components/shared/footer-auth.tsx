"use client"

import Link from "next/link"

import { AppSignInButton } from "@/components/shared/app-sign-in-button"
import { useAuth } from "@/lib/supabase/auth-provider"

/**
 * Auth controls for the footer - client component for auth state.
 * Shows "Sign in" when signed out, "My account" when signed in.
 */
export function FooterAuth() {
  const { user, isLoaded } = useAuth()

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
