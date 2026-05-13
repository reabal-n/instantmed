"use client"

import { Menu, X } from "lucide-react"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useState } from "react"

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  EMPTY_STAFF_NAV_COUNTS,
  operatorNavSections,
  type StaffNavCounts,
  type StaffNavItem,
  type StaffNavSection,
} from "@/lib/dashboard/staff-navigation"
import { cn } from "@/lib/utils"

import { STAFF_NAV_ICONS } from "./staff-nav-icons"

interface AdminSidebarProps {
  userName: string
  userRole?: string
  navCounts?: StaffNavCounts
  /** Override the nav sections. Defaults to `operatorNavSections`. */
  navSections?: StaffNavSection[]
  /** Brand subtitle under "InstantMed". Defaults to "Operator". */
  brandLabel?: string
}

/**
 * AdminSidebar — Linear-tier icon rail.
 *
 * Phase 1 of dashboard-remaster pass 2 (2026-05-12): the sidebar collapses
 * to a 60px icon rail; every label lives in a hover/focus tooltip. The
 * dashboard stays task-first without adding a second command surface.
 *
 * Why icon-only by default: PRODUCT.md describes the staff users as
 * "doctors under time pressure"; they want one cockpit and the next action
 * surfaced first, not nine sidebar labels competing for attention.
 */

const ACTIVE_NAV = "bg-primary/10 text-primary"
const INACTIVE_NAV = "text-muted-foreground hover:bg-muted/60 hover:text-foreground"

function getHrefPath(href: string) {
  return href.split(/[?#]/)[0]
}

function getHrefStatus(href: string) {
  const query = href.split("?")[1]?.split("#")[0]
  if (!query) return null
  return new URLSearchParams(query).get("status")
}

function getIsActive(pathname: string | null, href: string, currentStatus: string | null) {
  const hrefPath = getHrefPath(href)
  const hrefStatus = getHrefStatus(href)

  if (href === "/admin") return pathname === "/admin" && !currentStatus
  if (hrefPath === "/admin" && hrefStatus) return pathname === "/admin" && currentStatus === hrefStatus
  return pathname === hrefPath || Boolean(pathname?.startsWith(`${hrefPath}/`))
}

function NavBadge({
  count,
  tone = "primary",
}: {
  count: number
  tone?: StaffNavItem["badgeTone"]
}) {
  if (count <= 0) return null

  return (
    <span
      className={cn(
        "absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full border px-1 text-[10px] font-semibold tabular-nums leading-none",
        tone === "warning"
          ? "border-warning-border bg-warning-light text-warning"
          : "border-primary/30 bg-primary/15 text-primary",
      )}
      aria-label={`${count} pending`}
    >
      {count > 9 ? "9+" : count}
    </span>
  )
}

function useLiveStaffNavCounts(initialCounts?: StaffNavCounts) {
  const [counts, setCounts] = useState<StaffNavCounts>(initialCounts ?? EMPTY_STAFF_NAV_COUNTS)

  const refreshCounts = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/staff-nav-counts", { cache: "no-store" })
      if (!response.ok) return
      const nextCounts = await response.json() as StaffNavCounts
      setCounts({
        prescribingIdentityPatients: Number(nextCounts.prescribingIdentityPatients) || 0,
        scriptsToWrite: Number(nextCounts.scriptsToWrite) || 0,
        inQueue: Number(nextCounts.inQueue) || 0,
      })
    } catch {
      // Count badges are advisory; keep the last good values if polling fails.
    }
  }, [])

  useEffect(() => {
    setCounts(initialCounts ?? EMPTY_STAFF_NAV_COUNTS)
  }, [initialCounts])

  useEffect(() => {
    refreshCounts()
    const interval = window.setInterval(refreshCounts, 45_000)
    return () => window.clearInterval(interval)
  }, [refreshCounts])

  return counts
}

function NavIconLink({
  item,
  active,
  count,
  onClick,
}: {
  item: StaffNavItem
  active: boolean
  count?: number
  onClick?: () => void
}) {
  const badgeCount = count ?? 0
  const Icon = STAFF_NAV_ICONS[item.icon] ?? STAFF_NAV_ICONS.dashboard

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          href={item.href}
          prefetch={false}
          onClick={onClick}
          className={cn(
            "relative flex h-10 w-10 items-center justify-center rounded-lg transition-colors duration-150",
            active ? ACTIVE_NAV : INACTIVE_NAV,
          )}
          aria-label={item.label}
        >
          <Icon className="h-[18px] w-[18px]" aria-hidden />
          <NavBadge count={badgeCount} tone={item.badgeTone} />
        </Link>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={8} className="flex items-center gap-2">
        <span className="text-xs font-medium text-foreground">{item.label}</span>
        {badgeCount > 0 ? (
          <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-primary">
            {badgeCount > 9 ? "9+" : badgeCount}
          </span>
        ) : null}
      </TooltipContent>
    </Tooltip>
  )
}

