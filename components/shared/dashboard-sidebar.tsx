"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  FileText,
  Users,
  BarChart3,
  Download,
  ListOrdered,
  ClipboardList,
  Settings,
  Shield,
  Keyboard,
  ChevronRight,
  LayoutDashboard,
  Pill,
  FolderOpen,
  MessageSquare,
  Heart,
  Menu,
  X,
  Plus,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { KeyboardShortcutsModal } from "@/components/doctor/keyboard-shortcuts-modal"

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  badge?: boolean
}

interface DashboardSidebarProps {
  variant: "patient" | "doctor"
  userName?: string
  userRole?: string
  isAdmin?: boolean
  pendingCount?: number
  requestCount?: number
}

const doctorNavItems: NavItem[] = [
  { href: "/doctor/dashboard", label: "Review Queue", icon: ListOrdered, badge: true },
  { href: "/doctor/repeat-rx", label: "Repeat Rx", icon: Pill },
  { href: "/doctor/scripts", label: "Scripts", icon: ClipboardList },
  { href: "/doctor/patients", label: "Patients", icon: Users },
  { href: "/admin", label: "All Requests", icon: FileText },
  { href: "/doctor/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/doctor/settings/identity", label: "Settings", icon: Settings },
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
  { href: "/admin", label: "Admin Panel", icon: Shield },
]

function NavLink({ item, isActive, badgeCount }: { item: NavItem; isActive: boolean; badgeCount?: number }) {
  return (
    <Link
      href={item.href}
      className={cn(
        "group flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
        isActive
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
      )}
    >
      <span className="flex items-center gap-2.5">
        <item.icon className={cn(
          "w-[18px] h-[18px]",
          isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
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

export function DashboardSidebar({ 
  variant, 
  userName = "User",
  userRole,
  isAdmin = false,
  pendingCount = 0, 
  requestCount = 0 
}: DashboardSidebarProps) {
  const pathname = usePathname()
  const navItems = variant === "patient" ? patientNavItems : doctorNavItems
  const baseHref = variant === "patient" ? "/patient" : "/doctor/dashboard"

  const handleExport = () => {
    window.location.href = "/api/doctor/export?format=csv"
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
        <nav className="flex flex-col gap-0.5 px-3">
          <p className="px-3 mb-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Navigation</p>
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== baseHref && pathname?.startsWith(item.href))
            const showBadge = item.badge && (variant === "doctor" ? pendingCount > 0 : requestCount > 0)
            const badgeCount = showBadge ? (variant === "doctor" ? pendingCount : requestCount) : undefined
            
            return (
              <NavLink
                key={item.href}
                item={item}
                isActive={!!isActive}
                badgeCount={badgeCount}
              />
            )
          })}
        </nav>

        {/* Admin Navigation */}
        {variant === "doctor" && isAdmin && (
          <nav className="flex flex-col gap-0.5 px-3 mt-4">
            <p className="px-3 mb-1.5 text-xs font-medium text-warning uppercase tracking-wider">Admin</p>
            {adminNavItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/admin" && pathname?.startsWith(item.href))
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

        {/* Tools - Doctor only */}
        {variant === "doctor" && (
          <div className="px-4 mt-2 flex flex-col gap-1.5">
            <KeyboardShortcutsModal 
              trigger={
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full h-8 text-xs text-muted-foreground hover:text-foreground justify-between px-3"
                >
                  <span className="flex items-center gap-2">
                    <Keyboard className="w-3.5 h-3.5" />
                    Shortcuts
                  </span>
                  <kbd className="text-xs font-mono bg-muted/80 px-1.5 py-0.5 rounded text-muted-foreground">?</kbd>
                </Button>
              }
            />
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full h-8 text-xs text-muted-foreground hover:text-foreground justify-start gap-2 px-3" 
              onClick={handleExport}
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </Button>
          </div>
        )}

        {/* Spacer to push user card down */}
        <div className="flex-1 min-h-4" />

        {/* User Profile */}
        <div className="px-4 mt-auto">
          <div className="flex items-center gap-2.5 px-2 py-2.5 rounded-lg">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-foreground text-xs font-semibold">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate leading-tight">{userName}</p>
              <p className="text-xs text-muted-foreground capitalize leading-tight">{userRole || variant}</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}

// ── Mobile Dashboard Navigation (slide-in drawer) ──────────
export function MobileDashboardNav({
  variant,
  pendingCount = 0,
  requestCount = 0,
}: {
  variant: "patient" | "doctor"
  pendingCount?: number
  requestCount?: number
}) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const navItems = variant === "patient" ? patientNavItems : doctorNavItems
  const baseHref = variant === "patient" ? "/patient" : "/doctor/dashboard"

  // Close drawer on route change
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <div className="lg:hidden">
      <button
        onClick={() => setOpen(true)}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/50 bg-background text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm animate-in fade-in-0 duration-200"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <nav
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[280px] flex flex-col bg-background border-r border-border shadow-xl",
          "transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "-translate-x-full"
        )}
        aria-label={`${variant} navigation`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-border/40">
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
          <button
            onClick={() => setOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav items */}
        <div className="flex-1 overflow-y-auto px-3 py-3">
          <p className="px-3 mb-1.5 text-xs font-medium text-muted-foreground/70 uppercase tracking-wider">Navigation</p>
          <div className="space-y-0.5">
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== baseHref && pathname?.startsWith(item.href))
              const showBadge = item.badge && (variant === "doctor" ? pendingCount > 0 : requestCount > 0)
              const badgeCount = showBadge ? (variant === "doctor" ? pendingCount : requestCount) : undefined

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "group flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  )}
                >
                  <span className="flex items-center gap-2.5">
                    <item.icon className={cn(
                      "w-[18px] h-[18px]",
                      isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                    )} />
                    {item.label}
                  </span>
                  {badgeCount !== undefined && badgeCount > 0 && (
                    <span className={cn(
                      "min-w-[20px] h-5 flex items-center justify-center px-1.5 rounded-full text-xs font-semibold",
                      isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    )}>
                      {badgeCount}
                    </span>
                  )}
                  {!badgeCount && isActive && (
                    <ChevronRight className="w-3.5 h-3.5 text-primary/50" />
                  )}
                </Link>
              )
            })}
          </div>
        </div>

        {/* Quick action */}
        {variant === "patient" && (
          <div className="px-4 py-3 border-t border-border/40">
            <Button asChild className="w-full h-9 text-sm">
              <Link href="/request" onClick={() => setOpen(false)}>
                <Plus className="w-4 h-4 mr-2" />
                New Request
              </Link>
            </Button>
          </div>
        )}
      </nav>
    </div>
  )
}
