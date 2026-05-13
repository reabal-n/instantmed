"use client"

import { ChevronLeft, ChevronRight, Menu, X } from "lucide-react"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  EMPTY_STAFF_NAV_COUNTS,
  operatorNavSections,
  type StaffNavCounts,
  type StaffNavItem,
  type StaffNavSection,
} from "@/lib/dashboard/staff-navigation"
import {
  hasStatusFilteredDashboardItems,
  isStaffNavItemActive,
} from "@/lib/dashboard/staff-navigation-active"
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
 * AdminSidebar — the shared staff cockpit navigation.
 *
 * Desktop defaults to readable labels because the owner-operator uses the
 * full admin surface daily. The rail can still collapse when the case review
 * pane needs more width.
 */

const ACTIVE_NAV = "bg-primary/10 text-primary"
const INACTIVE_NAV = "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
const STAFF_SIDEBAR_EXPANDED_STORAGE_KEY = "instantmed.staff.sidebar.expanded"

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

function InlineNavBadge({
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
        "ml-auto inline-flex min-w-5 items-center justify-center rounded-full border px-1.5 py-0.5 text-[11px] font-semibold tabular-nums leading-none",
        tone === "warning"
          ? "border-warning-border bg-warning-light text-warning"
          : "border-primary/30 bg-primary/15 text-primary",
      )}
      aria-label={`${count} pending`}
    >
      {count > 99 ? "99+" : count}
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
  expanded,
  onClick,
}: {
  item: StaffNavItem
  active: boolean
  count?: number
  expanded: boolean
  onClick?: () => void
}) {
  const badgeCount = count ?? 0
  const Icon = STAFF_NAV_ICONS[item.icon] ?? STAFF_NAV_ICONS.dashboard

  const link = (
    <Link
      href={item.href}
      prefetch={false}
      onClick={onClick}
      className={cn(
        "relative flex h-10 rounded-lg text-sm font-medium transition-colors duration-150",
        expanded ? "w-full items-center justify-start gap-3 px-3" : "w-10 items-center justify-center",
        active ? ACTIVE_NAV : INACTIVE_NAV,
      )}
      aria-label={item.label}
      aria-current={active ? "page" : undefined}
    >
      <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
      {expanded ? (
        <>
          <span className="truncate">{item.label}</span>
          <InlineNavBadge count={badgeCount} tone={item.badgeTone} />
        </>
      ) : (
        <NavBadge count={badgeCount} tone={item.badgeTone} />
      )}
    </Link>
  )

  if (expanded) return link

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {link}
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

function Brand({ expanded, brandLabel }: { expanded: boolean; brandLabel: string }) {
  return (
    <Link
      href="/dashboard"
      prefetch={false}
      className={cn(
        "flex rounded-lg transition-colors",
        expanded
          ? "min-w-0 flex-1 items-center gap-3 hover:bg-muted/50"
          : "h-10 w-10 items-center justify-center bg-primary text-primary-foreground hover:bg-primary/90",
      )}
      aria-label="InstantMed home"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-semibold tracking-tight text-primary-foreground">
        IM
      </span>
      {expanded ? (
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold tracking-tight text-foreground">InstantMed</span>
          <span className="block truncate text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {brandLabel}
          </span>
        </span>
      ) : null}
    </Link>
  )
}

function UserInitials({
  userName,
  userRole,
  expanded,
}: {
  userName: string
  userRole: string
  expanded: boolean
}) {
  const displayName = userName.trim() || "Staff"
  const initials = displayName
    .split(" ")
    .map((namePart) => namePart.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2)

  const identity = (
    <button
      type="button"
      className={cn(
        "flex rounded-lg bg-muted text-foreground transition-colors hover:bg-muted/80",
        expanded
          ? "w-full items-center gap-3 px-3 py-2 text-left"
          : "h-10 w-10 items-center justify-center text-[11px] font-semibold",
      )}
      aria-label={`Signed in as ${displayName}`}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-background text-[11px] font-semibold">
        {initials}
      </span>
      {expanded ? (
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-foreground">{displayName}</span>
          <span className="block truncate text-xs text-muted-foreground">{userRole}</span>
        </span>
      ) : null}
    </button>
  )

  if (expanded) return identity

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {identity}
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
  brandLabel = "Operator",
}: AdminSidebarProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const counts = useLiveStaffNavCounts(navCounts)
  const currentStatus = searchParams.get("status")
  const sections = navSections ?? operatorNavSections
  const navHrefs = useMemo(
    () => sections.flatMap((section) => section.items.map((item) => item.href)),
    [sections],
  )
  const [expanded, setExpanded] = useState(true)
  const statusFilteredDashboard = useMemo(
    () => hasStatusFilteredDashboardItems(navHrefs),
    [navHrefs],
  )
  const toggleExpanded = useCallback(() => {
    setExpanded((value) => {
      const nextValue = !value
      try {
        window.localStorage.setItem(STAFF_SIDEBAR_EXPANDED_STORAGE_KEY, String(nextValue))
      } catch {
        // Sidebar preference is convenience-only; ignore storage failures.
      }
      return nextValue
    })
  }, [])

  useEffect(() => {
    try {
      const storedValue = window.localStorage.getItem(STAFF_SIDEBAR_EXPANDED_STORAGE_KEY)
      if (storedValue === "true" || storedValue === "false") {
        setExpanded(storedValue === "true")
      }
    } catch {
      // Keep the readable default if storage is unavailable.
    }
  }, [])

  return (
    <TooltipProvider>
      <aside
        className={cn(
          "hidden shrink-0 flex-col border-r border-border/40 bg-background lg:flex",
          expanded ? "w-64" : "w-[60px]",
        )}
        aria-label="Staff sidebar"
      >
        <div
          className={cn(
            "sticky top-0 flex h-screen flex-col gap-3 py-4",
            expanded ? "px-3" : "items-center px-2",
          )}
        >
          <div className={cn("flex w-full items-center", expanded ? "gap-2" : "flex-col gap-2")}>
            <Brand expanded={expanded} brandLabel={brandLabel} />
            <button
              type="button"
              onClick={toggleExpanded}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
              aria-label={expanded ? "Collapse staff navigation" : "Expand staff navigation"}
              aria-expanded={expanded}
            >
              {expanded ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          </div>
          <div className={cn("h-px bg-border/50", expanded ? "w-full" : "w-6")} aria-hidden />

          <nav className={cn("flex flex-col gap-1", expanded ? "w-full" : "items-center")} aria-label="Primary">
            {sections.map((section, sectionIndex) => (
              <div key={section.title} className={cn("flex flex-col gap-1", expanded ? "w-full" : "items-center")}>
                {sectionIndex > 0 ? (
                  <div className={cn("my-1 h-px bg-border/50", expanded ? "w-full" : "w-6")} aria-hidden />
                ) : null}
                {expanded ? (
                  <p className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {section.title}
                  </p>
                ) : null}
                {section.items.map((item) => (
                  <NavIconLink
                    key={item.href}
                    item={item}
                    active={isStaffNavItemActive({
                      pathname,
                      href: item.href,
                      currentStatus,
                      statusFilteredDashboard,
                      allHrefs: navHrefs,
                    })}
                    count={item.badgeKey ? counts[item.badgeKey] : 0}
                    expanded={expanded}
                  />
                ))}
              </div>
            ))}
          </nav>

          <div className="flex-1" />
          <UserInitials userName={userName} userRole={userRole} expanded={expanded} />
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
  const navHrefs = useMemo(
    () => sections.flatMap((section) => section.items.map((item) => item.href)),
    [sections],
  )
  const statusFilteredDashboard = useMemo(
    () => hasStatusFilteredDashboardItems(navHrefs),
    [navHrefs],
  )

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
                const active = isStaffNavItemActive({
                  pathname,
                  href: item.href,
                  currentStatus,
                  statusFilteredDashboard,
                  allHrefs: navHrefs,
                })
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
