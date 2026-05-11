"use client"

import {
  ChevronRight,
  Menu,
  X,
} from "lucide-react"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useState } from "react"

import {
  EMPTY_STAFF_NAV_COUNTS,
  operatorNavSections,
  type StaffNavCounts,
  type StaffNavItem,
  type StaffNavSection,
} from "@/lib/dashboard/staff-navigation"
import { cn } from "@/lib/utils"

interface AdminSidebarProps {
  userName: string
  userRole?: string
  navCounts?: StaffNavCounts
  /** Override the nav sections. Defaults to `operatorNavSections`. */
  navSections?: StaffNavSection[]
  /** Brand subtitle under "InstantMed". Defaults to "Operator". */
  brandLabel?: string
}

const ACTIVE_NAV_LINK = "bg-primary/5 text-blue-700 dark:bg-primary/20 dark:text-blue-200"
const ACTIVE_NAV_ICON = "text-blue-700 dark:text-blue-200"

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
        "inline-flex min-w-5 shrink-0 items-center justify-center rounded-full border px-1.5 py-0.5 text-[11px] font-semibold tabular-nums",
        tone === "warning"
          ? "border-warning-border bg-warning-light text-warning"
          : "border-primary/20 bg-primary/10 text-primary",
      )}
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

function NavLink({
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
  return (
    <Link
      href={item.href}
      prefetch={false}
      onClick={onClick}
      className={cn(
        "group flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-[background-color,color] duration-150",
        active
          ? ACTIVE_NAV_LINK
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
      )}
    >
      <span className="flex items-center gap-2.5">
        <item.icon
          className={cn(
            "h-[18px] w-[18px]",
            active ? ACTIVE_NAV_ICON : "text-muted-foreground group-hover:text-foreground",
          )}
        />
        {item.label}
      </span>
      <span className="ml-2 flex shrink-0 items-center gap-1.5">
        <NavBadge count={count ?? 0} tone={item.badgeTone} />
        {active && (
          <ChevronRight className="h-3.5 w-3.5 text-primary/50" />
        )}
      </span>
    </Link>
  )
}

function NavSection({
  title,
  items,
  pathname,
  counts,
  currentStatus,
  onNavigate,
}: {
  title: string
  items: StaffNavItem[]
  pathname: string | null
  counts: StaffNavCounts
  currentStatus: string | null
  onNavigate?: () => void
}) {
  return (
    <div className="space-y-1">
      <p className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
      {items.map((item) => (
        <NavLink
          key={item.href}
          item={item}
          active={getIsActive(pathname, item.href, currentStatus)}
          count={item.badgeKey ? counts[item.badgeKey] : 0}
          onClick={onNavigate}
        />
      ))}
    </div>
  )
}

function Brand({ label = "Operator" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <span className="text-sm font-semibold tracking-tight">IM</span>
      </div>
      <div>
        <span className="text-base font-semibold tracking-tight text-foreground">
          InstantMed
        </span>
        <p className="mt-1 text-xs leading-none text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

function UserSummary({ userName, userRole }: { userName: string; userRole: string }) {
  const initials = userName
    .split(" ")
    .map((namePart) => namePart.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="flex items-center gap-3 rounded-lg px-2 py-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium leading-tight text-foreground">{userName}</p>
        <p className="mt-0.5 text-xs leading-tight text-muted-foreground">{userRole}</p>
      </div>
    </div>
  )
}

export function AdminSidebar({
  userName,
  userRole = "Operator",
  navCounts,
  navSections,
  brandLabel,
}: AdminSidebarProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const counts = useLiveStaffNavCounts(navCounts)
  const currentStatus = searchParams.get("status")
  const sections = navSections ?? operatorNavSections

  return (
    <aside className="hidden w-[260px] shrink-0 flex-col lg:flex" aria-label="Staff sidebar">
      <div className="sticky top-6 flex flex-col gap-1 pb-6">
        <div className="mb-2 px-4 py-5">
          <Brand label={brandLabel} />
        </div>

        <nav className="flex flex-col gap-4 px-3">
          {sections.map((section, index) => (
            <div key={section.title} className="contents">
              {index > 0 ? <div className="mx-3 border-t border-border/30" /> : null}
              <NavSection
                title={section.title}
                items={section.items}
                pathname={pathname}
                counts={counts}
                currentStatus={currentStatus}
              />
            </div>
          ))}
        </nav>

        <div className="min-h-4 flex-1" />

        <div className="mt-auto px-4">
          <UserSummary userName={userName} userRole={userRole} />
        </div>
      </div>
    </aside>
  )
}

interface MobileAdminNavProps {
  navCounts?: StaffNavCounts
  navSections?: StaffNavSection[]
  brandLabel?: string
}

export function MobileAdminNav({ navCounts, navSections, brandLabel }: MobileAdminNavProps) {
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
          <Brand label={brandLabel} />
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
            <div key={section.title} className="space-y-4">
              {index > 0 ? <div className="border-t border-border/30" /> : null}
              <NavSection
                title={section.title}
                items={section.items}
                pathname={pathname}
                counts={counts}
                currentStatus={currentStatus}
                onNavigate={() => setOpen(false)}
              />
            </div>
          ))}
        </div>
      </nav>
    </div>
  )
}
