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
  /** @deprecated mode is unused — kept for API compat */
  mode?: string
}) {
  return (
    <Link href="/sign-in">
      {children}
    </Link>
  )
}
