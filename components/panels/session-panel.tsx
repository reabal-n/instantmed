'use client'

import { type ReactNode, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { usePanel } from './panel-provider'
import { sessionPanelVariants, backdropVariants } from '@/lib/motion/panel-variants'
import { cn } from '@/lib/utils'

/**
 * SessionPanel - Focused consultation room
 * 
 * Use for:
 * - Medical certificate flows
 * - Consultation requests
 * - Multi-step forms
 * - Any linear, finite task
 * 
 * Design principles:
 * - Feels suspended above background
 * - Background dimmed but visible
 * - Close only when task complete or deliberately dismissed
 * - Never surprise-close
 */

interface SessionPanelProps {
  children: ReactNode
  onClose?: () => void
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl'
  preventBackdropClose?: boolean
  showCloseButton?: boolean
  className?: string
}

export function SessionPanel({ 
  children, 
  onClose, 
  maxWidth = 'md',
  preventBackdropClose = false,
  showCloseButton = true,
  className
}: SessionPanelProps) {
  const { closePanel } = usePanel()

  const handleClose = () => {
    onClose?.()
    closePanel()
  }

  const handleBackdropClick = () => {
    if (!preventBackdropClose) {
      handleClose()
    }
  }

  // Prevent body scroll when panel is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !preventBackdropClose) {
        handleClose()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [preventBackdropClose]) // eslint-disable-line react-hooks/exhaustive-deps

  const maxWidthClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl'
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop - dimmed but not black */}
      <motion.div
        variants={backdropVariants}
        initial="hidden"
        animate="visible"
        exit="hidden"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* Panel - softly floating */}
      <motion.div
        variants={sessionPanelVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className={cn(
          'relative w-full bg-white rounded-2xl shadow-2xl overflow-hidden',
          maxWidthClasses[maxWidth],
          className
        )}
        role="dialog"
        aria-modal="true"
      >
        {/* Close button - always accessible */}
        {showCloseButton && (
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 z-10 p-2 rounded-full hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            aria-label="Close panel"
            type="button"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        )}

        {/* Content - scrollable if needed */}
        <div className="max-h-[85vh] overflow-y-auto">
          {children}
        </div>
      </motion.div>
    </div>
  )
}
