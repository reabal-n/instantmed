'use client'

import { type ReactNode } from 'react'

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
}

export function AuthenticatedShell({
  children,
  userName,
  userAvatar,
  userRole,
  className
}: AuthenticatedShellProps) {
  return (
    <PanelProvider>
      <div className="min-h-screen bg-background">
        {/* Left Rail - Always visible, dimmed when panel active */}
        <LeftRail
          userName={userName}
          userAvatar={userAvatar}
          userRole={userRole}
        />

        {/* Main Content Area - Offset by rail width */}
        <main
          className={cn(
            "ml-0 lg:ml-60 transition-all duration-300",
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
