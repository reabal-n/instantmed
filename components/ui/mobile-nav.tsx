"use client"

import { ClipboardList, CreditCard, FileText, FolderOpen, Home, LogOut, MessageSquare, MoreHorizontal, User, X } from "lucide-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"

import { STAFF_NAV_ICONS } from "@/components/admin/staff-nav-icons"
import {
  PATIENT_DASHBOARD_HREF,
  PATIENT_DOCUMENTS_HREF,
  PATIENT_INTAKES_HREF,
  PATIENT_MESSAGES_HREF,
  PATIENT_PAYMENT_HISTORY_HREF,
  PATIENT_PRESCRIPTIONS_HREF,
  PATIENT_SETTINGS_HREF,
} from "@/lib/dashboard/routes"
import { doctorNavSections, doctorOperatorNavItems } from "@/lib/dashboard/staff-navigation"
import { getStaffNavHrefPath, getStaffNavHrefStatus } from "@/lib/dashboard/staff-navigation-active"
import { usePatientNavCounts } from "@/lib/dashboard/use-patient-nav-counts"
import { useLiveStaffNavCounts } from "@/lib/dashboard/use-staff-nav-counts"
import { useAuth } from "@/lib/supabase/auth-provider"
import { cn } from "@/lib/utils"

const ACTIVE_MOBILE_NAV = "bg-primary/5 text-blue-700 dark:bg-primary/20 dark:text-blue-200"

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
    href: PATIENT_DASHBOARD_HREF,
  },
  {
    label: "Requests",
    icon: FileText,
    href: PATIENT_INTAKES_HREF,
  },
  {
    label: "Documents",
    icon: FolderOpen,
    href: PATIENT_DOCUMENTS_HREF,
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
    href: PATIENT_PRESCRIPTIONS_HREF,
  },
  {
    label: "Messages",
    icon: MessageSquare,
    href: PATIENT_MESSAGES_HREF,
  },
  {
    label: "Payments",
    icon: CreditCard,
    href: PATIENT_PAYMENT_HISTORY_HREF,
  },
  {
    label: "Account",
    icon: User,
    href: PATIENT_SETTINGS_HREF,
  },
]

const doctorMoreItems: NavItem[] = doctorNavSections[1].items.map((item) => ({
  label: item.label,
  icon: STAFF_NAV_ICONS[item.icon],
  href: item.href,
}))

/** Doctor-specific mobile navigation with doctor routes pre-configured */
export function DoctorMobileNav({ className, isAdmin = false }: { className?: string; isAdmin?: boolean }) {
  const counts = useLiveStaffNavCounts()
  const items: NavItem[] = [
    ...doctorNavSections[0].items.map((item) => ({
      label: item.label,
      icon: STAFF_NAV_ICONS[item.icon],
      href: item.href,
      badge: item.badgeKey ? counts[item.badgeKey] : undefined,
    })),
    {
      label: "More",
      icon: MoreHorizontal,
      href: "__more__",
    },
  ]

  const moreMenuItems = isAdmin
    ? [
        ...doctorMoreItems,
        ...doctorOperatorNavItems.map((item) => ({
          label: item.label,
          icon: STAFF_NAV_ICONS[item.icon],
          href: item.href,
        })),
      ]
    : doctorMoreItems

  return <MobileNav items={items} moreMenuItems={moreMenuItems} className={className} />
}

