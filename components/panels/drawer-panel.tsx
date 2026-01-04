'use client'

import { type ReactNode, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { usePanel } from './panel-provider'
import { drawerVariants, backdropVariants } from '@/lib/motion/panel-variants'
import { cn } from '@/lib/utils'

/**
 * DrawerPanel - Side panel for details and quick actions
 * 
 * Use for:
 * - Request details
 * - Quick actions (approve/reject)
 * - Document preview
 * - Brief forms
 * 
 * Design principles:
 * - Slides in from right (default) or left
 * - Background remains accessible visually
 * - Faster animation than SessionPanel
 * - Narrower width (suitable for details, not full content)
 */

interface DrawerPanelProps {
  children: ReactNode
  onClose?: () => void
  side?: 'left' | 'right'
  width?: number
  title?: string
  className?: string
}

export function DrawerPanel({ 
  children, 
  onClose, 
  side = 'right',
  width = 400,
  title,
  className
}: DrawerPanelProps) {
  const { closePanel } = usePanel()

  const handleClose = () => {
    onClose?.()
    closePanel()
  }

  // Prevent body scroll when drawer is open
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

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop - lighter than session panels */}
      <motion.div
        variants={backdropVariants}
        initial="hidden"
        animate="visible"
        exit="hidden"
        className="absolute inset-0 bg-slate-900/30 backdrop-blur-[2px]"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <motion.div
        variants={drawerVariants(side)}
        initial="hidden"
        animate="visible"
        exit="exit"
        className={cn(
          'absolute top-0 h-full bg-white shadow-2xl flex flex-col',
          side === 'right' ? 'right-0' : 'left-0',
          className
        )}
        style={{ width: `${width}px`, maxWidth: '100vw' }}
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Details panel'}
      >
        {/* Header - sticky */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          {title && (
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          )}
          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ml-auto"
            aria-label="Close drawer"
            type="button"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Content - scrollable */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </motion.div>
    </div>
  )
}
