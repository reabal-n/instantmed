"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  BarChart3, 
  Download, 
  ListOrdered,
  ClipboardList,
  Settings,
  Zap
} from "lucide-react"
import { Button } from "@/components/ui/button"

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
  pendingCount?: number
  requestCount?: number
}

const patientNavItems: NavItem[] = [
  { href: "/patient", label: "Dashboard", icon: LayoutDashboard },
  { href: "/patient/requests", label: "My Requests", icon: ClipboardList, badge: true },
  { href: "/patient/settings", label: "Settings", icon: Settings },
]

const doctorNavItems: NavItem[] = [
  { href: "/doctor", label: "Dashboard", icon: LayoutDashboard },
  { href: "/doctor/queue", label: "Review Queue", icon: ListOrdered, badge: true },
  { href: "/doctor/admin", label: "All Requests", icon: FileText },
  { href: "/doctor/patients", label: "Patients", icon: Users },
  { href: "/doctor/analytics", label: "Analytics", icon: BarChart3 },
]

export function DashboardSidebar({ 
  variant, 
  userName = "User",
  userRole,
  pendingCount = 0, 
  requestCount = 0 
}: DashboardSidebarProps) {
  const pathname = usePathname()
  const navItems = variant === "patient" ? patientNavItems : doctorNavItems
  const baseHref = variant === "patient" ? "/patient" : "/doctor"

  const handleExport = () => {
    window.location.href = "/api/doctor/export?format=csv"
  }

  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col">
      <div className="sticky top-24 space-y-4">
        {/* Logo/Brand Header */}
        <div className="glass-card rounded-2xl p-4 border border-white/20">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/25">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold bg-linear-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                InstantMed
              </span>
              <p className="text-xs text-muted-foreground capitalize">{variant} Portal</p>
            </div>
          </div>
        </div>

        {/* Main Navigation */}
        <nav className="glass-card rounded-2xl p-3 space-y-1 border border-white/20">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== baseHref && pathname?.startsWith(item.href))
            const showBadge = item.badge && (variant === "doctor" ? pendingCount > 0 : requestCount > 0)
            const badgeCount = variant === "doctor" ? pendingCount : requestCount
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300",
                  isActive
                    ? "bg-linear-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/25"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/60 dark:hover:bg-white/10 hover:scale-[1.02] hover:shadow-sm",
                )}
              >
                <span className="flex items-center gap-3">
                  <item.icon className={cn(
                    "w-4 h-4 transition-transform duration-300",
                    !isActive && "group-hover:scale-110"
                  )} />
                  {item.label}
                </span>
                {showBadge && (
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded-full text-xs font-semibold transition-colors",
                      isActive 
                        ? "bg-white/20 text-white" 
                        : "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300",
                    )}
                  >
                    {badgeCount}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Stats Card - Doctor only */}
        {variant === "doctor" && (
          <div className="glass-card rounded-2xl p-4 space-y-3 border border-white/20">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quick Stats</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-indigo-50/80 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20">
                <span className="text-sm text-indigo-700 dark:text-indigo-300">Pending Review</span>
                <span className="text-sm font-bold text-indigo-700 dark:text-indigo-300">{pendingCount}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-violet-50/80 dark:bg-violet-500/10 border border-violet-100 dark:border-violet-500/20">
                <span className="text-sm text-violet-700 dark:text-violet-300">Scripts to Send</span>
                <span className="text-sm font-bold text-violet-700 dark:text-violet-300">{pendingCount}</span>
              </div>
            </div>
          </div>
        )}

        {/* Patient Quick Actions */}
        {variant === "patient" && (
          <div className="glass-card rounded-2xl p-4 space-y-3 border border-white/20">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quick Actions</h4>
            <Button 
              asChild 
              className="w-full rounded-xl bg-linear-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-lg shadow-indigo-500/25"
            >
              <Link href="/start">
                New Request
              </Link>
            </Button>
          </div>
        )}

        {/* Export Button - Doctor only */}
        {variant === "doctor" && (
          <div className="glass-card rounded-2xl p-4 border border-white/20">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Data Export</h4>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full rounded-xl bg-white/50 dark:bg-white/5 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:border-indigo-200 dark:hover:border-indigo-500/30 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors" 
              onClick={handleExport}
            >
              <Download className="w-4 h-4 mr-2" />
              Export to CSV
            </Button>
            <p className="text-xs text-muted-foreground mt-2">Download all requests for your records</p>
          </div>
        )}

        {/* User Profile Card */}
        <div className="glass-card rounded-2xl p-4 border border-white/20">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-linear-to-br from-indigo-500 to-violet-600 text-white font-semibold">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground truncate">{userName}</p>
              <p className="text-xs text-muted-foreground capitalize">{userRole || variant}</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
