'use client'

import { usePathname } from 'next/navigation'
import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from 'react'

/**
 * Panel System - Core interaction model
 * 
 * Philosophy:
 * - Panels, not pages
 * - Only one primary panel active at a time
 * - Background remains visible but softened
 * - Never surprise-close panels
 * 
 * Panel types:
 * - session: Full content panels (consult flow, med cert flow)
 * - drawer: Side panels for details (request details, quick actions)
 * - sheet: Full-height side panels (settings, complex forms)
 */

export type PanelType = 'session' | 'drawer' | 'sheet'

export interface Panel {
  id: string
  type: PanelType
  component: ReactNode
  props?: Record<string, unknown>
  onClose?: () => void
}

interface PanelContextValue {
  activePanel: Panel | null
  openPanel: (panel: Panel) => void
  closePanel: () => void
  updatePanel: (updates: Partial<Panel>) => void
  isPanelOpen: boolean
}

const PanelContext = createContext<PanelContextValue | null>(null)

export function PanelProvider({ children }: { children: ReactNode }) {
  const [activePanel, setActivePanel] = useState<Panel | null>(null)
  const pathname = usePathname()

  // Close panel on route change so it doesn't persist across soft navigations.
  // Intentionally uses pathname (not the full URL) so query-only changes (pagination,
  // filters) don't close the panel — only actual page transitions do.
  useEffect(() => {
    if (activePanel) {
      activePanel.onClose?.()
      setActivePanel(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  // Minimal focus trap: while a panel is open, Tab key cycles within the panel's
  // focusable elements and focus is moved into the panel on open.
  // This prevents keyboard users from tabbing into dimmed background content
  // and prevents background keyboard shortcuts (e.g. queue 'a'/'d') from firing.
  useEffect(() => {
    if (!activePanel) return

    const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

    // Defer so the panel has time to animate in before we query its contents.
    const rafId = requestAnimationFrame(() => {
      const dialogEl = document.querySelector<HTMLElement>('[role="dialog"]')
      if (!dialogEl) return
      const getFocusables = () => Array.from(dialogEl.querySelectorAll<HTMLElement>(FOCUSABLE))
      getFocusables()[0]?.focus()
    })

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const dialogEl = document.querySelector<HTMLElement>('[role="dialog"]')
      if (!dialogEl) return
      const focusables = Array.from(dialogEl.querySelectorAll<HTMLElement>(FOCUSABLE))
      if (!focusables.length) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus() }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }

    document.addEventListener('keydown', handleKeyDown, true)
    return () => {
      cancelAnimationFrame(rafId)
      document.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [activePanel])

  const openPanel = useCallback((panel: Panel) => {
    // Only one panel at a time - close existing before opening new
    if (activePanel) {
      activePanel.onClose?.()
    }
    setActivePanel(panel)
  }, [activePanel])

  const closePanel = useCallback(() => {
    if (activePanel) {
      activePanel.onClose?.()
    }
    setActivePanel(null)
  }, [activePanel])

  const updatePanel = useCallback((updates: Partial<Panel>) => {
    if (activePanel) {
      setActivePanel({ ...activePanel, ...updates })
    }
  }, [activePanel])

  return (
    <PanelContext.Provider
      value={{
        activePanel,
        openPanel,
        closePanel,
        updatePanel,
        isPanelOpen: !!activePanel
      }}
    >
      {children}
      {activePanel && (
        <div key={activePanel.id}>
          {activePanel.component}
        </div>
      )}
    </PanelContext.Provider>
  )
}

export function usePanel() {
  const context = useContext(PanelContext)
  if (!context) {
    throw new Error('usePanel must be used within PanelProvider')
  }
  return context
}
