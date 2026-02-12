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
  Palette,
  Building2,
  Shield,
  Keyboard,
  Wrench,
  Mail,
  AlertTriangle,
  CreditCard,
  ChevronRight,
  LogOut,
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
  { href: "/doctor", label: "Review Queue", icon: ListOrdered, badge: true },
  { href: "/doctor/scripts", label: "Scripts", icon: ClipboardList },
  { href: "/doctor/patients", label: "Patients", icon: Users },
  { href: "/doctor/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/doctor/admin", label: "All Requests", icon: FileText },
  { href: "/doctor/settings/identity", label: "Settings", icon: Settings },
]

const adminNavItems: NavItem[] = [
  { href: "/admin/studio", label: "Certificate Studio", icon: Palette },
  { href: "/admin/clinic", label: "Clinic Settings", icon: Building2 },
  { href: "/admin", label: "Admin Dashboard", icon: Shield },
]

const opsNavItemsBase: NavItem[] = [
  { href: "/admin/ops", label: "Ops Overview", icon: Wrench },
  { href: "/admin/ops/intakes-stuck", label: "Stuck Intakes", icon: AlertTriangle },
]

const opsNavItemsAdminOnly: NavItem[] = [
  { href: "/doctor/admin/email-outbox", label: "Email Outbox", icon: Mail },
  { href: "/admin/ops/reconciliation", label: "Reconciliation", icon: CreditCard },
  { href: "/admin/ops/doctors", label: "Doctor Ops", icon: Users },
]

function NavLink({ item, isActive, badgeCount }: { item: NavItem; isActive: boolean; badgeCount?: number }) {
  return (
    <Link
      href={item.href}
      className={cn(
        "group flex items-center justify-between px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200",
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
            "min-w-[20px] h-5 flex items-center justify-center px-1.5 rounded-full text-[11px] font-semibold",
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
  const navItems = doctorNavItems
  const baseHref = variant === "patient" ? "/patient" : "/doctor"

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
              <span className="text-sm font-bold tracking-tight">IM</span>
            </div>
            <div>
              <span className="text-[15px] font-semibold tracking-tight text-foreground">
                InstantMed
              </span>
              <p className="text-[11px] text-muted-foreground capitalize leading-none mt-0.5">{variant} Portal</p>
            </div>
          </div>
        </div>

        {/* Main Navigation */}
        <nav className="flex flex-col gap-0.5 px-3">
          <p className="px-3 mb-1.5 text-[11px] font-medium text-muted-foreground/70 uppercase tracking-wider">Navigation</p>
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
            <p className="px-3 mb-1.5 text-[11px] font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider">Admin</p>
            {adminNavItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/admin" && pathname?.startsWith(item.href))
              return (
                <NavLink key={item.href} item={item} isActive={!!isActive} />
              )
            })}
          </nav>
        )}

        {/* Ops Navigation */}
        {variant === "doctor" && (
          <nav className="flex flex-col gap-0.5 px-3 mt-4" data-testid="ops-nav-section">
            <p className="px-3 mb-1.5 text-[11px] font-medium text-muted-foreground/70 uppercase tracking-wider">Ops</p>
            {opsNavItemsBase.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/admin/ops" && pathname?.startsWith(item.href))
              return (
                <NavLink
                  key={item.href}
                  item={item}
                  isActive={!!isActive}
                />
              )
            })}
            {isAdmin && opsNavItemsAdminOnly.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(item.href)
              return (
                <NavLink
                  key={item.href}
                  item={item}
                  isActive={!!isActive}
                />
              )
            })}
          </nav>
        )}

        {/* Divider */}
        <div className="mx-6 my-3 border-t border-border/50" />

        {/* Stats - Doctor only */}
        {variant === "doctor" && (
          <div className="px-6 flex flex-col gap-2">
            <p className="text-[11px] font-medium text-muted-foreground/70 uppercase tracking-wider">Queue</p>
            <div className="flex items-center justify-between py-1.5">
              <span className="text-[13px] text-muted-foreground">Pending</span>
              <span className={cn(
                "text-[13px] font-semibold tabular-nums",
                pendingCount > 0 ? "text-primary" : "text-muted-foreground"
              )}>
                {pendingCount}
              </span>
            </div>
          </div>
        )}

        {/* Patient Quick Action */}
        {variant === "patient" && (
          <div className="px-4">
            <Button 
              asChild 
              className="w-full h-9 text-[13px]"
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
                  className="w-full h-8 text-[12px] text-muted-foreground hover:text-foreground justify-between px-3"
                >
                  <span className="flex items-center gap-2">
                    <Keyboard className="w-3.5 h-3.5" />
                    Shortcuts
                  </span>
                  <kbd className="text-[10px] font-mono bg-muted/80 px-1.5 py-0.5 rounded text-muted-foreground">?</kbd>
                </Button>
              }
            />
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full h-8 text-[12px] text-muted-foreground hover:text-foreground justify-start gap-2 px-3" 
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
          <div className="flex items-center gap-2.5 px-2 py-2.5 rounded-lg hover:bg-muted/50 transition-colors cursor-default">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-foreground text-[12px] font-semibold">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-foreground truncate leading-tight">{userName}</p>
              <p className="text-[11px] text-muted-foreground capitalize leading-tight">{userRole || variant}</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
