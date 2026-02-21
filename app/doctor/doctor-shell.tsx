'use client'

import { type ReactNode } from 'react'
import { ShortcutDiscoveryHint } from '@/components/doctor/keyboard-shortcuts-modal'
import { IntakeNotificationListener } from '@/components/doctor/intake-notification-listener'
import { PanelProvider } from '@/components/panels/panel-provider'
import { useAuth } from '@clerk/nextjs'

/**
 * DoctorShell - Client wrapper for doctor pages
 *
 * Provides:
 * - Panel system (slide-over review panels from queue)
 * - Keyboard shortcuts discovery hint (shown once to new doctors)
 * - Real-time notifications for new intakes
 *
 * Note: Session timeout warning removed - Clerk handles session refresh automatically
 */

interface DoctorShellProps {
  children: ReactNode
}

export function DoctorShell({ children }: DoctorShellProps) {
  const { userId } = useAuth()

  return (
    <PanelProvider>
      {/* One-time hint about keyboard shortcuts */}
      <ShortcutDiscoveryHint />
      {/* Real-time intake notifications */}
      {userId && <IntakeNotificationListener doctorId={userId} />}
      {children}
    </PanelProvider>
  )
}
