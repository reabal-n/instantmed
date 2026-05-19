'use client'

import dynamic from 'next/dynamic'
import { type ReactNode, useState } from 'react'

import { PanelProvider } from '@/components/panels/panel-provider'
import { LeftRail } from '@/components/shell/left-rail'
import { MobileNav } from '@/components/ui/mobile-nav'
import { cn } from '@/lib/utils'

/**
 * PatientShell - patient-only portal frame.
 *
 * Architecture note: usePanel() must be called INSIDE a PanelProvider.
 * Keep this shell local to the patient portal so patient pages do not inherit
 * old operator/shell barrel exports or decorative motion runtime.
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

const GlobalIntakeNotifications = dynamic(
  () => import('@/components/patient/global-intake-notifications').then((mod) => mod.GlobalIntakeNotifications),
  { ssr: false },
)

function PatientShellContent({ children, patientId }: { children: ReactNode; patientId: string }) {
  return (
    <>
      <GlobalIntakeNotifications patientId={patientId} />
      {/* Session timeout warning removed - Supabase Auth handles session refresh automatically */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 pb-[calc(7rem+env(safe-area-inset-bottom))] lg:pb-8">
        {children}
      </div>
      <MobileNav />
    </>
  )
}

export function PatientShell({ children, user }: PatientShellProps) {
  const [isRailExpanded, setIsRailExpanded] = useState(true)

  return (
    <PanelProvider>
      <div className="min-h-screen bg-background">
        <LeftRail
          userName={user.name}
          userAvatar={user.avatar}
          userRole="patient"
          isExpanded={isRailExpanded}
          onExpandedChange={setIsRailExpanded}
        />
        <main
          className={cn(
            "ml-0 transition-[margin-left] duration-200 ease-out motion-reduce:transition-none",
            isRailExpanded ? "lg:ml-60" : "lg:ml-16",
          )}
        >
          <PatientShellContent patientId={user.id}>
            {children}
          </PatientShellContent>
        </main>
      </div>
    </PanelProvider>
  )
}
