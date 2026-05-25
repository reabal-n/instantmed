'use client'

import { type ReactNode } from 'react'

import { IntakeNotificationListener } from '@/components/doctor/intake-notification-listener'
import { PanelProvider } from '@/components/panels/panel-provider'
import { DoctorMobileNav } from '@/components/ui/mobile-nav'
import { useAuth } from '@/lib/supabase/auth-provider'

/**
 * DoctorShell - Client wrapper for doctor pages
 *
 * Provides:
 * - Panel system (slide-over review panels from queue)
 * - Real-time notifications for new intakes
 *
 * Session timeout warning removed - Supabase Auth handles session refresh automatically.
 * Keyboard shortcuts discovery hint removed 2026-05-25 — shortcuts still work via
 * their own hooks (j/k for navigation, / for search). Linear-style: power users
 * discover via exploration, no in-app docs UI.
 */

interface DoctorShellProps {
  children: ReactNode
  isAdmin?: boolean
}

export function DoctorShell({ children, isAdmin = false }: DoctorShellProps) {
  const { user } = useAuth()

  return (
    <PanelProvider>
      {user && <IntakeNotificationListener />}
      {children}
      <DoctorMobileNav isAdmin={isAdmin} />
    </PanelProvider>
  )
}
