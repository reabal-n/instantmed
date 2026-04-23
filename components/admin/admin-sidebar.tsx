"use client"

import {
  Activity,
  BarChart3,
  Bug,
  Building2,
  ChevronDown,
  ChevronRight,
  Cog,
  CreditCard,
  DollarSign,
  LayoutDashboard,
  ListOrdered,
  Mail,
  Mailbox,
  Menu,
  PenTool,
  ScrollText,
  Settings,
  ShieldCheck,
  Stethoscope,
  ToggleLeft,
  TrendingUp,
  Users,
  Webhook,
  X,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"

interface AdminSidebarProps {
  userName: string
  userRole?: string
  pendingCount?: number
}

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  badge?: number
}

// ── Doctor quick-access ──────────────────────────────────────
const doctorNavItems: NavItem[] = [
  { href: "/doctor/dashboard", label: "Review Queue", icon: ListOrdered },
  { href: "/doctor/patients", label: "Patients", icon: Users },
]

// ── Configuration ────────────────────────────────────────────
const configNavItems: NavItem[] = [
  { href: "/admin/clinic", label: "Clinic Identity", icon: Building2 },
  { href: "/admin/doctors", label: "Doctors", icon: Stethoscope },
  { href: "/admin/services", label: "Services", icon: Cog },
  { href: "/admin/features", label: "Feature Flags", icon: ToggleLeft },
  { href: "/admin/emails", label: "Email Templates", icon: Mail },
]

// ── Analytics (collapsible) ───────────────────────────────────
const analyticsNavItems: NavItem[] = [
  { href: "/admin/analytics", label: "Analytics", icon: TrendingUp },
  { href: "/admin/business-kpi", label: "Business KPIs", icon: BarChart3 },
  { href: "/admin/finance", label: "Finance", icon: DollarSign },
  { href: "/admin/ops", label: "Operations", icon: Activity },
  { href: "/admin/compliance", label: "Compliance", icon: ShieldCheck },
]

// ── System (collapsible) ─────────────────────────────────────
const systemNavItems: NavItem[] = [
  { href: "/admin/audit", label: "Audit Log", icon: ScrollText },
  { href: "/admin/refunds", label: "Refunds", icon: CreditCard },
  { href: "/admin/errors", label: "Errors", icon: Bug },
  { href: "/admin/webhooks", label: "Webhooks", icon: Webhook },
  { href: "/admin/content", label: "Content", icon: PenTool },
  { href: "/admin/email-hub", label: "Email Hub", icon: Mailbox },
  { href: "/admin/settings", label: "Settings", icon: Settings },
]

const isInSection = (items: NavItem[], path: string | null) =>
  path && items.some((i) => path === i.href || path.startsWith(i.href + "/"))

