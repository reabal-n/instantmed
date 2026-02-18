"use client"

import { usePathname, useRouter } from "next/navigation"
import { Home, FileText, User, FolderOpen } from "lucide-react"
import { cn } from "@/lib/utils"

interface NavItem {
  label: string
  icon: React.ComponentType<{ className?: string }>
  href: string
  badge?: number
}

interface MobileNavProps {
  items?: NavItem[]
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
    icon: FolderOpen,
    href: "/doctor/scripts",
  },
  {
    label: "Patients",
    icon: User,
    href: "/doctor/patients",
  },
  {
    label: "Settings",
    icon: Home,
    href: "/doctor/settings/identity",
  },
]

/** Doctor-specific mobile navigation with doctor routes pre-configured */
export function DoctorMobileNav({ className }: { className?: string }) {
  return <MobileNav items={doctorItems} className={className} />
}

export function MobileNav({ items = defaultItems, className }: MobileNavProps) {
  const pathname = usePathname()
  const router = useRouter()

  return (
    <nav
      className={cn(
        "md:hidden fixed bottom-0 left-0 right-0 z-50",
        "bg-white/95 backdrop-blur-md",
        "border-t border-border/40",
        "safe-area-pb",
        className
      )}
    >
      <div className="flex items-center justify-around px-2 py-1">
        {items.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname?.startsWith(item.href + "/")

          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              aria-current={isActive ? "page" : undefined}
              aria-label={`${item.label}${item.badge ? `, ${item.badge} notifications` : ''}`}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-2 rounded-xl",
                "min-w-[60px] relative",
                "transition-all duration-200",
                "tap-bounce",
                isActive
                  ? "text-primary bg-primary/10"
                  : "text-slate-600 dark:text-slate-400 hover:text-foreground hover:bg-muted/50"
              )}
            >
              <div className="relative">
                <Icon className={cn("w-5 h-5", isActive && "animate-bounce-once")} />
                {item.badge && item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
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
  )
}


