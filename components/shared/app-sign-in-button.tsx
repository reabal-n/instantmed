"use client"

import Link from "next/link"

/**
 * Central sign-in entry point.
 *
 * Renders children as a link to /sign-in. All sign-in entry points
 * route through this component to enforce consistent behavior.
 */
export function AppSignInButton({
  children,
}: {
  children?: React.ReactNode
  /** @deprecated mode was a Clerk concept — kept for API compat during migration */
  mode?: string
}) {
  return (
    <Link href="/sign-in">
      {children}
    </Link>
  )
}