export function AdminSidebar({ userName, userRole = "Admin", pendingCount = 0 }: AdminSidebarProps) {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === "/doctor/dashboard" && pathname === "/doctor/dashboard") return true
    if (href === "/admin" && pathname === "/admin") return true
    if (href !== "/doctor/dashboard" && href !== "/admin" && pathname?.startsWith(href)) return true
    return pathname === href
  }

  const renderNavSection = (title: string, items: NavItem[]) => (
    <div className="space-y-1">
      <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
      {items.map((item) => {
        const active = isActive(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "group flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            )}
          >
            <span className="flex items-center gap-2.5">
              <item.icon className={cn(
                "w-[18px] h-[18px]",
                active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
              )} />
              {item.label}
            </span>
            {item.badge !== undefined && item.badge > 0 && (
              <span className={cn(
                "min-w-[20px] h-5 flex items-center justify-center px-1.5 rounded-full text-xs font-semibold",
                active
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}>
                {item.badge}
              </span>
            )}
            {!item.badge && active && (
              <ChevronRight className="w-3.5 h-3.5 text-primary/50" />
            )}
          </Link>
        )
      })}
    </div>
  )

  const initials = userName
    .split(" ")
    .map(n => n.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <aside className="hidden lg:flex w-[260px] shrink-0 flex-col" aria-label="Admin sidebar">
      <div className="sticky top-6 flex flex-col gap-1 pb-6">
        {/* Brand */}
        <div className="px-4 py-5 mb-2">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <span className="text-sm font-semibold tracking-tight">IM</span>
            </div>
            <div>
              <span className="text-base font-semibold tracking-tight text-foreground">
                InstantMed
              </span>
              <p className="text-xs text-muted-foreground leading-none mt-1">Admin</p>
            </div>
          </div>
        </div>

        {/* Admin Dashboard Link */}
        <div className="px-3 mb-1">
          <Link
            href="/admin"
            className={cn(
              "flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
              pathname === "/admin"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            )}
          >
            <span className="flex items-center gap-2.5">
              <LayoutDashboard className={cn(
                "w-[18px] h-[18px]",
                pathname === "/admin" ? "text-primary" : "text-muted-foreground"
              )} />
              Dashboard
            </span>
            {pendingCount > 0 && (
              <span className="min-w-[20px] h-5 flex items-center justify-center px-1.5 rounded-full text-xs font-semibold bg-primary text-primary-foreground">
                {pendingCount}
              </span>
            )}
          </Link>
        </div>

        {/* Navigation Sections */}
        <nav className="flex flex-col gap-3 px-3">
          {renderNavSection("Doctor Tools", doctorNavItems)}

          <div className="mx-3 border-t border-border/30" />
          {renderNavSection("Configuration", configNavItems)}

          <div className="mx-3 border-t border-border/30" />
          <Collapsible defaultOpen={!!isInSection(analyticsNavItems, pathname)}>
            <CollapsibleTrigger className="group flex w-full items-center justify-between px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors">
              <span className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Analytics
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-1 space-y-0.5 pl-1">
                {analyticsNavItems.map((item) => {
                  const active = isActive(item.href)
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                        active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {item.label}
                    </Link>
                  )
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Collapsible defaultOpen={!!isInSection(systemNavItems, pathname)}>
            <CollapsibleTrigger className="group flex w-full items-center justify-between px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors">
              <span className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                System
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-1 space-y-0.5 pl-1">
                {systemNavItems.map((item) => {
                  const active = isActive(item.href)
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                        active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {item.label}
                    </Link>
                  )
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </nav>

        {/* Spacer */}
        <div className="flex-1 min-h-4" />

        {/* User Profile */}
        <div className="px-4 mt-auto">
          <div className="flex items-center gap-3 px-2 py-3 rounded-lg">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-foreground text-xs font-semibold">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate leading-tight">{userName}</p>
              <p className="text-xs text-muted-foreground leading-tight mt-0.5">{userRole}</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}

// ── Mobile Admin Navigation (slide-in drawer) ──────────────
export function MobileAdminNav({ pendingCount = 0 }: { pendingCount?: number }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  const isActive = (href: string) => {
    if (href === "/doctor/dashboard" && pathname === "/doctor/dashboard") return true
    if (href === "/admin" && pathname === "/admin") return true
    if (href !== "/doctor/dashboard" && href !== "/admin" && pathname?.startsWith(href)) return true
    return pathname === href
  }

  const renderMobileLink = (item: NavItem) => {
    const active = isActive(item.href)
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setOpen(false)}
        className={cn(
          "flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
          active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
        )}
      >
        <span className="flex items-center gap-2.5">
          <item.icon className={cn("w-[18px] h-[18px]", active ? "text-primary" : "text-muted-foreground")} />
          {item.label}
        </span>
        {active && <ChevronRight className="w-3.5 h-3.5 text-primary/50" />}
      </Link>
    )
  }

  return (
    <div className="lg:hidden">
      <button
        onClick={() => setOpen(true)}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/50 bg-background text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        aria-label="Open admin navigation"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm animate-in fade-in-0 duration-200"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <nav
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[280px] flex flex-col bg-background border-r border-border shadow-xl",
          "transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "-translate-x-full"
        )}
        aria-label="Admin navigation"
      >
        <div className="flex items-center justify-between px-4 py-4 border-b border-border/40">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <span className="text-sm font-semibold tracking-tight">IM</span>
            </div>
            <div>
              <span className="text-base font-semibold tracking-tight text-foreground">InstantMed</span>
              <p className="text-xs text-muted-foreground leading-none mt-0.5">Admin</p>
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

        <div className="px-3 pt-3 pb-1">
          <Link
            href="/admin"
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
              pathname === "/admin" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            )}
          >
            <span className="flex items-center gap-2.5">
              <LayoutDashboard className={cn("w-[18px] h-[18px]", pathname === "/admin" ? "text-primary" : "text-muted-foreground")} />
              Dashboard
            </span>
            {pendingCount > 0 && (
              <span className="min-w-[20px] h-5 flex items-center justify-center px-1.5 rounded-full text-xs font-semibold bg-primary text-primary-foreground">
                {pendingCount}
              </span>
            )}
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
          <div className="space-y-0.5">
            <p className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Doctor Tools</p>
            {doctorNavItems.map(renderMobileLink)}
          </div>
          <div className="border-t border-border/30" />
          <div className="space-y-0.5">
            <p className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Configuration</p>
            {configNavItems.map(renderMobileLink)}
          </div>
          <div className="border-t border-border/30" />
          <Collapsible defaultOpen={!!isInSection(analyticsNavItems, pathname)}>
            <CollapsibleTrigger className="group flex w-full items-center justify-between px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors">
              <span className="flex items-center gap-2">Analytics</span>
              <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-1 space-y-0.5 pl-1">{analyticsNavItems.map(renderMobileLink)}</div>
            </CollapsibleContent>
          </Collapsible>
          <Collapsible defaultOpen={!!isInSection(systemNavItems, pathname)}>
            <CollapsibleTrigger className="group flex w-full items-center justify-between px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors">
              <span className="flex items-center gap-2">System</span>
              <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-1 space-y-0.5 pl-1">{systemNavItems.map(renderMobileLink)}</div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </nav>
    </div>
  )
}