export function MobileNav({ items = defaultItems, moreMenuItems = moreItems, className }: MobileNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { signOut } = useAuth()
  const [moreOpen, setMoreOpen] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const currentStatus = searchParams.get("status")

  // The default-prop call sites of MobileNav are patient surfaces (PatientShell).
  // DoctorMobileNav passes its own items/moreMenuItems and never hits this branch.
  const isPatientShell = items === defaultItems && moreMenuItems === moreItems
  const patientCounts = usePatientNavCounts()
  const itemsWithBadges: NavItem[] = isPatientShell
    ? items.map((item) =>
        item.href === "__more__"
          ? { ...item, badge: patientCounts.unreadMessages }
          : item,
      )
    : items
  const moreMenuItemsWithBadges: NavItem[] = isPatientShell
    ? moreMenuItems.map((item) =>
        item.href === PATIENT_MESSAGES_HREF
          ? { ...item, badge: patientCounts.unreadMessages }
          : item,
      )
    : moreMenuItems

  const hasRootDashboardNavItem = [...itemsWithBadges, ...moreMenuItemsWithBadges].some(
    (item) => getStaffNavHrefPath(item.href) === "/dashboard" && !getStaffNavHrefStatus(item.href),
  )

  const handleSignOut = async () => {
    if (isSigningOut) return
    setIsSigningOut(true)
    setMoreOpen(false)
    await signOut()
  }

  function isNavItemActive(item: NavItem, exactDashboard = false): boolean {
    const hrefPath = getStaffNavHrefPath(item.href)
    const hrefStatus = getStaffNavHrefStatus(item.href)

    if (hrefStatus) {
      if (pathname !== hrefPath) return false
      if (currentStatus === hrefStatus) return true
      return !currentStatus && hrefStatus === "review" && !hasRootDashboardNavItem
    }

    if (item.href === PATIENT_DASHBOARD_HREF || exactDashboard) {
      return pathname === item.href || pathname === `${item.href}/`
    }

    return pathname === hrefPath || pathname?.startsWith(`${hrefPath}/`) || false
  }

  const isMoreActive = moreMenuItemsWithBadges.some((item) => isNavItemActive(item))

  return (
    <>
      {/* More drawer overlay */}
      {moreOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-xs"
            onClick={() => setMoreOpen(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-label="More navigation options"
            className="absolute bottom-0 left-0 right-0 bg-background rounded-t-2xl border-t border-border safe-area-pb"
          >
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
              {moreMenuItemsWithBadges.map((item) => {
                const Icon = item.icon
                const isActive = isNavItemActive(item)
                return (
                  <button
                    key={item.href}
                    onClick={() => {
                      setMoreOpen(false)
                      if (isActive) return
                      router.push(item.href)
                    }}
                    className={cn(
                      "flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-colors",
                      isActive
                        ? `${ACTIVE_MOBILE_NAV} font-medium`
                        : "text-muted-foreground hover:bg-muted/50"
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-sm">{item.label}</span>
                    {item.badge && item.badge > 0 ? (
                      <span className="ml-auto inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-semibold text-white dark:bg-red-600">
                        {item.badge > 99 ? "99+" : item.badge}
                      </span>
                    ) : null}
                  </button>
                )
              })}
              <button
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-colors text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <LogOut className="w-5 h-5" />
                <span className="text-sm">{isSigningOut ? "Signing out…" : "Sign out"}</span>
              </button>
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
        <div className="flex items-center justify-around px-2 py-2">
          {itemsWithBadges.map((item) => {
            const Icon = item.icon
            const isMore = item.href === "__more__"
            // Home (/patient) uses exact match - child routes like /patient/intakes are distinct
            const isActive = isMore
              ? isMoreActive || moreOpen
              : isNavItemActive(item, item.href === PATIENT_DASHBOARD_HREF)

            return (
              <button
                key={item.href}
                onClick={() => {
                  if (isMore) {
                    setMoreOpen(!moreOpen)
                  } else {
                    setMoreOpen(false)
                    if (isActive) return
                    router.push(item.href)
                  }
                }}
                aria-current={isActive && !isMore ? "page" : undefined}
                aria-expanded={isMore ? moreOpen : undefined}
                aria-label={`${item.label}${item.badge ? `, ${item.badge} notifications` : ''}`}
                className={cn(
                  "flex flex-col items-center gap-1 px-3 py-2 rounded-xl",
                  "min-w-[60px] relative",
                  "transition-[background-color,color] duration-200",
                  isActive
                    ? ACTIVE_MOBILE_NAV
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <div className="relative">
                  <Icon className="w-5 h-5" />
                  {item.badge && item.badge > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 dark:bg-red-600 text-white text-xs font-semibold rounded-full flex items-center justify-center">
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
