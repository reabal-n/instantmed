"use client"

import { SignInButton } from "@clerk/nextjs"

/**
 * Central wrapper for Clerk's SignInButton.
 *
 * CRITICAL: All sign-in entry points MUST route through /auth/post-signin
 * for profile linking. This wrapper enforces that invariant in one place
 * so individual call sites can never forget it.
 *
 * Use this instead of importing SignInButton from @clerk/nextjs directly.
 */
export function AppSignInButton({
  children,
  mode = "modal",
  ...props
}: Omit<React.ComponentProps<typeof SignInButton>, "forceRedirectUrl"> & {
  children?: React.ReactNode
}) {
  return (
    <SignInButton mode={mode} forceRedirectUrl="/auth/post-signin" {...props}>
      {children}
    </SignInButton>
  )
}
