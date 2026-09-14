"use client"

/**
 * Test-data visibility banner + labelled admin menu.
 *
 * Renders a warning strip across the dashboard when `?showTestData=1`
 * is active so the operator can never confuse test rows with real
 * production cases. The toggle button (rendered separately in
 * the page header) flips the query param on/off without losing other
 * URL state (status filter, page, etc.).
 *
 * Both pieces live in this file so they stay co-located. Admin-only
 * gating is enforced on the server (`hasAdminAccess(profile)`); these
 * components just reflect that state visually.
 *
 * Color tokens: uses the design-system `--warning` / `--warning-light`
 * / `--warning-border` family (defined in `app/globals.css`) so the
 * banner sits in the same amber notice register as other warning states.
 * Avoid raw `amber-*` Tailwind classes
 * here — they're outside the token system.
 */

import { Beaker, ChevronDown, EyeOff, X } from "lucide-react"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { Suspense } from "react"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
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
    next.delete("onlyTestData")
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
function TestDataBannerInner() {
  const pathname = usePathname() ?? STAFF_DASHBOARD_HREF
  const params = useSearchParams()
  const searchParams = new URLSearchParams(params?.toString() ?? "")
  const hideHref = withTestDataParam(pathname, searchParams, false)

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-8 flex-wrap items-center justify-between gap-3 rounded-md border border-warning-border/55 border-l-warning bg-warning-light/50 px-3 py-1.5 text-xs shadow-none dark:border-warning-border/60"
    >
      <div className="flex min-w-0 items-center gap-2 text-warning">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-warning" aria-hidden />
        <span className="font-medium">Test mode.</span>
        <span className="truncate text-warning/90">
          Test patients are included.
        </span>
      </div>
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="h-7 px-2.5 text-xs text-warning hover:bg-warning/10 hover:text-warning"
      >
        <Link href={hideHref}>
          <X className="mr-1 h-3 w-3" aria-hidden />
          Hide test data
        </Link>
      </Button>
    </div>
  )
}

export function TestDataBanner() {
  return (
    <Suspense fallback={null}>
      <TestDataBannerInner />
    </Suspense>
  )
}

/**
 * Test-data menu item rendered in queue controls. When inactive it
 * adds `?showTestData=1`; when active it removes the param. Always
 * preserves the rest of the URL state. Admin-only: the parent page
 * is responsible for not rendering this for non-admin roles.
 */
function TestDataAdminMenuInner({ active }: { active: boolean }) {
  const pathname = usePathname() ?? STAFF_DASHBOARD_HREF
  const params = useSearchParams()
  const searchParams = new URLSearchParams(params?.toString() ?? "")
  const href = withTestDataParam(pathname, searchParams, !active)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="min-h-11 gap-1.5 sm:min-h-8" aria-label="Admin menu">
          Admin
          {active ? <span className="h-1.5 w-1.5 rounded-full bg-warning" aria-label="Test data active" /> : null}
          <ChevronDown className="h-3.5 w-3.5" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Admin controls</DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <Link href={href}>
            {active ? <EyeOff className="mr-2 h-4 w-4" aria-hidden /> : <Beaker className="mr-2 h-4 w-4" aria-hidden />}
            {active ? "Hide test patients" : "Show test patients"}
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function TestDataAdminMenu({ active }: { active: boolean }) {
  return (
    <Suspense fallback={null}>
      <TestDataAdminMenuInner active={active} />
    </Suspense>
  )
}

// Preserve the operator barrel export for existing consumers.
export const TestDataToggleButton = TestDataAdminMenu
