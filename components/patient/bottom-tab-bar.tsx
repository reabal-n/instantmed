"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  Home,
  FileText,
  MessageCircle,
  Bell,
  User,
  Plus,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface TabItem {
  href: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  badge?: number
}

const TABS: TabItem[] = [
  { href: "/patient", icon: Home, label: "Home" },
  { href: "/patient/intakes", icon: FileText, label: "Requests" },
  { href: "/patient/messages", icon: MessageCircle, label: "Messages" },
  { href: "/patient/notifications", icon: Bell, label: "Alerts" },
  { href: "/patient/settings", icon: User, label: "Profile" },
]

interface BottomTabBarProps {
  unreadMessages?: number
  unreadNotifications?: number
}

/**
 * Bottom Tab Bar
 * 
 * Native-like bottom navigation for patient mobile experience.
 * Features:
 * - Fixed bottom position with safe area insets
 * - Active state indicator with animation
 * - Badge support for unread counts
 * - Floating action button for quick request
 */
export function BottomTabBar({ unreadMessages = 0, unreadNotifications = 0 }: BottomTabBarProps) {
  const pathname = usePathname()

  // Don't show on non-patient pages or during intake flow
  if (!pathname.startsWith("/patient") || pathname.includes("/intakes/")) {
    return null
  }

  const getBadge = (href: string): number | undefined => {
    if (href === "/patient/messages" && unreadMessages > 0) return unreadMessages
    if (href === "/patient/notifications" && unreadNotifications > 0) return unreadNotifications
    return undefined
  }

  return (
    <>
      {/* Spacer to prevent content from being hidden behind tab bar */}
      <div className="h-20 md:hidden" />

      {/* Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
        {/* Glass background */}
        <div className="absolute inset-0 bg-background/80 backdrop-blur-xl border-t border-border/50" />

        {/* Content */}
        <div className="relative flex items-center justify-around px-2 pb-safe pt-2">
          {TABS.map((tab) => {
            const isActive = pathname === tab.href || 
              (tab.href !== "/patient" && pathname.startsWith(tab.href))
            const badge = getBadge(tab.href)
            const Icon = tab.icon

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "relative flex flex-col items-center justify-center w-16 py-1 transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                {/* Active indicator */}
                {isActive && (
                  <motion.div
                    layoutId="tab-indicator"
                    className="absolute -top-2 w-8 h-1 rounded-full bg-primary"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}

                {/* Icon with badge */}
                <div className="relative">
                  <Icon className={cn(
                    "h-6 w-6 transition-transform",
                    isActive && "scale-110"
                  )} />
                  {badge !== undefined && badge > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold text-white bg-red-500 rounded-full px-1">
                      {badge > 99 ? "99+" : badge}
                    </span>
                  )}
                </div>

                {/* Label */}
                <span className={cn(
                  "text-[10px] mt-1 font-medium",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}>
                  {tab.label}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Floating Action Button for new request */}
      <Link
        href="/request"
        className="fixed bottom-24 right-4 z-50 md:hidden"
      >
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center"
        >
          <Plus className="h-6 w-6" />
        </motion.div>
      </Link>
    </>
  )
}

/**
 * Compact Bottom Tab Bar
 * 
 * Minimal version with just icons, no labels.
 */
export function CompactBottomTabBar({ unreadMessages = 0, unreadNotifications = 0 }: BottomTabBarProps) {
  const pathname = usePathname()

  if (!pathname.startsWith("/patient")) return null

  const getBadge = (href: string): number | undefined => {
    if (href === "/patient/messages" && unreadMessages > 0) return unreadMessages
    if (href === "/patient/notifications" && unreadNotifications > 0) return unreadNotifications
    return undefined
  }

  return (
    <>
      <div className="h-16 md:hidden" />

      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background/90 backdrop-blur-xl border-t">
        <div className="flex items-center justify-around px-4 py-3 pb-safe">
          {TABS.map((tab) => {
            const isActive = pathname === tab.href
            const badge = getBadge(tab.href)
            const Icon = tab.icon

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "relative p-2 rounded-xl transition-colors",
                  isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-6 w-6" />
                {badge !== undefined && badge > 0 && (
                  <span className="absolute top-0 right-0 min-w-[16px] h-[16px] flex items-center justify-center text-[9px] font-bold text-white bg-red-500 rounded-full">
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
