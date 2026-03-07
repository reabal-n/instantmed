"use client"

import { SignedIn, SignedOut } from "@clerk/nextjs"
import { AppSignInButton } from "@/components/shared/app-sign-in-button"
import Link from "next/link"

/**
 * Auth controls for the footer — must be a client component to use Clerk hooks.
 * Shows "Sign in" when signed out, "My account" when signed in.
 */
export function FooterAuth() {
  return (
    <>
      <SignedOut>
        <AppSignInButton>
          <button className="hover:text-foreground transition-colors">Sign in</button>
        </AppSignInButton>
      </SignedOut>
      <SignedIn>
        <Link href="/patient" className="hover:text-foreground transition-colors">
          My account
        </Link>
      </SignedIn>
    </>
  )
}
