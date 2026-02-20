"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  FileText,
  Users,
  BarChart3,
  Building2,
  Stethoscope,
  Cog,
  ToggleLeft,
  Mail,
  TrendingUp,
  DollarSign,
  Activity,
  CreditCard,
  ScrollText,
  ListOrdered,
  Settings,
  ShieldCheck,
  ChevronRight,
} from "lucide-react"

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
  { href: "/doctor/admin", label: "All Requests", icon: FileText },
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

// ── Analytics ────────────────────────────────────────────────
const analyticsNavItems: NavItem[] = [
  { href: "/admin/analytics", label: "Analytics", icon: TrendingUp },
  { href: "/admin/finance", label: "Finance", icon: DollarSign },
  { href: "/admin/ops", label: "Operations", icon: Activity },
  { href: "/admin/compliance", label: "Compliance", icon: ShieldCheck },
]

// ── System ───────────────────────────────────────────────────
const systemNavItems: NavItem[] = [
  { href: "/admin/audit", label: "Audit Log", icon: ScrollText },
  { href: "/admin/refunds", label: "Refunds", icon: CreditCard },
  { href: "/admin/settings/encryption", label: "Settings", icon: Settings },
]

export function AdminSidebar({ userName, userRole = "Admin", pendingCount = 0 }: AdminSidebarProps) {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === "/doctor/dashboard" && pathname === "/doctor/dashboard") return true
    if (href === "/admin" && pathname === "/admin") return true
    if (href !== "/doctor/dashboard" && href !== "/admin" && pathname?.startsWith(href)) return true
    return pathname === href
  }

  const renderNavSection = (title: string, items: NavItem[]) => (
    <div className="space-y-0.5">
      <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
        {title}
      </p>
      {items.map((item) => {
        const active = isActive(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "group flex items-center justify-between px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200",
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
    <aside className="hidden lg:flex w-[260px] shrink-0 flex-col">
      <div className="sticky top-6 flex flex-col gap-1 pb-6">
        {/* Brand */}
        <div className="px-4 py-4 mb-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <span className="text-sm font-bold tracking-tight">IM</span>
            </div>
            <div>
              <span className="text-[15px] font-semibold tracking-tight text-foreground">
                InstantMed
              </span>
              <p className="text-xs text-muted-foreground leading-none mt-0.5">Admin</p>
            </div>
          </div>
        </div>

        {/* Admin Dashboard Link */}
        <div className="px-3 mb-1">
          <Link
            href="/admin"
            className={cn(
              "flex items-center justify-between px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200",
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
        <nav className="flex flex-col gap-4 px-3">
          {renderNavSection("Doctor Tools", doctorNavItems)}

          <div className="mx-3 border-t border-border/30" />
          {renderNavSection("Configuration", configNavItems)}

          <div className="mx-3 border-t border-border/30" />
          {renderNavSection("Analytics", analyticsNavItems)}

          <div className="mx-3 border-t border-border/30" />
          {renderNavSection("System", systemNavItems)}
        </nav>

        {/* Spacer */}
        <div className="flex-1 min-h-4" />

        {/* User Profile */}
        <div className="px-4 mt-auto">
          <div className="flex items-center gap-2.5 px-2 py-2.5 rounded-lg hover:bg-muted/50 transition-colors cursor-default">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-foreground text-[12px] font-semibold">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-foreground truncate leading-tight">{userName}</p>
              <p className="text-xs text-muted-foreground leading-tight">{userRole}</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
