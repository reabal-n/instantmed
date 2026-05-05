"use client"

import {
  BarChart3,
  ChevronRight,
  ClipboardList,
  FileText,
  FolderOpen,
  Heart,
  LayoutDashboard,
  ListOrdered,
  LogOut,
  MessageSquare,
  Pill,
  Settings,
  Shield,
  Users,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/supabase/auth-provider"
import { cn } from "@/lib/utils"

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  badge?: boolean
}

interface NavSection {
  title: string
  items: NavItem[]
}

interface DashboardSidebarProps {
  variant: "patient" | "doctor"
  userName?: string
  userRole?: string
  isAdmin?: boolean
  pendingCount?: number
  requestCount?: number
}

const doctorNavSections: NavSection[] = [
  {
    title: "Work",
    items: [
      { href: "/doctor/dashboard", label: "Queue", icon: ListOrdered, badge: true },
      { href: "/doctor/scripts", label: "Scripts", icon: ClipboardList },
      { href: "/doctor/patients", label: "Patients", icon: Users },
    ],
  },
  {
    title: "Practice",
    items: [
      { href: "/doctor/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/doctor/settings/identity", label: "Identity", icon: Settings },
    ],
  },
]

const patientNavItems: NavItem[] = [
  { href: "/patient", label: "Dashboard", icon: LayoutDashboard },
  { href: "/patient/intakes", label: "My Requests", icon: FileText, badge: true },
  { href: "/patient/prescriptions", label: "Prescriptions", icon: Pill },
  { href: "/patient/documents", label: "Documents", icon: FolderOpen },
  { href: "/patient/messages", label: "Messages", icon: MessageSquare },
  { href: "/patient/health-summary", label: "Health Summary", icon: Heart },
  { href: "/patient/settings", label: "Settings", icon: Settings },
]

const adminNavItems: NavItem[] = [
  { href: "/admin", label: "Admin dashboard", icon: Shield },
]

const ACTIVE_NAV_LINK = "bg-primary/5 text-blue-700 dark:bg-primary/20 dark:text-blue-200"
const ACTIVE_NAV_ICON = "text-blue-700 dark:text-blue-200"

function NavLink({
  item,
  isActive,
  badgeCount,
  onClick,
}: {
  item: NavItem
  isActive: boolean
  badgeCount?: number
  onClick?: () => void
}) {
  return (
    <Link
      href={item.href}
      prefetch={false}
      onClick={onClick}
      className={cn(
        "group flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-[background-color,color] duration-200",
        isActive
          ? ACTIVE_NAV_LINK
          : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
      )}
    >
      <span className="flex items-center gap-2.5">
        <item.icon className={cn(
          "w-[18px] h-[18px]",
          isActive ? ACTIVE_NAV_ICON : "text-muted-foreground group-hover:text-foreground"
        )} />
        {item.label}
      </span>
      {badgeCount !== undefined && badgeCount > 0 && (
        <span
          className={cn(
            "min-w-[20px] h-5 flex items-center justify-center px-1.5 rounded-full text-xs font-semibold",
            isActive 
              ? "bg-primary text-primary-foreground" 
              : "bg-muted text-muted-foreground",
          )}
        >
          {badgeCount}
        </span>
      )}
      {!badgeCount && isActive && (
        <ChevronRight className="w-3.5 h-3.5 text-primary/50" />
      )}
    </Link>
  )
}

function getIsNavItemActive(pathname: string | null, href: string, baseHref: string) {
  return pathname === href || (href !== baseHref && Boolean(pathname?.startsWith(href)))
}

function NavigationSection({
  title,
  items,
  pathname,
  baseHref,
  pendingCount,
  requestCount,
  variant,
  onNavigate,
}: {
  title: string
  items: NavItem[]
  pathname: string | null
  baseHref: string
  pendingCount: number
  requestCount: number
  variant: "patient" | "doctor"
  onNavigate?: () => void
}) {
  return (
    <div className="space-y-0.5">
      <p className="px-3 mb-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {title}
      </p>
      {items.map((item) => {
        const isActive = getIsNavItemActive(pathname, item.href, baseHref)
        const showBadge = item.badge && (variant === "doctor" ? pendingCount > 0 : requestCount > 0)
        const badgeCount = showBadge ? (variant === "doctor" ? pendingCount : requestCount) : undefined

        return (
          <NavLink
            key={item.href}
            item={item}
            isActive={!!isActive}
            badgeCount={badgeCount}
            onClick={onNavigate}
          />
        )
      })}
    </div>
  )
}

export function DashboardSidebar({
  variant,
  userName = "User",
  userRole,
  isAdmin = false,
  pendingCount = 0,
  requestCount = 0
}: DashboardSidebarProps) {
  const pathname = usePathname()
  const { signOut } = useAuth()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const navSections = variant === "patient"
    ? [{ title: "Navigation", items: patientNavItems }]
    : doctorNavSections
  const baseHref = variant === "patient" ? "/patient" : "/doctor/dashboard"

  const handleSignOut = async () => {
    setIsSigningOut(true)
    await signOut()
  }

  const initials = userName
    .split(" ")
    .map(n => n.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <aside className="hidden lg:flex w-[260px] shrink-0 flex-col">
      <div className="sticky top-6 flex flex-col gap-1 pb-6">
        {/* Brand */}
        <div className="px-4 py-4 mb-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <span className="text-sm font-semibold tracking-tight">IM</span>
            </div>
            <div>
              <span className="text-base font-semibold tracking-tight text-foreground">
                InstantMed
              </span>
              <p className="text-xs text-muted-foreground capitalize leading-none mt-0.5">{variant} Portal</p>
            </div>
          </div>
        </div>

        {/* Main Navigation */}
        <nav className="flex flex-col gap-4 px-3">
          {navSections.map((section) => (
            <NavigationSection
              key={section.title}
              title={section.title}
              items={section.items}
              pathname={pathname}
              baseHref={baseHref}
              pendingCount={pendingCount}
              requestCount={requestCount}
              variant={variant}
            />
          ))}
        </nav>

        {/* Admin Navigation */}
        {variant === "doctor" && isAdmin && (
          <nav className="flex flex-col gap-0.5 px-3 mt-4">
            <p className="px-3 mb-1.5 text-xs font-medium text-warning uppercase tracking-wider">Admin</p>
            {adminNavItems.map((item) => {
              const isActive = getIsNavItemActive(pathname, item.href, "/admin")
              return (
                <NavLink key={item.href} item={item} isActive={!!isActive} />
              )
            })}
          </nav>
        )}

        {/* Divider */}
        <div className="mx-6 my-3 border-t border-border/50" />

        {/* Patient Quick Action */}
        {variant === "patient" && (
          <div className="px-4">
            <Button 
              asChild 
              className="w-full h-9 text-sm"
            >
              <Link href="/request">
                New Request
              </Link>
            </Button>
          </div>
        )}

        {/* Spacer to push user card down */}
        <div className="flex-1 min-h-4" />

        {/* User Profile + Sign Out */}
        <div className="px-4 mt-auto">
          <div className="flex items-center gap-2.5 px-2 py-2.5 rounded-lg">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-foreground text-xs font-semibold shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate leading-tight">{userName}</p>
              <p className="text-xs text-muted-foreground capitalize leading-tight">{userRole || variant}</p>
            </div>
            <button
              onClick={handleSignOut}
              disabled={isSigningOut}
              title="Sign out"
              className="h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50 shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}
