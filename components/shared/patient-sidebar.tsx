"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Home, FileText, Plus, Settings, HelpCircle } from "lucide-react"

const navItems = [
  { href: "/patient", label: "Dashboard", icon: Home },
  { href: "/patient/requests", label: "My Requests", icon: FileText },
  { href: "/patient/requests/new", label: "New Request", icon: Plus },
  { href: "/patient/settings", label: "Settings", icon: Settings },
]

const quickLinks = [
  { href: "/medical-certificate", label: "Med Certificate" },
  { href: "/prescriptions", label: "Prescription" },
  { href: "/referrals", label: "Referral" },
]

export function PatientSidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden lg:block w-64 flex-shrink-0">
      <div className="sticky top-24 space-y-6">
        {/* Main Nav */}
        <nav className="glass-card rounded-2xl p-3 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/patient" && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/50",
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Quick Actions */}
        <div className="glass-card rounded-2xl p-4">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Quick Actions</h4>
          <div className="space-y-2">
            {quickLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-white/50 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Help Card */}
        <div className="glass-card rounded-2xl p-4 bg-gradient-to-br from-primary/5 to-primary/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <HelpCircle className="w-4 h-4 text-primary" />
            </div>
            <h4 className="text-sm font-medium text-foreground">Need help?</h4>
          </div>
          <p className="text-xs text-muted-foreground mb-3">Check our FAQ or contact support for assistance.</p>
          <Link href="/faq" className="text-xs font-medium text-primary hover:underline">
            View FAQs →
          </Link>
        </div>
      </div>
    </aside>
  )
}
