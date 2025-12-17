'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { stagger, spring } from '@/lib/motion'

// =============================================================================
// FORM SECTION - GlassCard wrapper for form groups
// =============================================================================

interface FormSectionProps {
  children: React.ReactNode
  /** Section icon */
  icon?: React.ReactNode
  /** Section title */
  title?: string
  /** Section description */
  description?: string
  /** Animate on mount */
  animate?: boolean
  /** Animation delay index (for staggering) */
  index?: number
  className?: string
}

export function FormSection({
  children,
  icon,
  title,
  description,
  animate = true,
  index = 0,
  className,
}: FormSectionProps) {
  const content = (
    <div
      className={cn(
        // Glass card styling
        'relative rounded-2xl p-5 md:p-6',
        'bg-[var(--glass-bg)]',
        'backdrop-blur-[var(--glass-blur)]',
        'border border-[var(--glass-border)]',
        'shadow-[var(--shadow-sm-value)]',
        className
      )}
    >
      {/* Header */}
      {(icon || title || description) && (
        <div className="flex items-start gap-3 mb-5">
          {icon && (
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              {icon}
            </div>
          )}
          <div className="flex-1 min-w-0">
            {title && (
              <h3 className="text-lg font-semibold text-foreground leading-tight">
                {title}
              </h3>
            )}
            {description && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {description}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="space-y-4">
        {children}
      </div>
    </div>
  )

  if (!animate) {
    return content
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        ...spring.smooth,
        delay: index * 0.1 
      }}
    >
      {content}
    </motion.div>
  )
}

// =============================================================================
// FORM GROUP - Wrapper for individual form fields
// =============================================================================

interface FormGroupProps {
  children: React.ReactNode
  /** Label text */
  label?: string
  /** Helper text below input */
  hint?: string
  /** Error message */
  error?: string
  /** Warning message */
  warning?: string
  /** Make field required */
  required?: boolean
  /** Field ID for accessibility */
  htmlFor?: string
  className?: string
}

export function FormGroup({
  children,
  label,
  hint,
  error,
  warning,
  required,
  htmlFor,
  className,
}: FormGroupProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="block text-sm font-medium text-foreground"
        >
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </label>
      )}
      
      {children}
      
      {/* Messages */}
      {(hint || error || warning) && (
        <div className="space-y-1">
          {hint && !error && (
            <p className="text-xs text-muted-foreground">{hint}</p>
          )}
          {warning && !error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1"
            >
              <span className="w-1 h-1 rounded-full bg-amber-500" />
              {warning}
            </motion.p>
          )}
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs text-destructive flex items-center gap-1"
            >
              <span className="w-1 h-1 rounded-full bg-destructive" />
              {error}
            </motion.p>
          )}
        </div>
      )}
    </div>
  )
}

// =============================================================================
// FORM ROW - Horizontal layout for form fields
// =============================================================================

interface FormRowProps {
  children: React.ReactNode
  /** Number of columns on desktop */
  columns?: 2 | 3 | 4
  className?: string
}

const columnMap = {
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-3',
  4: 'md:grid-cols-4',
}

export function FormRow({ children, columns = 2, className }: FormRowProps) {
  return (
    <div className={cn('grid gap-4', columnMap[columns], className)}>
      {children}
    </div>
  )
}

// =============================================================================
// FORM DIVIDER - Visual separator between sections
// =============================================================================

interface FormDividerProps {
  label?: string
  className?: string
}

export function FormDivider({ label, className }: FormDividerProps) {
  return (
    <div className={cn('relative py-4', className)}>
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-border/50" />
      </div>
      {label && (
        <div className="relative flex justify-center">
          <span className="px-3 text-xs font-medium text-muted-foreground bg-background">
            {label}
          </span>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// FORM ACTIONS - Button container for form actions
// =============================================================================

interface FormActionsProps {
  children: React.ReactNode
  /** Sticky positioning on mobile */
  sticky?: boolean
  className?: string
}

export function FormActions({
  children,
  sticky = true,
  className,
}: FormActionsProps) {
  return (
    <div
      className={cn(
        'flex flex-col-reverse sm:flex-row gap-3 pt-6',
        sticky && 'sticky bottom-4 md:relative md:bottom-0',
        className
      )}
    >
      {children}
    </div>
  )
}
