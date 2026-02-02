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
  Palette,
  Edit,
  TrendingUp,
  DollarSign,
  Activity,
  Trophy,
  ClipboardList,
  CreditCard,
  Webhook,
  Send,
  ScrollText,
  Zap,
  ListOrdered,
  Settings,
  ShieldCheck,
  Shield,
  Timer,
  HelpCircle,
  Database,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"

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

const doctorNavItems: NavItem[] = [
  { href: "/doctor", label: "Review Queue", icon: ListOrdered },
  { href: "/doctor/patients", label: "Patients", icon: Users },
  { href: "/doctor/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/doctor/admin", label: "All Requests", icon: FileText },
  { href: "/doctor/settings/identity", label: "Settings", icon: Settings },
]

const configNavItems: NavItem[] = [
  { href: "/admin/clinic", label: "Clinic Identity", icon: Building2 },
  { href: "/admin/doctors", label: "Doctor Profiles", icon: Stethoscope },
  { href: "/admin/services", label: "Services", icon: Cog },
  { href: "/admin/features", label: "Feature Flags", icon: ToggleLeft },
  { href: "/admin/settings/encryption", label: "Encryption", icon: Shield },
  { href: "/admin/performance/database", label: "Database", icon: Database },
]

const emailNavItems: NavItem[] = [
  { href: "/admin/email-hub", label: "Email Hub", icon: Mail },
  { href: "/admin/email-test", label: "Email Test Studio", icon: Palette },
  { href: "/admin/emails", label: "Email Templates", icon: Edit },
  { href: "/admin/content", label: "Content Editor", icon: FileText },
  { href: "/admin/studio", label: "Template Studio", icon: Palette },
]

const dashboardNavItems: NavItem[] = [
  { href: "/admin/analytics", label: "Analytics", icon: TrendingUp },
  { href: "/admin/finance", label: "Finance", icon: DollarSign },
  { href: "/admin/ops", label: "Operations", icon: Activity },
  { href: "/admin/doctors/performance", label: "Doctor Performance", icon: Trophy },
  { href: "/doctor/queue", label: "Doctor Queue", icon: ClipboardList },
  { href: "/admin/compliance", label: "Compliance", icon: ShieldCheck },
  { href: "/admin/finance/revenue", label: "Revenue", icon: DollarSign },
]

const opsNavItems: NavItem[] = [
  { href: "/admin/refunds", label: "Refunds", icon: CreditCard },
  { href: "/admin/webhook-dlq", label: "Webhook DLQ", icon: Webhook },
  { href: "/admin/email-queue", label: "Email Queue", icon: Mail },
  { href: "/admin/ops/email-outbox", label: "Email Outbox", icon: Send },
  { href: "/admin/audit", label: "Audit Log", icon: ScrollText },
  { href: "/admin/ops/sla", label: "SLA Monitor", icon: Timer },
  { href: "/admin/support", label: "Support", icon: HelpCircle },
]

export function AdminSidebar({ userName, userRole = "Admin", pendingCount = 0 }: AdminSidebarProps) {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === "/doctor" && pathname === "/doctor") return true
    if (href === "/admin" && pathname === "/admin") return true
    if (href !== "/doctor" && href !== "/admin" && pathname?.startsWith(href)) return true
    return pathname === href
  }

  const renderNavSection = (title: string, items: NavItem[], accentColor: "indigo" | "amber" | "slate" | "emerald" = "indigo") => {
    const colorClasses = {
      indigo: {
        active: "bg-linear-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/25",
        inactive: "text-muted-foreground hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-700 dark:hover:text-indigo-300",
        badge: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300",
        header: "text-indigo-700 dark:text-indigo-400",
      },
      amber: {
        active: "bg-linear-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25",
        inactive: "text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10",
        badge: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
        header: "text-amber-700 dark:text-amber-400",
      },
      slate: {
        active: "bg-linear-to-r from-slate-600 to-slate-700 text-white shadow-lg shadow-slate-500/25",
        inactive: "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-500/10",
        badge: "bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300",
        header: "text-slate-600 dark:text-slate-400",
      },
      emerald: {
        active: "bg-linear-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/25",
        inactive: "text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10",
        badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
        header: "text-emerald-600 dark:text-emerald-400",
      },
    }

    const colors = colorClasses[accentColor]

    return (
      <div className="space-y-1">
        <p className={cn("px-3 py-1.5 text-xs font-semibold uppercase tracking-wider", colors.header)}>
          {title}
        </p>
        {items.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                active ? colors.active : colors.inactive
              )}
            >
              <span className="flex items-center gap-3">
                <item.icon className={cn("w-4 h-4 transition-transform", !active && "group-hover:scale-110")} />
                {item.label}
              </span>
              {item.badge !== undefined && item.badge > 0 && (
                <Badge className={cn("text-xs", active ? "bg-white/20 text-white" : colors.badge)}>
                  {item.badge}
                </Badge>
              )}
            </Link>
          )
        })}
      </div>
    )
  }

  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-border/40 bg-linear-to-b from-white via-slate-50/50 to-white dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="sticky top-0 h-screen overflow-y-auto">
        {/* Logo/Brand Header */}
        <div className="p-4 border-b border-border/40">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/25">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold bg-linear-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                InstantMed
              </span>
              <p className="text-xs text-muted-foreground">Admin Portal</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-4">
          {/* Main Admin Dashboard Link */}
          <Link
            href="/admin"
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
              pathname === "/admin"
                ? "bg-linear-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/25"
                : "text-muted-foreground hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-700"
            )}
          >
            <LayoutDashboard className="w-4 h-4" />
            Admin Dashboard
            {pendingCount > 0 && (
              <Badge className={cn("ml-auto text-xs", pathname === "/admin" ? "bg-white/20 text-white" : "bg-indigo-100 text-indigo-700")}>
                {pendingCount}
              </Badge>
            )}
          </Link>

          {/* Doctor Nav */}
          <div className="pt-2 border-t border-border/40">
            {renderNavSection("Doctor Tools", doctorNavItems, "indigo")}
          </div>

          {/* Configuration */}
          <div className="pt-2 border-t border-border/40">
            {renderNavSection("Configuration", configNavItems, "amber")}
          </div>

          {/* Email Operations */}
          <div className="pt-2 border-t border-border/40">
            {renderNavSection("Email & Content", emailNavItems, "emerald")}
          </div>

          {/* Dashboards */}
          <div className="pt-2 border-t border-border/40">
            {renderNavSection("Dashboards", dashboardNavItems, "slate")}
          </div>

          {/* Operations */}
          <div className="pt-2 border-t border-border/40">
            {renderNavSection("Operations", opsNavItems, "slate")}
          </div>
        </nav>

        {/* User Profile Card */}
        <div className="mt-auto p-4 border-t border-border/40">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-linear-to-br from-indigo-500 to-violet-600 text-white font-semibold">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground truncate">{userName}</p>
              <p className="text-xs text-muted-foreground">{userRole}</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
