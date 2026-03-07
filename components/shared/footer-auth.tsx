"use client"

import { SignInButton, SignedIn, SignedOut } from "@clerk/nextjs"
import Link from "next/link"

/**
 * Auth controls for the footer — must be a client component to use Clerk hooks.
 * Shows "Sign in" when signed out, "My account" when signed in.
 */
export function FooterAuth() {
  return (
    <>
      <SignedOut>
        <SignInButton mode="modal" forceRedirectUrl="/auth/post-signin">
          <button className="hover:text-foreground transition-colors">Sign in</button>
        </SignInButton>
      </SignedOut>
      <SignedIn>
        <Link href="/patient" className="hover:text-foreground transition-colors">
          My account
        </Link>
      </SignedIn>
    </>
  )
}
