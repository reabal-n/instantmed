"use client"

/**
 * Test-data visibility banner + admin toggle.
 *
 * Renders a warning strip across the dashboard when `?showTestData=1`
 * is active so the operator can never confuse seeded-E2E rows with
 * real production cases. The toggle button (rendered separately in
 * the page header) flips the query param on/off without losing other
 * URL state (status filter, page, etc.).
 *
 * Both pieces live in this file so they stay co-located. Admin-only
 * gating is enforced on the server (`hasAdminAccess(profile)`); these
 * components just reflect that state visually.
 *
 * Color tokens: uses the design-system `--warning` / `--warning-light`
 * / `--warning-border` family (defined in `app/globals.css`) so the
 * banner sits in the same amber notice register as `ContextualHelp`
 * and other warning states. Avoid raw `amber-*` Tailwind classes
 * here — they're outside the token system.
 */

import { Beaker, EyeOff, X } from "lucide-react"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"

import { Button } from "@/components/ui/button"
import { STAFF_DASHBOARD_HREF } from "@/lib/dashboard/routes"

function withTestDataParam(
  pathname: string,
  searchParams: URLSearchParams,
  active: boolean,
): string {
  const next = new URLSearchParams(searchParams)
  if (active) {
    next.set("showTestData", "1")
  } else {
    next.delete("showTestData")
  }
  const qs = next.toString()
  return qs ? `${pathname}?${qs}` : pathname
}

/**
 * Persistent strip that appears at the top of the dashboard content
 * when the toggle is active. Includes a one-click "Hide" link that
 * removes `?showTestData=1` from the URL while preserving every other
 * query param.
 */
export function TestDataBanner() {
  const pathname = usePathname() ?? STAFF_DASHBOARD_HREF
  const params = useSearchParams()
  const searchParams = new URLSearchParams(params?.toString() ?? "")
  const hideHref = withTestDataParam(pathname, searchParams, false)

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning-border bg-warning-light px-4 py-2.5 text-sm"
    >
      <div className="flex items-center gap-2 text-warning">
        <Beaker className="h-4 w-4 shrink-0" aria-hidden />
        <span className="font-medium">Test data visible.</span>
        <span className="text-warning/80">
          The seeded E2E patient is included in this view. Not real
          patients. Toggle off before reviewing live cases.
        </span>
      </div>
      <Button
        asChild
        variant="outline"
        size="sm"
        className="h-7 border-warning-border bg-card px-2.5 text-xs text-warning hover:bg-warning/10"
      >
        <Link href={hideHref}>
          <X className="mr-1 h-3 w-3" aria-hidden />
          Hide test data
        </Link>
      </Button>
    </div>
  )
}

/**
 * Toggle button rendered in the dashboard header. When inactive it
 * adds `?showTestData=1`; when active it removes the param. Always
 * preserves the rest of the URL state. Admin-only: the parent page
 * is responsible for not rendering this for non-admin roles.
 */
export function TestDataToggleButton({ active }: { active: boolean }) {
  const pathname = usePathname() ?? STAFF_DASHBOARD_HREF
  const params = useSearchParams()
  const searchParams = new URLSearchParams(params?.toString() ?? "")
  const href = withTestDataParam(pathname, searchParams, !active)

  return (
    <Button
      asChild
      variant={active ? "default" : "outline"}
      size="sm"
      className={
        active
          ? "border-warning-border bg-warning-light text-warning hover:bg-warning/10"
          : "border-dashed text-muted-foreground hover:text-foreground"
      }
      title={active ? "Hide the seeded E2E patient" : "Show the seeded E2E patient in the queue"}
    >
      <Link href={href}>
        {active ? (
          <>
            <EyeOff className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            Test data on
          </>
        ) : (
          <>
            <Beaker className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            Test data
          </>
        )}
      </Link>
    </Button>
  )
}
