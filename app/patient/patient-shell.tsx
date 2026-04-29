'use client'

import { AnimatePresence,motion } from 'framer-motion'
import { usePathname } from 'next/navigation'
import { type ReactNode } from 'react'

import { GlobalIntakeNotifications } from '@/components/patient/global-intake-notifications'
import { AuthenticatedShell } from '@/components/shell'
import { MobileNav } from '@/components/ui/mobile-nav'
import { useReducedMotion } from '@/components/ui/motion'
import { easing } from '@/lib/motion'

/**
 * PatientShell - Wraps all patient pages with panel-based interface
 *
 * Architecture note: usePanel() must be called INSIDE a PanelProvider.
 * AuthenticatedShell contains PanelProvider, so we split into two components:
 * - PatientShell: renders AuthenticatedShell (which includes PanelProvider)
 * - PatientShellContent: renders inside PanelProvider and can safely call usePanel()
 */

interface PatientShellProps {
  children: ReactNode
  user: {
    id: string
    name: string
    email: string
    avatar?: string
  }
  /** Unread notification count for the LeftRail bell badge. Fetched server-side in layout. */
  unreadNotifications?: number
}

/**
 * Inner component that renders inside PanelProvider (via AuthenticatedShell)
 * and can safely call usePanel().
 */
function PatientShellContent({ children, patientId }: { children: ReactNode; patientId: string }) {
  const pathname = usePathname()
  const prefersReducedMotion = useReducedMotion()

  return (
    <>
      <GlobalIntakeNotifications patientId={patientId} />
      {/* Session timeout warning removed - Supabase Auth handles session refresh automatically */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 pb-24 lg:pb-8">
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={pathname}
            initial={prefersReducedMotion ? {} : { opacity: 0, y: 8 }}
            animate={{
              opacity: 1,
              y: 0,
              transition: {
                duration: prefersReducedMotion ? 0 : 0.25,
                ease: easing.strongOut,
              },
            }}
            exit={
              prefersReducedMotion
                ? {}
                : {
                    opacity: 0,
                    y: -6,
                    // §12 asymmetric timing rule: exit ≤ half of enter.
                    transition: { duration: 0.12, ease: easing.out },
                  }
            }
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>
      <MobileNav />
    </>
  )
}

export function PatientShell({ children, user, unreadNotifications }: PatientShellProps) {
  return (
    <AuthenticatedShell
      userName={user.name}
      userAvatar={user.avatar}
      userRole="patient"
      unreadNotifications={unreadNotifications}
    >
      <PatientShellContent patientId={user.id}>
        {children}
      </PatientShellContent>
    </AuthenticatedShell>
  )
}
