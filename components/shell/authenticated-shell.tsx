'use client'

import { type ReactNode } from 'react'
import { useState } from 'react'

import { PanelProvider } from '@/components/panels'
import { cn } from '@/lib/utils'

import { LeftRail } from './left-rail'

/**
 * AuthenticatedShell - Main wrapper for authenticated areas
 *
 * Philosophy:
 * - Replaces marketing navbar after login
 * - Contains PanelProvider + LeftRail
 * - Content area adapts to rail state
 * - All authenticated routes use this shell
 *
 * Use in patient/doctor layouts, not in marketing pages
 */

interface AuthenticatedShellProps {
  children: ReactNode
  userName: string
  userAvatar?: string
  userRole: 'patient' | 'doctor'
  className?: string
  /** Unread notification count for the LeftRail bell badge. */
  unreadNotifications?: number
}

export function AuthenticatedShell({
  children,
  userName,
  userAvatar,
  userRole,
  className,
  unreadNotifications,
}: AuthenticatedShellProps) {
  const [isRailExpanded, setIsRailExpanded] = useState(true)

  return (
    <PanelProvider>
      <div className="min-h-screen bg-background">
        {/* Left Rail - Always visible, dimmed when panel active */}
        <LeftRail
          userName={userName}
          userAvatar={userAvatar}
          userRole={userRole}
          unreadNotifications={unreadNotifications}
          isExpanded={isRailExpanded}
          onExpandedChange={setIsRailExpanded}
        />

        {/* Main Content Area - Offset by rail width */}
        <main
          className={cn(
            "ml-0 transition-[margin-left,transform,box-shadow] duration-300",
            isRailExpanded ? "lg:ml-60" : "lg:ml-16",
            className
          )}
        >
          {children}
        </main>
      </div>
    </PanelProvider>
  )
}

/**
 * Simplified version without left rail (for onboarding, etc)
 */
export function AuthenticatedShellMinimal({
  children,
  className
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <PanelProvider>
      <div className={cn("min-h-screen bg-background", className)}>
        {children}
      </div>
    </PanelProvider>
  )
}
