"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, FileText, Users, BarChart3, Download, ListOrdered } from "lucide-react"
import { Button } from "@/components/ui/button"

const navItems = [
  { href: "/doctor", label: "Dashboard", icon: LayoutDashboard },
  { href: "/doctor/queue", label: "Review Queue", icon: ListOrdered, badge: true },
  { href: "/doctor/admin", label: "All Requests", icon: FileText },
  { href: "/doctor/patients", label: "Patients", icon: Users },
  { href: "/doctor/analytics", label: "Analytics", icon: BarChart3 },
]

interface DoctorSidebarProps {
  pendingCount?: number
  scriptsToSend?: number
}

export function DoctorSidebar({ pendingCount = 0, scriptsToSend = 0 }: DoctorSidebarProps) {
  const pathname = usePathname()

  const handleExport = () => {
    window.location.href = "/api/doctor/export?format=csv"
  }

  return (
    <aside className="hidden lg:block w-64 shrink-0">
      <div className="sticky top-24 space-y-6">
        {/* Main Nav */}
        <nav className="glass-card rounded-2xl p-3 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/doctor" && pathname.startsWith(item.href))
            const showBadge = item.badge && pendingCount > 0
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/50",
                )}
              >
                <span className="flex items-center gap-3">
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </span>
                {showBadge && (
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded-full text-xs font-semibold",
                      isActive ? "bg-white/20 text-white" : "bg-violet-100 text-violet-700",
                    )}
                  >
                    {pendingCount}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Stats Card */}
        <div className="glass-card rounded-2xl p-4 space-y-3">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quick Stats</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 rounded-lg bg-indigo-50/50">
              <span className="text-sm text-indigo-700">Pending Review</span>
              <span className="text-sm font-semibold text-indigo-700">{pendingCount}</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-violet-50/50">
              <span className="text-sm text-violet-700">Scripts to Send</span>
              <span className="text-sm font-semibold text-violet-700">{scriptsToSend}</span>
            </div>
          </div>
        </div>

        {/* Export Button */}
        <div className="glass-card rounded-2xl p-4">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Data Export</h4>
          <Button variant="outline" size="sm" className="w-full rounded-xl bg-white/50 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-colors" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export to CSV
          </Button>
          <p className="text-xs text-muted-foreground mt-2">Download all requests for your records</p>
        </div>
      </div>
    </aside>
  )
}
