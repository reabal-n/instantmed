'use client'

import { type ReactNode } from 'react'
import { SessionTimeoutWarning } from '@/components/shared/session-timeout-warning'
import { ShortcutDiscoveryHint } from '@/components/doctor/keyboard-shortcuts-modal'

/**
 * DoctorShell - Client wrapper for doctor pages
 * 
 * Provides:
 * - Session timeout warning (critical for clinical workflow)
 * - Keyboard shortcuts discovery hint (shown once to new doctors)
 */

interface DoctorShellProps {
  children: ReactNode
}

export function DoctorShell({ children }: DoctorShellProps) {
  return (
    <>
      {/* Session timeout warning - critical for doctors mid-review */}
      <SessionTimeoutWarning warningMinutes={5} />
      {/* One-time hint about keyboard shortcuts */}
      <ShortcutDiscoveryHint />
      {children}
    </>
  )
}
