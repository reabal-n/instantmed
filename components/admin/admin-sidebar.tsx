"use client"

import {
  ChevronRight,
  Menu,
  X,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"

import { operatorNavSections, type StaffNavItem } from "@/lib/dashboard/staff-navigation"
import { cn } from "@/lib/utils"

interface AdminSidebarProps {
  userName: string
  userRole?: string
  pendingCount?: number
}

const ACTIVE_NAV_LINK = "bg-primary/5 text-blue-700 dark:bg-primary/20 dark:text-blue-200"
const ACTIVE_NAV_ICON = "text-blue-700 dark:text-blue-200"

function getIsActive(pathname: string | null, href: string) {
  if (href === "/admin") return pathname === "/admin"
  return pathname === href || Boolean(pathname?.startsWith(`${href}/`))
}

function NavLink({
  item,
  active,
  onClick,
}: {
  item: StaffNavItem
  active: boolean
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
      {active && (
        <ChevronRight className="h-3.5 w-3.5 text-primary/50" />
      )}
    </Link>
  )
}

function NavSection({
  title,
  items,
  pathname,
  onNavigate,
}: {
  title: string
  items: StaffNavItem[]
  pathname: string | null
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
          active={getIsActive(pathname, item.href)}
          onClick={onNavigate}
        />
      ))}
    </div>
  )
}

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <span className="text-sm font-semibold tracking-tight">IM</span>
      </div>
      <div>
        <span className="text-base font-semibold tracking-tight text-foreground">
          InstantMed
        </span>
        <p className="mt-1 text-xs leading-none text-muted-foreground">Operator</p>
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

export function AdminSidebar({ userName, userRole = "Operator" }: AdminSidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="hidden w-[260px] shrink-0 flex-col lg:flex" aria-label="Operator sidebar">
      <div className="sticky top-6 flex flex-col gap-1 pb-6">
        <div className="mb-2 px-4 py-5">
          <Brand />
        </div>

        <nav className="flex flex-col gap-4 px-3">
          {operatorNavSections.map((section, index) => (
            <div key={section.title} className="contents">
              {index > 0 ? <div className="mx-3 border-t border-border/30" /> : null}
              <NavSection title={section.title} items={section.items} pathname={pathname} />
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

export function MobileAdminNav({ pendingCount: _pendingCount = 0 }: { pendingCount?: number }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <div className="lg:hidden">
      <button
        onClick={() => setOpen(true)}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/50 bg-background text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
        aria-label="Open operator navigation"
        type="button"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <button
          className="fixed inset-0 z-40 bg-black/40"
          onClick={() => setOpen(false)}
          aria-label="Close admin navigation"
          type="button"
        />
      )}

      <nav
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col border-r border-border bg-background shadow-xl transition-transform duration-200 ease-out",
          open ? "translate-x-0" : "-translate-x-full",
        )}
        aria-label="Operator navigation"
      >
        <div className="flex items-center justify-between border-b border-border/40 px-4 py-4">
          <Brand />
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
          {operatorNavSections.map((section, index) => (
            <div key={section.title} className="space-y-4">
              {index > 0 ? <div className="border-t border-border/30" /> : null}
              <NavSection
                title={section.title}
                items={section.items}
                pathname={pathname}
                onNavigate={() => setOpen(false)}
              />
            </div>
          ))}
        </div>
      </nav>
    </div>
  )
}
