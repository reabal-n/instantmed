'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { AnimatePresence } from 'framer-motion'

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
      <AnimatePresence mode="wait">
        {activePanel && (
          <div key={activePanel.id}>
            {activePanel.component}
          </div>
        )}
      </AnimatePresence>
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