function Brand() {
  return (
    <Link
      href="/dashboard"
      prefetch={false}
      className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
      aria-label="InstantMed home"
    >
      <span className="text-sm font-semibold tracking-tight">IM</span>
    </Link>
  )
}

function UserInitials({ userName, userRole }: { userName: string; userRole: string }) {
  const displayName = userName.trim() || "Staff"
  const initials = displayName
    .split(" ")
    .map((namePart) => namePart.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-foreground transition-colors hover:bg-muted/80"
          aria-label={`Signed in as ${displayName}`}
        >
          {initials}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-medium text-foreground">{displayName}</span>
          <span className="text-[11px] text-muted-foreground">{userRole}</span>
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

export function AdminSidebar({
  userName,
  userRole = "Operator",
  navCounts,
  navSections,
}: AdminSidebarProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const counts = useLiveStaffNavCounts(navCounts)
  const currentStatus = searchParams.get("status")
  const sections = navSections ?? operatorNavSections

  return (
    <TooltipProvider>
      <aside
        className="hidden w-[60px] shrink-0 flex-col border-r border-border/40 bg-background lg:flex"
        aria-label="Staff sidebar"
      >
        <div className="sticky top-0 flex h-screen flex-col items-center gap-3 py-4">
          <Brand />
          <div className="h-px w-6 bg-border/50" aria-hidden />

          <nav className="flex flex-col items-center gap-1" aria-label="Primary">
            {sections.map((section, sectionIndex) => (
              <div key={section.title} className="flex flex-col items-center gap-1">
                {sectionIndex > 0 ? (
                  <div className="my-1 h-px w-6 bg-border/50" aria-hidden />
                ) : null}
                {section.items.map((item) => (
                  <NavIconLink
                    key={item.href}
                    item={item}
                    active={getIsActive(pathname, item.href, currentStatus)}
                    count={item.badgeKey ? counts[item.badgeKey] : 0}
                  />
                ))}
              </div>
            ))}
          </nav>

          <div className="flex-1" />
          <UserInitials userName={userName} userRole={userRole} />
        </div>
      </aside>
    </TooltipProvider>
  )
}

interface MobileAdminNavProps {
  navCounts?: StaffNavCounts
  navSections?: StaffNavSection[]
  brandLabel?: string
}

/**
 * Mobile uses the original labeled drawer pattern. On a phone you want full
 * labels because there's room for a sheet, and tooltips don't work on touch.
 */
export function MobileAdminNav({ navCounts, navSections, brandLabel: _brandLabel }: MobileAdminNavProps) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const counts = useLiveStaffNavCounts(navCounts)
  const currentStatus = searchParams.get("status")
  const sections = navSections ?? operatorNavSections

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <div className="lg:hidden">
      <button
        onClick={() => setOpen(true)}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/50 bg-background text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
        aria-label="Open staff navigation"
        type="button"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <button
          className="fixed inset-0 z-40 bg-black/40"
          onClick={() => setOpen(false)}
          aria-label="Close staff navigation"
          type="button"
        />
      )}

      <nav
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col border-r border-border bg-background shadow-xl transition-transform duration-200 ease-out",
          open ? "translate-x-0" : "-translate-x-full",
        )}
        aria-label="Staff navigation"
      >
        <div className="flex items-center justify-between border-b border-border/40 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <span className="text-sm font-semibold tracking-tight">IM</span>
            </div>
            <span className="text-base font-semibold tracking-tight text-foreground">InstantMed</span>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
            aria-label="Close navigation"
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-3 py-3">
          {sections.map((section, index) => (
            <div key={section.title} className="space-y-1">
              {index > 0 ? <div className="border-t border-border/30" /> : null}
              <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {section.title}
              </p>
              {section.items.map((item) => {
                const active = getIsActive(pathname, item.href, currentStatus)
                const count = item.badgeKey ? counts[item.badgeKey] : 0
                const Icon = STAFF_NAV_ICONS[item.icon]
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={false}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150",
                      active ? ACTIVE_NAV : INACTIVE_NAV,
                    )}
                  >
                    <span className="flex items-center gap-2.5">
                      <Icon className="h-[18px] w-[18px]" aria-hidden />
                      {item.label}
                    </span>
                    {count > 0 ? (
                      <span className="inline-flex min-w-5 items-center justify-center rounded-full border border-primary/20 bg-primary/10 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-primary">
                        {count > 99 ? "99+" : count}
                      </span>
                    ) : null}
                  </Link>
                )
              })}
            </div>
          ))}
        </div>
      </nav>
    </div>
  )
}
