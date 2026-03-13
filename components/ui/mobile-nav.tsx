"use client"

import { useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Home, FileText, User, FolderOpen, MoreHorizontal, ClipboardList, Activity, MessageSquare, X, Settings, BarChart3, Shield } from "lucide-react"
import { cn } from "@/lib/utils"

interface NavItem {
  label: string
  icon: React.ComponentType<{ className?: string }>
  href: string
  badge?: number
}

interface MobileNavProps {
  items?: NavItem[]
  moreMenuItems?: NavItem[]
  className?: string
}

const defaultItems: NavItem[] = [
  {
    label: "Home",
    icon: Home,
    href: "/patient",
  },
  {
    label: "Requests",
    icon: FileText,
    href: "/patient/intakes",
  },
  {
    label: "Documents",
    icon: FolderOpen,
    href: "/patient/documents",
  },
  {
    label: "More",
    icon: MoreHorizontal,
    href: "__more__",
  },
]

const moreItems: NavItem[] = [
  {
    label: "Prescriptions",
    icon: ClipboardList,
    href: "/patient/prescriptions",
  },
  {
    label: "Health Summary",
    icon: Activity,
    href: "/patient/health-summary",
  },
  {
    label: "Messages",
    icon: MessageSquare,
    href: "/patient/messages",
  },
  {
    label: "Account",
    icon: User,
    href: "/patient/settings",
  },
]

const doctorItems: NavItem[] = [
  {
    label: "Queue",
    icon: FileText,
    href: "/doctor/dashboard",
  },
  {
    label: "Scripts",
    icon: ClipboardList,
    href: "/doctor/scripts",
  },
  {
    label: "Patients",
    icon: User,
    href: "/doctor/patients",
  },
  {
    label: "More",
    icon: MoreHorizontal,
    href: "__more__",
  },
]

const doctorMoreItems: NavItem[] = [
  {
    label: "All Requests",
    icon: Shield,
    href: "/doctor/admin",
  },
  {
    label: "Analytics",
    icon: BarChart3,
    href: "/doctor/analytics",
  },
  {
    label: "Settings",
    icon: Settings,
    href: "/doctor/settings/identity",
  },
]

/** Doctor-specific mobile navigation with doctor routes pre-configured */
export function DoctorMobileNav({ className }: { className?: string }) {
  return <MobileNav items={doctorItems} moreMenuItems={doctorMoreItems} className={className} />
}

export function MobileNav({ items = defaultItems, moreMenuItems = moreItems, className }: MobileNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [moreOpen, setMoreOpen] = useState(false)

  const isMoreActive = moreMenuItems.some(
    (item) => pathname === item.href || pathname?.startsWith(item.href + "/")
  )

  return (
    <>
      {/* More drawer overlay */}
      {moreOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-xs"
            onClick={() => setMoreOpen(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 bg-background rounded-t-2xl border-t border-border safe-area-pb animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <p className="text-sm font-semibold text-foreground">More</p>
              <button
                onClick={() => setMoreOpen(false)}
                className="p-2 rounded-lg hover:bg-muted transition-colors"
                aria-label="Close menu"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <nav className="px-3 pb-4 space-y-1">
              {moreMenuItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href || pathname?.startsWith(item.href + "/")
                return (
                  <button
                    key={item.href}
                    onClick={() => {
                      setMoreOpen(false)
                      router.push(item.href)
                    }}
                    className={cn(
                      "flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:bg-muted/50"
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-sm">{item.label}</span>
                  </button>
                )
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Bottom tab bar */}
      <nav
        className={cn(
          "lg:hidden fixed bottom-0 left-0 right-0 z-50",
          "bg-background/95 backdrop-blur-md",
          "border-t border-border/40",
          "safe-area-pb",
          className
        )}
      >
        <div className="flex items-center justify-around px-2 py-1">
          {items.map((item) => {
            const Icon = item.icon
            const isMore = item.href === "__more__"
            // Home (/patient) uses exact match — child routes like /patient/intakes are distinct
            const isActive = isMore
              ? isMoreActive || moreOpen
              : item.href === "/patient"
                ? pathname === "/patient" || pathname === "/patient/"
                : pathname === item.href || pathname?.startsWith(item.href + "/")

            return (
              <button
                key={item.href}
                onClick={() => {
                  if (isMore) {
                    setMoreOpen(!moreOpen)
                  } else {
                    setMoreOpen(false)
                    router.push(item.href)
                  }
                }}
                aria-current={isActive && !isMore ? "page" : undefined}
                aria-expanded={isMore ? moreOpen : undefined}
                aria-label={`${item.label}${item.badge ? `, ${item.badge} notifications` : ''}`}
                className={cn(
                  "flex flex-col items-center gap-1 px-3 py-2 rounded-xl",
                  "min-w-[60px] relative",
                  "transition-all duration-200",
                  "tap-bounce",
                  isActive
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <div className="relative">
                  <Icon className={cn("w-5 h-5", isActive && "animate-scale-in")} />
                  {item.badge && item.badge > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 dark:bg-red-600 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
                      {item.badge > 9 ? "9+" : item.badge}
                    </span>
                  )}
                </div>
                <span className={cn("text-xs font-medium", isActive && "font-semibold")}>
                  {item.label}
                </span>
              </button>
            )
          })}
        </div>
      </nav>
    </>
  )
}


