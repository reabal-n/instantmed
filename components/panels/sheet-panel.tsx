'use client'

import { type ReactNode, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { usePanel } from './panel-provider'
import { sheetVariants, backdropVariants } from '@/lib/motion/panel-variants'
import { cn } from '@/lib/utils'

/**
 * SheetPanel - Full-height side panel for complex forms
 * 
 * Use for:
 * - Settings pages
 * - Profile editing
 * - Complex multi-section forms
 * - Full document editors
 * 
 * Design principles:
 * - Full height, wider than drawer
 * - Dedicated for complex, multi-part content
 * - Similar animation to drawer but wider
 * - Can contain multiple sections/tabs
 */

interface SheetPanelProps {
  children: ReactNode
  onClose?: () => void
  side?: 'left' | 'right'
  width?: number | string
  title?: string
  description?: string
  className?: string
}

export function SheetPanel({ 
  children, 
  onClose, 
  side = 'right',
  width = 640,
  title,
  description,
  className
}: SheetPanelProps) {
  const { closePanel } = usePanel()

  const handleClose = () => {
    onClose?.()
    closePanel()
  }

  // Prevent body scroll when sheet is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const widthStyle = typeof width === 'number' ? `${width}px` : width

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <motion.div
        variants={backdropVariants}
        initial="hidden"
        animate="visible"
        exit="hidden"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <motion.div
        variants={sheetVariants(side)}
        initial="hidden"
        animate="visible"
        exit="exit"
        className={cn(
          'absolute top-0 h-full bg-background shadow-2xl flex flex-col',
          side === 'right' ? 'right-0' : 'left-0',
          className
        )}
        style={{ width: widthStyle, maxWidth: '100vw' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'sheet-title' : undefined}
        aria-describedby={description ? 'sheet-description' : undefined}
      >
        {/* Header - sticky with more prominence */}
        <div className="sticky top-0 z-10 bg-background border-b border-border px-8 py-6">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              {title && (
                <h2 id="sheet-title" className="text-xl font-semibold text-foreground mb-1">
                  {title}
                </h2>
              )}
              {description && (
                <p id="sheet-description" className="text-sm text-muted-foreground">
                  {description}
                </p>
              )}
            </div>
            <button
              onClick={handleClose}
              className="p-2 rounded-full hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ml-4"
              aria-label="Close sheet"
              type="button"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Content - scrollable with more padding */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {children}
        </div>
      </motion.div>
    </div>
  )
}
