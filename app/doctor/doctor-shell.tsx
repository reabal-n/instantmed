'use client'

import { type ReactNode } from 'react'
import { SessionTimeoutWarning } from '@/components/shared/session-timeout-warning'

/**
 * DoctorShell - Client wrapper for doctor pages
 * 
 * Provides:
 * - Session timeout warning (critical for clinical workflow)
 */

interface DoctorShellProps {
  children: ReactNode
}

export function DoctorShell({ children }: DoctorShellProps) {
  return (
    <>
      {/* Session timeout warning - critical for doctors mid-review */}
      <SessionTimeoutWarning warningMinutes={5} />
      {children}
    </>
  )
}
