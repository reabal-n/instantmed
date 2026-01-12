'use client'

import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { motion, type HTMLMotionProps } from 'framer-motion'
import { cn } from '@/lib/utils'
import { spring, hoverLiftGlow, hoverLiftGlowPurple, press } from '@/lib/motion'

/**
 * Soft Pop Glass Card Component
 * 
 * Premium glassmorphism with colored glow shadows and spring physics.
 * See SOFT_POP_GLASS_DESIGN_SYSTEM.md for full documentation.
 */

const glassCardVariants = cva(
  [
    // Base glass styles
    'relative overflow-hidden',
    // Consistent 1px border
    'border',
    // Transitions
    'transition-colors',
    'duration-150',
    'ease-out',
    // Focus styles
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
  ],
  {
    variants: {
      variant: {
        /** Subtle glass - lightest, for nested elements */
        subtle: [
          'bg-white/50 dark:bg-slate-900/40',
          'backdrop-blur-lg',
          'border-white/30 dark:border-white/8',
          'shadow-[0_8px_30px_rgba(0,0,0,0.04)]',
        ],
        /** Default glass - standard cards */
        default: [
          'bg-white/70 dark:bg-slate-900/60',
          'backdrop-blur-xl',
          'border-white/40 dark:border-white/10',
          'shadow-[0_8px_30px_rgba(0,0,0,0.06)]',
        ],
        /** Elevated glass - modals, popovers */
        elevated: [
          'bg-white/85 dark:bg-slate-900/80',
          'backdrop-blur-2xl',
          'border-white/50 dark:border-white/15',
          'shadow-[0_25px_60px_rgba(0,0,0,0.15)]',
        ],
        /** Solid glass - high contrast needs */
        solid: [
          'bg-white/95 dark:bg-slate-900/95',
          'backdrop-blur-xl',
          'border-white/60 dark:border-white/20',
          'shadow-[0_8px_30px_rgba(0,0,0,0.08)]',
        ],
      },
      size: {
        sm: 'p-4 rounded-xl',
        default: 'p-5 rounded-2xl',
        lg: 'p-6 rounded-2xl',
        xl: 'p-8 rounded-3xl',
      },
      hover: {
        none: '',
        /** Lift - simple opacity change */
        lift: [
          'hover:bg-white/90 dark:hover:bg-slate-900/85',
        ],
        /** Glow - simple border change */
        glow: [
          'hover:border-slate-300 dark:hover:border-slate-600',
        ],
        /** Scale - simple opacity */
        scale: [
          'hover:bg-white/90 dark:hover:bg-slate-900/85',
        ],
      },
      clickable: {
        true: 'cursor-pointer select-none active:scale-[0.98]',
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
    Omit<VariantProps<typeof glassCardVariants>, 'transition'> {
  /** Glow color on hover */
  glowColor?: 'blue' | 'purple'
}

const GlassCardMotion = React.forwardRef<HTMLDivElement, GlassCardMotionProps>(
  ({ className, variant, size, hover = 'lift', clickable, glowColor = 'blue', ...props }, ref) => {
    // Determine hover/tap animations based on hover prop
    const motionProps = React.useMemo(() => {
      switch (hover) {
        case 'lift':
          return glowColor === 'purple' ? hoverLiftGlowPurple : hoverLiftGlow
        case 'glow':
          return glowColor === 'purple' ? hoverLiftGlowPurple : hoverLiftGlow
        case 'scale':
          return {
            whileHover: { 
              y: -2, 
              boxShadow: glowColor === 'purple' 
                ? '0 20px 40px rgba(139, 92, 246, 0.15)' 
                : '0 20px 40px rgba(59, 130, 246, 0.12)',
              transition: spring.snappy 
            },
            whileTap: press.whileTap,
          }
        default:
          return {}
      }
    }, [hover, glowColor])

    return (
      <motion.div
        ref={ref}
        className={cn(glassCardVariants({ variant, size, hover: 'none', clickable, className }))}
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
