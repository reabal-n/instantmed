'use client'

import { type ReactNode, useState, useEffect, useCallback } from 'react'
import { ShortcutDiscoveryHint } from '@/components/doctor/keyboard-shortcuts-modal'
import { IntakeNotificationListener } from '@/components/doctor/intake-notification-listener'
import { CommandPalette } from '@/components/doctor/command-palette'
import { DoctorMobileNav } from '@/components/ui/mobile-nav'
import { PanelProvider } from '@/components/panels/panel-provider'
import { useAuth } from '@clerk/nextjs'

/**
 * DoctorShell - Client wrapper for doctor pages
 *
 * Provides:
 * - Panel system (slide-over review panels from queue)
 * - Keyboard shortcuts discovery hint (shown once to new doctors)
 * - Real-time notifications for new intakes
 *
 * Note: Session timeout warning removed - Clerk handles session refresh automatically
 */

interface DoctorShellProps {
  children: ReactNode
}

export function DoctorShell({ children }: DoctorShellProps) {
  const { userId } = useAuth()
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)

  // ⌘K / Ctrl+K to open command palette
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault()
      setCommandPaletteOpen((prev) => !prev)
    }
  }, [])

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])

  return (
    <PanelProvider>
      <ShortcutDiscoveryHint />
      {userId && <IntakeNotificationListener />}
      {children}
      <DoctorMobileNav />
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />
    </PanelProvider>
  )
}
