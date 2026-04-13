'use client'

import { type ReactNode } from 'react'

import { IntakeNotificationListener } from '@/components/doctor/intake-notification-listener'
import { ShortcutDiscoveryHint } from '@/components/doctor/keyboard-shortcuts-modal'
import { PanelProvider } from '@/components/panels/panel-provider'
import { DoctorMobileNav } from '@/components/ui/mobile-nav'
import { useAuth } from '@/lib/supabase/auth-provider'

/**
 * DoctorShell - Client wrapper for doctor pages
 *
 * Provides:
 * - Panel system (slide-over review panels from queue)
 * - Keyboard shortcuts discovery hint (shown once to new doctors)
 * - Real-time notifications for new intakes
 *
 * Note: Session timeout warning removed - Supabase Auth handles session refresh automatically
 */

interface DoctorShellProps {
  children: ReactNode
}

export function DoctorShell({ children }: DoctorShellProps) {
  const { user } = useAuth()

  return (
    <PanelProvider>
      <ShortcutDiscoveryHint />
      {user && <IntakeNotificationListener />}
      {children}
      <DoctorMobileNav />
    </PanelProvider>
  )
}
