"use client"

import { ChevronLeft, ChevronRight, Menu, X } from "lucide-react"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { type MouseEvent, useCallback, useEffect, useMemo, useState } from "react"

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { STAFF_DASHBOARD_HREF } from "@/lib/dashboard/routes"
import {
  operatorNavSections,
  type StaffNavItem,
  type StaffNavSection,
} from "@/lib/dashboard/staff-navigation"
import {
  hasStatusFilteredDashboardItems,
  isStaffNavHrefCurrent,
  isStaffNavItemActive,
} from "@/lib/dashboard/staff-navigation-active"
import { useLiveStaffNavCounts } from "@/lib/dashboard/use-staff-nav-counts"
import { cn } from "@/lib/utils"

import { STAFF_NAV_ICONS } from "./staff-nav-icons"

interface AdminSidebarProps {
  userName: string
  userRole?: string
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

const ACTIVE_NAV = "border border-primary/15 bg-primary/[0.08] text-primary shadow-sm shadow-primary/[0.04]"
const INACTIVE_NAV = "border border-transparent text-slate-600 hover:border-border/45 hover:bg-white/65 hover:text-foreground dark:text-muted-foreground dark:hover:bg-white/[0.06]"
const STAFF_SIDEBAR_EXPANDED_STORAGE_KEY = "instantmed.staff.sidebar.expanded"

function shouldNoopCurrentNavigation(event: MouseEvent<HTMLAnchorElement>, current: boolean): boolean {
  return current && !event.defaultPrevented && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey
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

function NavIconLink({
  item,
  active,
  current,
  count,
  expanded,
  onClick,
}: {
  item: StaffNavItem
  active: boolean
  current: boolean
  count?: number
  expanded: boolean
  onClick?: () => void
}) {
  const badgeCount = count ?? 0
  const Icon = STAFF_NAV_ICONS[item.icon] ?? STAFF_NAV_ICONS.dashboard
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (shouldNoopCurrentNavigation(event, current)) {
      event.preventDefault()
      return
    }

    onClick?.()
  }

  const link = (
    <Link
      href={item.href}
      // Default (auto) prefetch — deliberately no prefetch prop: on our
      // force-dynamic staff routes the automatic mode prefetches only the
      // shared layout down to the nearest loading.tsx boundary — the skeleton,
      // never the PHI page payload (Next 15 Link docs). That skeleton warming
      // is what makes sidebar clicks feel instant; disabling prefetch entirely
      // (the pre-2026-07-12 behaviour) froze every navigation on the old page
      // for a full server round-trip before anything visibly changed. FULL
      // prefetch stays banned by the doctor-navigation contract — forcing it
      // WOULD pull PHI payloads into the browser cache.
      onClick={handleClick}
      className={cn(
        "relative flex h-10 rounded-lg text-sm font-medium transition-[background-color,border-color,color,box-shadow] duration-150",
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

function Brand({ expanded, brandLabel, current }: { expanded: boolean; brandLabel: string; current: boolean }) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (shouldNoopCurrentNavigation(event, current)) {
      event.preventDefault()
    }
  }

  return (
    <Link
      href={STAFF_DASHBOARD_HREF}
      onClick={handleClick}
      className={cn(
        "flex rounded-lg transition-colors",
        expanded
          ? "min-w-0 flex-1 items-center gap-3 hover:bg-white/65 dark:hover:bg-white/[0.06]"
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
          <span className="block truncate text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-muted-foreground">
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
        "flex rounded-lg border border-border/35 bg-white/65 text-foreground shadow-sm shadow-primary/[0.03] transition-colors hover:bg-white/85 dark:bg-white/[0.05] dark:hover:bg-white/[0.08]",
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
          <span className="block truncate text-xs text-slate-600 dark:text-muted-foreground">{userRole}</span>
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
  navSections,
  brandLabel = "Operator",
}: AdminSidebarProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const counts = useLiveStaffNavCounts()
  const currentStatus = searchParams.get("status")
  const sections = navSections ?? operatorNavSections
  const currentSearch = searchParams.toString()
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
          "hidden shrink-0 flex-col border-r border-border/45 bg-[#FCFBF8] shadow-sm shadow-primary/[0.03] dark:bg-card lg:flex",
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
            <Brand
              expanded={expanded}
              brandLabel={brandLabel}
              current={isStaffNavHrefCurrent({
                pathname,
                href: STAFF_DASHBOARD_HREF,
                currentSearch,
              })}
            />
            <button
              type="button"
              onClick={toggleExpanded}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-transparent text-muted-foreground transition-colors hover:border-border/45 hover:bg-white/65 hover:text-foreground dark:hover:bg-white/[0.06]"
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
                  <p className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-muted-foreground">
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
                    current={isStaffNavHrefCurrent({
                      pathname,
                      href: item.href,
                      currentSearch,
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
  navSections?: StaffNavSection[]
  brandLabel?: string
}

/**
 * Mobile uses the original labeled drawer pattern. On a phone you want full
 * labels because there's room for a sheet, and tooltips don't work on touch.
 */
export function MobileAdminNav({ navSections, brandLabel: _brandLabel }: MobileAdminNavProps) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const counts = useLiveStaffNavCounts()
  const currentStatus = searchParams.get("status")
  const sections = navSections ?? operatorNavSections
  const currentSearch = searchParams.toString()
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
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/50 bg-white/75 text-muted-foreground shadow-sm shadow-primary/[0.03] transition-colors hover:bg-white hover:text-foreground dark:bg-card"
        aria-label="Open staff navigation"
        type="button"
      >
        <Menu className="h-5 w-5" />
      </button>

      <>
        <button
          className={cn(
            "fixed inset-0 z-40 bg-black/40 transition-opacity duration-200 ease-out",
            open ? "opacity-100" : "pointer-events-none opacity-0",
          )}
          onClick={() => setOpen(false)}
          aria-label="Close staff navigation"
          type="button"
          tabIndex={open ? undefined : -1}
          inert={!open ? true : undefined}
        />

        <nav
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col border-r border-border bg-[#FCFBF8] shadow-xl shadow-primary/[0.08] transition-transform duration-200 ease-out dark:bg-card",
            open ? "translate-x-0" : "-translate-x-full",
          )}
          aria-label="Staff navigation"
          inert={!open ? true : undefined}
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
                tabIndex={open ? undefined : -1}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-3 py-3">
              {sections.map((section, index) => (
                <div key={section.title} className="space-y-1">
                  {index > 0 ? <div className="border-t border-border/30" /> : null}
                  <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-muted-foreground">
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
                    const current = isStaffNavHrefCurrent({
                      pathname,
                      href: item.href,
                      currentSearch,
                    })
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={(event) => {
                          if (shouldNoopCurrentNavigation(event, current)) {
                            event.preventDefault()
                          }
                          setOpen(false)
                        }}
                        tabIndex={open ? undefined : -1}
                        aria-current={active ? "page" : undefined}
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
      </>
    </div>
  )
}
