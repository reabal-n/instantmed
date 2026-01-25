'use client'

import { type ReactNode } from 'react'
import { ShortcutDiscoveryHint } from '@/components/doctor/keyboard-shortcuts-modal'

/**
 * DoctorShell - Client wrapper for doctor pages
 * 
 * Provides:
 * - Keyboard shortcuts discovery hint (shown once to new doctors)
 * 
 * Note: Session timeout warning removed - Clerk handles session refresh automatically
 */

interface DoctorShellProps {
  children: ReactNode
}

export function DoctorShell({ children }: DoctorShellProps) {
  return (
    <>
      {/* One-time hint about keyboard shortcuts */}
      <ShortcutDiscoveryHint />
      {children}
    </>
  )
}
