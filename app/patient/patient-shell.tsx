'use client'

import { type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useReducedMotion } from '@/components/ui/motion'
import { AuthenticatedShell } from '@/components/shell'
import { GlobalIntakeNotifications } from '@/components/patient/global-intake-notifications'
import { MobileNav } from '@/components/ui/mobile-nav'

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
      {/* Session timeout warning removed - Clerk handles session refresh automatically */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 pb-24 lg:pb-8">
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={pathname}
            initial={prefersReducedMotion ? {} : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={prefersReducedMotion ? {} : { opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>
      <MobileNav />
    </>
  )
}

export function PatientShell({ children, user }: PatientShellProps) {
  return (
    <AuthenticatedShell
      userName={user.name}
      userAvatar={user.avatar}
      userRole="patient"
    >
      <PatientShellContent patientId={user.id}>
        {children}
      </PatientShellContent>
    </AuthenticatedShell>
  )
}
