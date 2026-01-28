'use client'

import { type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { floatingBarVariants } from '@/lib/motion/panel-variants'
import { cn } from '@/lib/utils'

/**
 * FloatingActionBar - Bottom action bar for bulk operations
 * 
 * Use for:
 * - Doctor bulk approve/reject
 * - Multi-select actions
 * - Persistent CTAs during flows
 * 
 * Philosophy:
 * - Floats above content at bottom
 * - Slides up when needed
 * - Clear, focused actions
 * - Shows count of selected items
 */

interface FloatingActionBarProps {
  isVisible: boolean
  children: ReactNode
  className?: string
}

export function FloatingActionBar({ 
  isVisible, 
  children, 
  className 
}: FloatingActionBarProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          variants={floatingBarVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className={cn(
            "fixed bottom-0 left-0 right-0 z-40",
            "bg-white border-t border-gray-200 shadow-2xl",
            "px-4 py-4",
            className
          )}
        >
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/**
 * FloatingActionBarContent - Pre-styled content wrapper
 */
export function FloatingActionBarContent({
  label,
  actions,
  onCancel
}: {
  label: string
  actions: ReactNode
  onCancel?: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="font-medium text-foreground">{label}</span>
      <div className="flex items-center gap-2">
        {actions}
        {onCancel && (
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted rounded-lg transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  )
}
