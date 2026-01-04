"use client"

import { usePathname, useRouter } from "next/navigation"
import { Home, FileText, User, Calendar } from "lucide-react"
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
    href: "/patient/requests",
  },
  {
    label: "Appointments",
    icon: Calendar,
    href: "/patient/appointments",
  },
  {
    label: "Profile",
    icon: User,
    href: "/patient/profile",
  },
]

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
                <Icon className={cn("w-5 h-5", isActive && "animate-bounce-once")} />
                {item.badge && item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                    {item.badge > 9 ? "9+" : item.badge}
                  </span>
                )}
              </div>
              <span className={cn("text-[10px] font-medium", isActive && "font-semibold")}>
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

// Doctor-specific mobile nav
export function DoctorMobileNav() {
  const doctorItems: NavItem[] = [
    {
      label: "Dashboard",
      icon: Home,
      href: "/doctor/dashboard",
    },
    {
      label: "Pending",
      icon: FileText,
      href: "/doctor/pending",
    },
    {
      label: "Calendar",
      icon: Calendar,
      href: "/doctor/calendar",
    },
    {
      label: "Profile",
      icon: User,
      href: "/doctor/profile",
    },
  ]

  return <MobileNav items={doctorItems} />
}
