'use client'

import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { motion, type HTMLMotionProps } from 'framer-motion'
import { cn } from '@/lib/utils'
import { spring } from '@/lib/motion'

const iconBadgeVariants = cva(
  [
    'inline-flex items-center justify-center',
    'shrink-0',
    'transition-colors',
  ],
  {
    variants: {
      variant: {
        default: [
          'bg-primary/10 text-primary',
          'border border-primary/20',
        ],
        secondary: [
          'bg-secondary text-secondary-foreground',
          'border border-border',
        ],
        muted: [
          'bg-muted text-muted-foreground',
          'border border-border-subtle',
        ],
        ghost: [
          'bg-transparent text-muted-foreground',
          'hover:bg-muted hover:text-foreground',
        ],
        glass: [
          'bg-[var(--glass-bg)] text-foreground',
          'border border-[var(--glass-border)]',
          'backdrop-blur-sm',
        ],
        success: [
          'bg-success/10 text-success',
          'border border-success/20',
        ],
        warning: [
          'bg-warning/10 text-warning',
          'border border-warning/20',
        ],
        destructive: [
          'bg-destructive/10 text-destructive',
          'border border-destructive/20',
        ],
        gradient: [
          'bg-linear-to-br from-primary/20 to-accent/20',
          'text-primary',
          'border border-primary/10',
        ],
      },
      size: {
        xs: 'h-6 w-6 rounded-md [&>svg]:h-3 [&>svg]:w-3',
        sm: 'h-8 w-8 rounded-lg [&>svg]:h-4 [&>svg]:w-4',
        default: 'h-10 w-10 rounded-xl [&>svg]:h-5 [&>svg]:w-5',
        lg: 'h-12 w-12 rounded-xl [&>svg]:h-6 [&>svg]:w-6',
        xl: 'h-14 w-14 rounded-2xl [&>svg]:h-7 [&>svg]:w-7',
      },
      glow: {
        true: '',
        false: '',
      },
    },
    compoundVariants: [
      {
        variant: 'default',
        glow: true,
        className: 'shadow-[0_0_12px_var(--primary)/0.2]',
      },
      {
        variant: 'success',
        glow: true,
        className: 'shadow-[0_0_12px_var(--success)/0.2]',
      },
      {
        variant: 'warning',
        glow: true,
        className: 'shadow-[0_0_12px_var(--warning)/0.2]',
      },
      {
        variant: 'destructive',
        glow: true,
        className: 'shadow-[0_0_12px_var(--destructive)/0.2]',
      },
    ],
    defaultVariants: {
      variant: 'default',
      size: 'default',
      glow: false,
    },
  }
)

// =============================================================================
// STATIC ICON BADGE
// =============================================================================

export interface IconBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof iconBadgeVariants> {
  asChild?: boolean
}

const IconBadge = React.forwardRef<HTMLDivElement, IconBadgeProps>(
  ({ className, variant, size, glow, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'div'
    return (
      <Comp
        className={cn(iconBadgeVariants({ variant, size, glow, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
IconBadge.displayName = 'IconBadge'

// =============================================================================
// ANIMATED ICON BADGE
// =============================================================================

export interface IconBadgeMotionProps
  extends Omit<HTMLMotionProps<'div'>, 'onAnimationStart' | 'onDrag' | 'onDragEnd' | 'onDragStart'>,
    VariantProps<typeof iconBadgeVariants> {}

const IconBadgeMotion = React.forwardRef<HTMLDivElement, IconBadgeMotionProps>(
  ({ className, variant, size, glow, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        className={cn(iconBadgeVariants({ variant, size, glow, className }))}
        whileHover={{ scale: 1.05, transition: spring.snappy }}
        whileTap={{ scale: 0.95 }}
        {...props}
      />
    )
  }
)
IconBadgeMotion.displayName = 'IconBadgeMotion'

// =============================================================================
// EXPORTS
// =============================================================================

export { IconBadge, IconBadgeMotion, iconBadgeVariants }
