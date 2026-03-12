'use client'

import { type ReactNode, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { AuthenticatedShell } from '@/components/shell'
import { usePanel, SessionPanel } from '@/components/panels'
import { ServiceSelector } from '@/components/patient/service-selector'
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
function PatientShellContent({ children }: { children: ReactNode }) {
  const { openPanel, closePanel } = usePanel()
  const router = useRouter()
  const openPanelRef = useRef(openPanel)
  openPanelRef.current = openPanel

  // Listen for 'patient:new-request' custom events from the parent shell
  useEffect(() => {
    const handler = () => {
      openPanelRef.current({
        id: 'service-selector',
        type: 'session',
        component: (
          <SessionPanel maxWidth="md">
            <ServiceSelector
              onSelectService={(service) => {
                // Close panel first, then soft-navigate (no full page reload)
                closePanel()
                if (service === 'medical-certificate') {
                  router.push('/request?service=med-cert')
                } else if (service === 'prescription') {
                  router.push('/request?service=prescription')
                } else if (service === 'consultation') {
                  router.push('/request?service=consult')
                }
              }}
            />
          </SessionPanel>
        )
      })
    }

    window.addEventListener('patient:new-request', handler)
    return () => window.removeEventListener('patient:new-request', handler)
  }, [closePanel, router])

  return (
    <>
      {/* Session timeout warning removed - Clerk handles session refresh automatically */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 pb-24 lg:pb-8">
        {children}
      </div>
      <MobileNav />
    </>
  )
}

export function PatientShell({ children, user }: PatientShellProps) {
  const handleNewRequest = useCallback(() => {
    // Dispatch custom event that PatientShellContent will pick up
    // This bridges the gap: the left rail button is outside PanelProvider,
    // but the panel open call needs to happen inside PanelProvider
    window.dispatchEvent(new CustomEvent('patient:new-request'))
  }, [])

  return (
    <AuthenticatedShell
      userName={user.name}
      userAvatar={user.avatar}
      userRole="patient"
      onNewRequest={handleNewRequest}
    >
      <PatientShellContent>
        {children}
      </PatientShellContent>
    </AuthenticatedShell>
  )
}
