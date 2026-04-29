'use client'

import {
  Activity,
  Bell,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  ExternalLink,
  FileText,
  FolderOpen,
  Home,
  LogOut,
  MessageSquare,
  Plus,
  Settings,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'

import { BrandLogo } from '@/components/shared/brand-logo'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/supabase/auth-provider'
import { cn } from '@/lib/utils'

/**
 * LeftRail - Persistent navigation for authenticated areas
 *
 * Philosophy:
 * - Always visible (dimmed when panel active)
 * - Minimal, focused actions
 * - User context at top
 * - "New Request" is primary action for patients
 * - 64px collapsed, 240px expanded
 */

interface LeftRailProps {
  userName: string
  userAvatar?: string
  userRole: 'patient' | 'doctor'
  /**
   * Optional unread notification count. Renders a small dot on the bell
   * when > 0. Wiring is up to the caller; LeftRail just paints.
   */
  unreadNotifications?: number
}

export function LeftRail({ userName, userAvatar, userRole, unreadNotifications = 0 }: LeftRailProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { signOut } = useAuth()

  const handleSignOut = async () => {
    if (isSigningOut) return
    setIsSigningOut(true)
    await signOut()
  }

  // LeftRail is only used by the patient layout (AuthenticatedShell).
  // Doctor layout uses DashboardSidebar instead.
  // Sentence case throughout — matches design system §16 voice.
  const navItems = [
    { icon: Home, label: 'Overview', href: '/patient' },
    { icon: FileText, label: 'Requests', href: '/patient/intakes' },
    { icon: ClipboardList, label: 'Prescriptions', href: '/patient/prescriptions' },
    { icon: Activity, label: 'Health summary', href: '/patient/health-summary' },
    { icon: FolderOpen, label: 'Documents', href: '/patient/documents' },
    { icon: MessageSquare, label: 'Messages', href: '/patient/messages' },
    { icon: Settings, label: 'Settings', href: '/patient/settings' },
  ]

  const handleNewRequest = () => {
    router.push('/patient/new-request')
  }

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen bg-background border-r border-border transition-[transform,box-shadow] duration-300 z-40 hidden lg:flex flex-col",
        isExpanded ? "w-60" : "w-16",
      )}
    >
      {/* Header */}
      <div className="h-16 border-b border-border flex items-center justify-between px-4 shrink-0">
        {isExpanded ? (
          <BrandLogo size="sm" href="/patient" />
        ) : (
          <BrandLogo size="sm" iconOnly href="/patient" />
        )}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
          aria-label={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {isExpanded ? (
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
      </div>

      {/* User Info */}
      <div className="px-4 py-5 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            {userAvatar ? (
              <Image
                src={userAvatar}
                alt={userName}
                className="w-full h-full rounded-full object-cover"
                width={40}
                height={40}
              />
            ) : (
              <span className="text-sm font-medium text-primary">
                {userName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          {isExpanded && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-foreground">{userName}</p>
              <p className="text-xs text-muted-foreground capitalize">{userRole}</p>
            </div>
          )}
          <Link
            href="/patient/notifications"
            className="relative p-2 rounded-lg hover:bg-muted transition-colors shrink-0"
            title="Notifications"
            aria-label={
              unreadNotifications > 0
                ? `Notifications (${unreadNotifications} unread)`
                : "Notifications"
            }
          >
            <Bell className="w-4 h-4 text-muted-foreground" />
            {unreadNotifications > 0 && (
              <span
                aria-hidden="true"
                className="absolute right-1.5 top-1.5 inline-flex h-2 w-2 rounded-full bg-primary ring-2 ring-background"
              />
            )}
          </Link>
        </div>
      </div>

      {/* Primary action for patients: New request. Canonical CTA glow per §11. */}
      {userRole === 'patient' && (
        <div className="p-4 shrink-0">
          <Button
            className={cn(
              "w-full bg-primary text-white hover:bg-primary/90",
              "shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30",
              "active:scale-[0.98] transition-[transform,box-shadow,background-color] duration-200",
              !isExpanded && "aspect-square p-0",
            )}
            onClick={handleNewRequest}
          >
            {isExpanded ? (
              <>
                <Plus className="w-4 h-4 mr-2" />
                New request
              </>
            ) : (
              <Plus className="w-4 h-4" />
            )}
          </Button>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-2 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          // Overview (/patient) uses exact match only - child routes like /patient/intakes, /patient/onboarding are distinct
          const isActive = item.href === '/patient'
            ? pathname === '/patient' || pathname === '/patient/'
            : pathname === item.href || pathname?.startsWith(item.href + '/')

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-3 rounded-lg mb-1.5 transition-colors",
                "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                isActive
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-muted"
              )}
              title={!isExpanded ? item.label : undefined}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {isExpanded && <span className="text-sm">{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-5 border-t border-border shrink-0">
        <a
          href="https://instantmed.com.au"
          className={cn(
            "flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors",
            isExpanded ? "mb-3" : "justify-center mb-2",
          )}
          title="Back to InstantMed.com.au"
        >
          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
          {isExpanded && "Back to InstantMed.com.au"}
        </a>
        <button
          onClick={handleSignOut}
          disabled={isSigningOut}
          className={cn(
            "flex items-center gap-2 text-xs text-muted-foreground hover:text-destructive transition-colors w-full disabled:opacity-50 disabled:cursor-not-allowed",
            isExpanded ? "mb-3" : "justify-center mb-2",
          )}
          title="Sign out"
        >
          <LogOut className="w-3.5 h-3.5 shrink-0" />
          {isExpanded && (isSigningOut ? "Signing out…" : "Sign out")}
        </button>
        {isExpanded && (
          <p className="text-xs text-muted-foreground text-center">
            InstantMed &copy; {new Date().getFullYear()}
          </p>
        )}
      </div>
    </aside>
  )
}
