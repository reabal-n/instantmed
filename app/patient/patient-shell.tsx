'use client'

import { type ReactNode } from 'react'
import { AuthenticatedShell } from '@/components/shell'
import { usePanel, SessionPanel } from '@/components/panels'
import { ServiceSelector } from '@/components/patient/service-selector'
import { MobileNav } from '@/components/ui/mobile-nav'
import { SessionTimeoutWarning } from '@/components/shared/session-timeout-warning'

/**
 * PatientShell - Wraps all patient pages with panel-based interface
 * 
 * Includes:
 * - AuthenticatedShell (desktop left rail)
 * - Mobile bottom navigation
 * - Responsive padding for mobile nav
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

export function PatientShell({ children, user }: PatientShellProps) {
  const { openPanel } = usePanel()

  const handleNewRequest = () => {
    // Open service selector in a SessionPanel
    openPanel({
      id: 'service-selector',
      type: 'session',
      component: (
        <SessionPanel maxWidth="md">
          <ServiceSelector
            onSelectService={(service) => {
              if (service === 'medical-certificate') {
                window.location.href = '/medical-certificate/request'
              } else if (service === 'prescription') {
                window.location.href = '/repeat-prescription/request'
              } else if (service === 'consultation') {
                window.location.href = '/consult/request'
              }
            }}
          />
        </SessionPanel>
      )
    })
  }

  return (
    <AuthenticatedShell
      userName={user.name}
      userAvatar={user.avatar}
      userRole="patient"
      onNewRequest={handleNewRequest}
    >
      {/* Session timeout warning - prevents data loss */}
      <SessionTimeoutWarning warningMinutes={5} />
      
      {/* Main content with mobile-optimized padding */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 pb-24 md:pb-8">
        {children}
      </div>
      
      {/* Mobile bottom navigation - only shows on mobile */}
      <MobileNav />
    </AuthenticatedShell>
  )
}
