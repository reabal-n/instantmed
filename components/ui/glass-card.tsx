'use client'

import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { motion, type HTMLMotionProps } from 'framer-motion'
import { cn } from '@/lib/utils'
import { hoverLift, hoverLiftGlow, press, spring } from '@/lib/motion'

const glassCardVariants = cva(
  [
    // Base glass styles
    'relative overflow-hidden',
    'backdrop-blur-[var(--glass-blur)]',
    // Consistent 1px border
    'border',
    // Transitions use CSS variables for consistency
    'transition-[transform,box-shadow,border-color]',
    'duration-[var(--duration-normal)]',
    'ease-[var(--ease-default)]',
    // Focus styles
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
  ],
  {
    variants: {
      variant: {
        default: [
          'bg-[var(--glass-bg)]',
          'border-[var(--glass-border)]',
          'shadow-[var(--shadow-md-value)]',
        ],
        elevated: [
          'bg-[var(--glass-bg-elevated)]',
          'border-[var(--glass-border)]',
          'shadow-[var(--shadow-lg-value)]',
        ],
        subtle: [
          'bg-surface/50',
          'border-border-subtle',
          'shadow-[var(--shadow-sm-value)]',
        ],
        solid: [
          'bg-surface',
          'border-border',
          'shadow-[var(--shadow-md-value)]',
        ],
      },
      size: {
        // Consistent radii scale: sm=lg, default=xl, lg/xl=2xl
        sm: 'p-4 rounded-lg',
        default: 'p-5 rounded-xl',
        lg: 'p-6 rounded-xl',
        xl: 'p-8 rounded-2xl',
      },
      hover: {
        none: '',
        lift: '',
        glow: '',
        scale: '',
      },
      clickable: {
        true: 'cursor-pointer select-none',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      hover: 'none',
      clickable: false,
    },
  }
)

// =============================================================================
// STATIC GLASS CARD (no motion)
// =============================================================================

export interface GlassCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof glassCardVariants> {
  asChild?: boolean
}

const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, variant, size, hover, clickable, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'div'
    return (
      <Comp
        className={cn(glassCardVariants({ variant, size, hover, clickable, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
GlassCard.displayName = 'GlassCard'

// =============================================================================
// ANIMATED GLASS CARD (with motion)
// =============================================================================

export interface GlassCardMotionProps
  extends Omit<HTMLMotionProps<'div'>, 'onAnimationStart' | 'onDrag' | 'onDragEnd' | 'onDragStart'>,
    VariantProps<typeof glassCardVariants> {}

const GlassCardMotion = React.forwardRef<HTMLDivElement, GlassCardMotionProps>(
  ({ className, variant, size, hover = 'lift', clickable, ...props }, ref) => {
    // Determine hover/tap animations based on hover prop
    const motionProps = React.useMemo(() => {
      switch (hover) {
        case 'lift':
          return hoverLift
        case 'glow':
          return hoverLiftGlow
        case 'scale':
          return {
            whileHover: { scale: 1.02, transition: spring.snappy },
            whileTap: press.whileTap,
          }
        default:
          return {}
      }
    }, [hover])

    return (
      <motion.div
        ref={ref}
        className={cn(glassCardVariants({ variant, size, hover, clickable, className }))}
        {...motionProps}
        {...props}
      />
    )
  }
)
GlassCardMotion.displayName = 'GlassCardMotion'

// =============================================================================
// GLASS CARD HEADER / CONTENT / FOOTER
// =============================================================================

const GlassCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1.5', className)}
    {...props}
  />
))
GlassCardHeader.displayName = 'GlassCardHeader'

const GlassCardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn('text-lg font-semibold leading-none tracking-tight text-foreground', className)}
    {...props}
  />
))
GlassCardTitle.displayName = 'GlassCardTitle'

const GlassCardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
))
GlassCardDescription.displayName = 'GlassCardDescription'

const GlassCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('pt-4', className)} {...props} />
))
GlassCardContent.displayName = 'GlassCardContent'

const GlassCardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center pt-4', className)}
    {...props}
  />
))
GlassCardFooter.displayName = 'GlassCardFooter'

// =============================================================================
// EXPORTS
// =============================================================================

export {
  GlassCard,
  GlassCardMotion,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardDescription,
  GlassCardContent,
  GlassCardFooter,
  glassCardVariants,
}
