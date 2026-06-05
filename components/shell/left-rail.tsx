'use client'

import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  CreditCard,
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
import type { MouseEvent } from 'react'
import { useState } from 'react'

import { BrandLogo } from '@/components/shared/brand-logo'
import { Button } from '@/components/ui/button'
import {
  PATIENT_DASHBOARD_HREF,
  PATIENT_DOCUMENTS_HREF,
  PATIENT_INTAKES_HREF,
  PATIENT_MESSAGES_HREF,
  PATIENT_PAYMENT_HISTORY_HREF,
  PATIENT_PRESCRIPTIONS_HREF,
  PATIENT_SETTINGS_HREF,
  REQUEST_HREF,
} from '@/lib/dashboard/routes'
import { useAuth } from '@/lib/supabase/auth-provider'
import { cn } from '@/lib/utils'

const ACTIVE_NAV_LINK = "bg-primary/5 text-blue-700 dark:bg-primary/20 dark:text-blue-200"

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
  isExpanded?: boolean
  onExpandedChange?: (expanded: boolean) => void
}

export function LeftRail({
  userName,
  userAvatar,
  userRole,
  isExpanded: controlledExpanded,
  onExpandedChange,
}: LeftRailProps) {
  const [uncontrolledExpanded, setUncontrolledExpanded] = useState(true)
  const isExpanded = controlledExpanded ?? uncontrolledExpanded
  const setIsExpanded = onExpandedChange ?? setUncontrolledExpanded
  const [isSigningOut, setIsSigningOut] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { signOut } = useAuth()

  const handleSignOut = async () => {
    if (isSigningOut) return
    setIsSigningOut(true)
    await signOut()
  }

  // LeftRail is only used by the patient layout.
  // Staff layouts (admin/doctor) use OperatorShell + DoctorShell instead
  // (the legacy DashboardSidebar was retired in Phase 1.2 of the dashboard
  // remaster on 2026-05-11).
  // Sentence case throughout — matches design system §16 voice.
  const navItems = [
    { icon: Home, label: 'Overview', href: PATIENT_DASHBOARD_HREF },
    { icon: FileText, label: 'Requests', href: PATIENT_INTAKES_HREF },
    { icon: ClipboardList, label: 'Prescriptions', href: PATIENT_PRESCRIPTIONS_HREF },
    { icon: FolderOpen, label: 'Documents', href: PATIENT_DOCUMENTS_HREF },
    { icon: MessageSquare, label: 'Messages', href: PATIENT_MESSAGES_HREF },
    { icon: CreditCard, label: 'Payments', href: PATIENT_PAYMENT_HISTORY_HREF },
    { icon: Settings, label: 'Settings', href: PATIENT_SETTINGS_HREF },
  ]

  const handleNewRequest = () => {
    router.push(REQUEST_HREF)
  }

  const patientOverviewActive = pathname === PATIENT_DASHBOARD_HREF || pathname === `${PATIENT_DASHBOARD_HREF}/`

  const handleCurrentRouteClick = (event: MouseEvent<HTMLAnchorElement>, isActive: boolean) => {
    if (!isActive) return
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
    event.preventDefault()
  }

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 hidden h-screen flex-col border-r border-border bg-background transition-colors duration-150 lg:flex",
        isExpanded ? "w-60" : "w-16",
      )}
    >
      {/* Header */}
      <div className="h-16 border-b border-border flex items-center justify-between px-4 shrink-0">
        {isExpanded ? (
          <BrandLogo
            size="sm"
            href={PATIENT_DASHBOARD_HREF}
            onClick={(event) => handleCurrentRouteClick(event, patientOverviewActive)}
          />
        ) : (
          <BrandLogo
            size="sm"
            iconOnly
            href={PATIENT_DASHBOARD_HREF}
            onClick={(event) => handleCurrentRouteClick(event, patientOverviewActive)}
          />
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
          const isActive = item.href === PATIENT_DASHBOARD_HREF
            ? patientOverviewActive
            : pathname === item.href || pathname?.startsWith(item.href + '/')

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={(event) => handleCurrentRouteClick(event, isActive)}
              className={cn(
                "flex items-center gap-3 px-3 py-3 rounded-lg mb-1.5 transition-colors",
                "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                isActive
                  ? `${ACTIVE_NAV_LINK} font-medium`
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
