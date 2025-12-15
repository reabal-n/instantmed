'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { cva, type VariantProps } from 'class-variance-authority'

// =============================================================================
// SPINNER VARIANTS
// =============================================================================

const spinnerVariants = cva(
  'animate-spin rounded-full border-2 border-current border-t-transparent',
  {
    variants: {
      size: {
        xs: 'w-3 h-3',
        sm: 'w-4 h-4',
        default: 'w-5 h-5',
        lg: 'w-6 h-6',
        xl: 'w-8 h-8',
      },
      variant: {
        default: 'text-foreground/30',
        primary: 'text-primary',
        muted: 'text-muted-foreground',
        white: 'text-white/30',
      },
    },
    defaultVariants: {
      size: 'default',
      variant: 'default',
    },
  }
)

// =============================================================================
// SPINNER COMPONENT
// =============================================================================

interface SpinnerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof spinnerVariants> {
  /** Screen reader label */
  label?: string
}

export function Spinner({
  size,
  variant,
  label = 'Loading',
  className,
  ...props
}: SpinnerProps) {
  return (
    <div
      role="status"
      aria-label={label}
      className={cn(spinnerVariants({ size, variant }), className)}
      {...props}
    >
      <span className="sr-only">{label}</span>
    </div>
  )
}

// =============================================================================
// BUTTON SPINNER - For use inside buttons
// =============================================================================

interface ButtonSpinnerProps {
  /** Show the spinner */
  loading?: boolean
  /** Children to show when not loading */
  children: React.ReactNode
  /** Loading text */
  loadingText?: string
  /** Spinner size */
  size?: 'xs' | 'sm' | 'default'
  className?: string
}

export function ButtonSpinner({
  loading,
  children,
  loadingText,
  size = 'sm',
  className,
}: ButtonSpinnerProps) {
  if (!loading) {
    return <>{children}</>
  }

  return (
    <span className={cn('flex items-center gap-2', className)}>
      <Spinner size={size} variant="white" />
      {loadingText && <span>{loadingText}</span>}
    </span>
  )
}

// =============================================================================
// DOTS SPINNER - Three bouncing dots
// =============================================================================

interface DotsSpinnerProps {
  size?: 'sm' | 'default' | 'lg'
  className?: string
}

const dotSizeMap = {
  sm: 'w-1 h-1',
  default: 'w-1.5 h-1.5',
  lg: 'w-2 h-2',
}

export function DotsSpinner({ size = 'default', className }: DotsSpinnerProps) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className={cn('rounded-full bg-current', dotSizeMap[size])}
          animate={{ 
            y: [0, -4, 0],
            opacity: [0.4, 1, 0.4],
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.15,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}

// =============================================================================
// PULSE SPINNER - Pulsing circle
// =============================================================================

interface PulseSpinnerProps {
  size?: 'sm' | 'default' | 'lg'
  className?: string
}

const pulseSizeMap = {
  sm: 'w-8 h-8',
  default: 'w-12 h-12',
  lg: 'w-16 h-16',
}

export function PulseSpinner({ size = 'default', className }: PulseSpinnerProps) {
  return (
    <div className={cn('relative', pulseSizeMap[size], className)}>
      <motion.div
        className="absolute inset-0 rounded-full bg-primary/20"
        animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
      />
      <motion.div
        className="absolute inset-2 rounded-full bg-primary/30"
        animate={{ scale: [1, 1.3, 1], opacity: [0.7, 0.2, 0.7] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut', delay: 0.2 }}
      />
      <div className="absolute inset-3 rounded-full bg-primary flex items-center justify-center">
        <Spinner size="sm" variant="white" />
      </div>
    </div>
  )
}

// =============================================================================
// LOADING OVERLAY - Full screen or container overlay
// =============================================================================

interface LoadingOverlayProps {
  /** Show the overlay */
  visible: boolean
  /** Loading message */
  message?: string
  /** Blur the background */
  blur?: boolean
  className?: string
}

export function LoadingOverlay({
  visible,
  message,
  blur = true,
  className,
}: LoadingOverlayProps) {
  if (!visible) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn(
        'absolute inset-0 z-50 flex flex-col items-center justify-center',
        'bg-background/60',
        blur && 'backdrop-blur-sm',
        className
      )}
    >
      <PulseSpinner />
      {message && (
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-4 text-sm font-medium text-muted-foreground"
        >
          {message}
        </motion.p>
      )}
    </motion.div>
  )
}
