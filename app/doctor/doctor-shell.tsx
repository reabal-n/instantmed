'use client'

import { type ReactNode, Suspense } from 'react'

import { PanelProvider } from '@/components/panels/panel-provider'
import { DoctorMobileNav } from '@/components/ui/mobile-nav'

/**
 * DoctorShell - Client wrapper for doctor pages
 *
 * Provides:
 * - Panel system (slide-over review panels from queue)
 *
 * Queue updates are owned by the dashboard queue. Telegram is the canonical
 * off-screen alert for newly paid requests.
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
  return (
    <PanelProvider>
      {children}
      <Suspense fallback={null}>
        <DoctorMobileNav isAdmin={isAdmin} />
      </Suspense>
    </PanelProvider>
  )
}
